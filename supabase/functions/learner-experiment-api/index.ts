import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRuntimeAccess } from "./_shared/runtime-access.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const configuredOrigins = (Deno.env.get("MLOS_ALLOWED_ORIGINS") ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean);
const allowedOrigins = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://medical-learning-os-preview.onrender.com",
  "https://medical-learning-os-web.medicalos.workers.dev",
  ...configuredOrigins
]);
const confidenceValues = new Set(["guess", "unsure", "fairly_sure", "certain"]);

type Json = Record<string, unknown>;

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const fail = (status: number, code: string): never => { throw new ApiError(status, code); };

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  return {
    ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function enforceOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) fail(403, "origin_not_allowed");
}

function response(req: Request, status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(400, "invalid_json");
  return value as Json;
}

async function jsonBody(req: Request, maxBytes = 4096) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > maxBytes) fail(413, "body_too_large");
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") || "")) fail(415, "json_required");
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) fail(413, "body_too_large");
  try { return object(JSON.parse(text || "{}")); }
  catch { fail(400, "invalid_json"); }
}

function uuidValue(value: unknown, code: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    fail(400, code);
  }
  return value;
}

function routePath(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf("learner-experiment-api");
  return "/" + (index >= 0 ? parts.slice(index + 1) : parts).join("/");
}

Deno.serve(async (req: Request) => {
  try {
    enforceOrigin(req);
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (!supabaseUrl || !publishableKey || !secretKey) fail(500, "server_configuration_error");
    if (!["GET", "POST"].includes(req.method)) fail(405, "method_not_allowed");

    const authorization = req.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) fail(401, "unauthorized");
    const token = authorization.slice(7);
    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user?.id) fail(401, "unauthorized");
    const learnerId = authData.user.id;

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const runtimeAccess = await checkRuntimeAccess(admin, token, learnerId);
    if (runtimeAccess?.reason === "account_suspended") fail(403, "account_suspended");
    if (runtimeAccess?.allowed !== true) fail(401, String(runtimeAccess?.reason || "runtime_access_denied"));

    const url = new URL(req.url);
    const path = routePath(url);

    if (req.method === "GET" && path === "/status") {
      if (url.search) fail(400, "query_not_supported");
      const { data, error } = await admin.rpc("learner_feature_allowed_v1", {
        p_user: learnerId,
        p_feature: "answer_confidence_capture"
      });
      if (error) fail(500, "feature_entitlement_unavailable");
      return response(req, 200, {
        contractId: "answer-confidence-feature-status-v1",
        featureKey: "answer_confidence_capture",
        enabled: data === true,
        authority: "server_entitlement"
      });
    }

    if (req.method === "GET" && path === "/export") {
      if (url.search) fail(400, "query_not_supported");
      const { data, error } = await admin.from("study_answer_confidence_events")
        .select("id,attempt_id,question_version_id,confidence,scale_id,prompt_id,recorded_at")
        .eq("learner_id", learnerId)
        .order("recorded_at", { ascending: true })
        .order("id", { ascending: true });
      if (error) fail(500, "answer_confidence_export_failed");
      return response(req, 200, {
        contractId: "answer-confidence-export-v1",
        answerConfidence: (data ?? []).map((row: any) => ({
          schemaVersion: 1,
          type: "confidence.recorded",
          id: row.id,
          attemptId: row.attempt_id,
          questionVersionId: row.question_version_id,
          confidence: row.confidence,
          scaleId: row.scale_id,
          promptId: row.prompt_id,
          recordedAt: row.recorded_at,
          inferenceAuthority: false,
          scoringAuthority: false,
          recommendationAuthority: false
        }))
      });
    }

    if (req.method === "POST" && path === "/confidence") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      if (Object.keys(input).some(key => !["sessionId", "confidence"].includes(key)) ||
          !("sessionId" in input) || !("confidence" in input)) fail(400, "invalid_fields");
      const sessionId = uuidValue(input.sessionId, "invalid_session_id");
      const confidence = String(input.confidence || "");
      if (!confidenceValues.has(confidence)) fail(400, "answer_confidence_invalid");

      const { data: allowed, error: featureError } = await admin.rpc("learner_feature_allowed_v1", {
        p_user: learnerId,
        p_feature: "answer_confidence_capture"
      });
      if (featureError) fail(500, "feature_entitlement_unavailable");
      if (allowed !== true) fail(403, "feature_not_enabled");

      const { data, error } = await admin.rpc("study_record_answer_confidence_v1", {
        p_learner: learnerId,
        p_session: sessionId,
        p_confidence: confidence
      });
      if (error) fail(500, "answer_confidence_write_failed");
      if (data?.error === "session_not_found") fail(404, data.error);
      if (data?.error === "accepted_attempt_not_found") fail(409, data.error);
      if (data?.error === "conflicting_answer_confidence") fail(409, data.error);
      if (data?.error) fail(500, "answer_confidence_write_failed");
      return response(req, 200, data);
    }

    fail(404, "not_found");
  } catch (error) {
    if (error instanceof ApiError) return response(req, error.status, { error: error.code });
    console.error(JSON.stringify({ event: "learner_experiment_api_error", code: "unexpected_failure" }));
    return response(req, 500, { error: "internal_error" });
  }
});
