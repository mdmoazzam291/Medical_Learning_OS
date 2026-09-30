import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown>;

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
  ...configuredOrigins
]);

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
  return corsHeaders(req);
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

function exactFields(value: Json, required: string[]) {
  if (required.some((key) => !(key in value)) ||
      Object.keys(value).some((key) => !required.includes(key))) fail(400, "invalid_fields");
}

function identifier(value: unknown, code = "invalid_identifier") {
  if (typeof value !== "string" || !/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(value)) fail(400, code);
  return value;
}

function uuidValue(value: unknown, code: string) {
  if (typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    fail(400, code);
  }
  return value;
}

function sha256Value(value: unknown, code: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(400, code);
  return value;
}

async function jsonBody(req: Request, maxBytes = 8192) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > maxBytes) fail(413, "body_too_large");
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") || "")) fail(415, "json_required");
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) fail(413, "body_too_large");
  try { return object(JSON.parse(text || "{}")); }
  catch { fail(400, "invalid_json"); }
}

function routePath(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf("retention-probe-api");
  return "/" + (index >= 0 ? parts.slice(index + 1) : parts).join("/");
}

function mapRpcError(error: any): never {
  const message = String(error?.message || "");
  const detail = String(error?.details || "");
  const text = `${message} ${detail}`;
  const known400 = [
    "retention_probe_learner_required",
    "retention_probe_session_identity_required",
    "retention_probe_render_identity_required",
    "retention_probe_answer_identity_required",
    "retention_probe_origin_learner_required",
    "retention_probe_origin_session_identity_required",
    "invalid_retention_probe_session_request_key",
    "invalid_retention_probe_render_request_key",
    "invalid_retention_probe_answer_request_key",
    "invalid_retention_probe_question_sha256",
    "invalid_retention_probe_option",
    "retention_probe_render_question_mismatch"
  ];
  for (const code of known400) if (text.includes(code)) fail(400, code);
  const known404 = [
    "retention_probe_assignment_not_found",
    "retention_probe_served_event_not_found"
  ];
  for (const code of known404) if (text.includes(code)) fail(404, code);
  const known409 = [
    "retention_probe_delivery_not_ready",
    "retention_probe_delivery_replay_not_ready",
    "retention_probe_already_answered",
    "ordinary_study_session_takes_priority",
    "retention_probe_origin_not_ready",
    "retention_probe_origin_session_collision",
    "retention_probe_session_not_open",
    "retention_probe_browser_render_required",
    "retention_probe_served_question_changed",
    "retention_probe_medical_binding_changed",
    "retention_probe_session_state_invalid",
    "retention_probe_attempt_write_failed",
    "retention_probe_session_close_failed",
    "retention_probe_session_request_collision",
    "retention_probe_render_request_collision"
  ];
  for (const code of known409) if (text.includes(code)) fail(409, code);
  fail(500, "retention_probe_operation_failed");
}

Deno.serve(async (req: Request) => {
  try {
    const allowedCorsHeaders = enforceOrigin(req);
    if (req.method === "OPTIONS") return new Response("ok", { headers: allowedCorsHeaders });
    if (!supabaseUrl || !publishableKey || !secretKey) fail(500, "server_configuration_error");

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

    const url = new URL(req.url);
    const path = routePath(url);

    if (req.method === "GET" && path === "/inbox") {
      if (url.search) fail(400, "query_not_supported");
      const { data, error } = await admin.rpc("study_retention_probe_learner_inbox_v1", {
        p_learner: learnerId
      });
      if (error) mapRpcError(error);
      return response(req, 200, data);
    }

    if (req.method === "GET" && path === "/origin") {
      if (url.search) fail(400, "query_not_supported");
      const { data, error } = await admin.rpc("study_retention_probe_origin_readiness_v1", {
        p_learner: learnerId
      });
      if (error) mapRpcError(error);
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/origin/start") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, ["sessionId"]);
      const sessionId = uuidValue(input.sessionId, "invalid_session_id");
      const { data, error } = await admin.rpc("study_open_retention_probe_origin_session_v1", {
        p_learner: learnerId,
        p_session: sessionId
      });
      if (error) mapRpcError(error);
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/start") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, ["assignmentId", "requestId"]);
      const assignmentId = uuidValue(input.assignmentId, "invalid_assignment_id");
      const requestId = identifier(input.requestId, "invalid_request_id");

      const { data: inbox, error: inboxError } = await admin.rpc("study_retention_probe_learner_inbox_v1", {
        p_learner: learnerId
      });
      if (inboxError) mapRpcError(inboxError);

      if (inbox?.state === "in_progress") {
        if (String(inbox.assignmentId || "") !== assignmentId) fail(409, "different_retention_probe_in_progress");
        let sessionId = inbox.sessionId ? String(inbox.sessionId) : null;
        if (!sessionId) {
          const proposedSessionId = crypto.randomUUID();
          const { data: opened, error: openError } = await admin.rpc("study_open_retention_probe_session_v1", {
            p_learner: learnerId,
            p_served_event: inbox.servedEventId,
            p_session: proposedSessionId,
            p_request_key: `session:${inbox.servedEventId}`
          });
          if (openError) mapRpcError(openError);
          sessionId = String(opened?.sessionId || proposedSessionId);
        }
        return response(req, 200, { ...inbox, sessionId, resumedExisting: true });
      }

      if (inbox?.state !== "available" || String(inbox.assignmentId || "") !== assignmentId) {
        fail(409, inbox?.state === "blocked" ? "retention_probe_blocked" : "retention_probe_not_available");
      }

      const { data: served, error: serveError } = await admin.rpc("study_record_retention_probe_served_v1", {
        p_learner: learnerId,
        p_assignment: assignmentId,
        p_request_key: requestId
      });
      if (serveError) mapRpcError(serveError);

      const proposedSessionId = crypto.randomUUID();
      const { data: opened, error: openError } = await admin.rpc("study_open_retention_probe_session_v1", {
        p_learner: learnerId,
        p_served_event: served.servedEventId,
        p_session: proposedSessionId,
        p_request_key: `session:${served.servedEventId}`
      });
      if (openError) mapRpcError(openError);

      return response(req, 200, {
        contractId: "retention-probe-learner-start-v1",
        state: "in_progress",
        assignmentId: served.assignmentId,
        servedEventId: served.servedEventId,
        sessionId: opened?.sessionId || proposedSessionId,
        learnerQuestion: served.learnerQuestion,
        learnerQuestionSha256: served.learnerQuestionSha256,
        servedAt: served.servedAt,
        browserRenderedConfirmed: false,
        learnerViewedConfirmed: false,
        resumedExisting: false,
        automaticExecutionEnabled: false,
        studyNowAuthority: false,
        masteryInferenceAuthority: false
      });
    }

    if (req.method === "POST" && path === "/render") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, ["servedEventId", "learnerQuestionSha256"]);
      const servedEventId = uuidValue(input.servedEventId, "invalid_served_event_id");
      const learnerQuestionSha256 = sha256Value(input.learnerQuestionSha256, "invalid_question_sha256");
      const { data, error } = await admin.rpc("study_record_retention_probe_rendered_v1", {
        p_learner: learnerId,
        p_served_event: servedEventId,
        p_request_key: `render:${servedEventId}`,
        p_learner_question_sha256: learnerQuestionSha256
      });
      if (error) mapRpcError(error);
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/answer") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, ["servedEventId", "requestId", "optionId"]);
      const servedEventId = uuidValue(input.servedEventId, "invalid_served_event_id");
      const requestId = identifier(input.requestId, "invalid_request_id");
      const optionId = identifier(input.optionId, "invalid_option_id");
      const { data, error } = await admin.rpc("study_answer_retention_probe_v1", {
        p_learner: learnerId,
        p_served_event: servedEventId,
        p_request_key: requestId,
        p_option: optionId
      });
      if (error) mapRpcError(error);
      return response(req, 200, data);
    }

    fail(404, "route_not_found");
  } catch (error) {
    if (error instanceof ApiError) return response(req, error.status, { error: error.code });
    console.error("retention-probe-api internal error", error instanceof Error ? error.message : String(error));
    return response(req, 500, { error: "internal_error" });
  }
});
