// Admin-only learner preview of owner-accepted NMC objectives.
// Reads commit-pinned, checksum-verified preview data; never writes; never visible to learners.
import { createClient } from "npm:@supabase/supabase-js@2";
import { validatePreviewData, parsePreviewFilters, previewPage } from "../../../src/domain/nmc-admin-learner-preview.js";
import { validateBatch, batchSummary, parseAcceptRequest, batchAcceptInput } from "../../../src/domain/nmc-concept-batch.js";

const DATA_URL = "https://raw.githubusercontent.com/mdmoazzam291/Medical_Learning_OS/373e1f089f9a75f0cd0bbf2cd4bf7c4b39e34e4b/data/nmc-admin-learner-preview.json";
const DATA_SHA256 = "f23158c802cc4a8713caa64b873494d1abb51a01177c1b3eb4b352c13ccad47b";

const BATCH_URL = "https://raw.githubusercontent.com/mdmoazzam291/Medical_Learning_OS/9e013b760c07ac11cd7d8cfd1a6b8b4f39c979eb/docs/evidence/2026-11-17-nmc-source-exceptions-concept-batch-v1.json";
const BATCH_SHA256 = "f6fdf245e51d5e05a7ef9f241b1b53c611ea61bcca8a62a3f1133967356c51d8";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const configuredOrigins = (Deno.env.get("MLOS_ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
const allowedOrigins = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://medical-learning-os-preview.onrender.com",
  "https://medical-learning-os-web.medicalos.workers.dev",
  ...configuredOrigins
]);

class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }
const fail = (status: number, code: string): never => { throw new ApiError(status, code); };

function cors(req: Request) {
  const origin = req.headers.get("origin");
  return {
    ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function respond(req: Request, status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

async function runtimeAccess(admin: any, token: string, userId: string) {
  try {
    const part = String(token).split(".")[1] || "";
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
    const sessionId = typeof payload?.session_id === "string" ? payload.session_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) return { allowed: false, reason: "session_claim_missing" };
    const { data, error } = await admin.rpc("learner_runtime_access_v1", { p_user: userId, p_session: sessionId });
    if (error || !data || typeof data !== "object") return { allowed: false, reason: "runtime_access_unavailable" };
    return data as any;
  } catch { return { allowed: false, reason: "session_claim_invalid" }; }
}

const cache = new Map<string, any>();
async function pinnedJson(url: string, sha: string, validate: (x: any) => any) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url, { headers: { "User-Agent": "medical-learning-os-nmc-admin-preview" } });
  if (!res.ok) fail(503, "pinned_data_unavailable");
  const bytes = new Uint8Array(await res.arrayBuffer());
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (digest !== sha) fail(503, "pinned_data_checksum_mismatch");
  let value;
  try { value = validate(JSON.parse(new TextDecoder().decode(bytes))); } catch { fail(503, "pinned_data_invalid"); }
  cache.set(url, value);
  return value;
}
const previewData = () => pinnedJson(DATA_URL, DATA_SHA256, validatePreviewData);
const batchData = () => pinnedJson(BATCH_URL, BATCH_SHA256, validateBatch);
function routePath(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("nmc-admin-preview");
  return "/" + (i >= 0 ? parts.slice(i + 1) : []).join("/");
}
async function jsonBody(req: Request) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") || "")) fail(415, "json_required");
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > 8192) fail(413, "body_too_large");
  try { return JSON.parse(text); } catch { fail(400, "invalid_json"); }
}

Deno.serve(async (req: Request) => {
  try {
    const origin = req.headers.get("origin");
    if (origin && !allowedOrigins.has(origin)) fail(403, "origin_not_allowed");
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
    if (req.method !== "GET" && req.method !== "POST") fail(405, "method_not_allowed");
    if (!supabaseUrl || !publishableKey || !secretKey) fail(500, "server_configuration_error");
    const authorization = req.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) fail(401, "unauthorized");
    const token = authorization.slice(7);
    const userClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user?.id) fail(401, "unauthorized");
    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const access = await runtimeAccess(admin, token, authData.user!.id);
    if (access?.reason === "account_suspended") fail(403, "account_suspended");
    if (access?.allowed !== true) fail(401, String(access?.reason || "runtime_access_denied"));
    const role = await admin.rpc("content_admin_status_v1", { p_user: authData.user!.id });
    if (role.error) fail(500, "owner_authz_unavailable");
    if ((role.data as any)?.isAdmin !== true) fail(403, "content_admin_required");
    const url = new URL(req.url);
    const path = routePath(url);
    if (path === "/batch" && req.method === "GET") {
      const batch = await batchData();
      const { data: done, error } = await admin.from("content_concept_batch_acceptances").select("batch_id,accepted_at,item_count").eq("batch_id", batch.batchId).maybeSingle();
      if (error) fail(503, "batch_state_unavailable");
      return respond(req, 200, batchSummary(batch, done));
    }
    if (path === "/batch-accept" && req.method === "POST") {
      const batch = await batchData();
      let decision;
      try { decision = parseAcceptRequest(await jsonBody(req), batch.batchId); } catch (e) { if (e instanceof ApiError) throw e; fail(400, "batch_accept_invalid"); }
      const { data, error } = await admin.rpc("concept_batch_accept_v1", { p_actor: authData.user!.id, p_input: batchAcceptInput(batch, BATCH_SHA256, decision!) });
      if (error) {
        const code = String(error.message || "").match(/concept_[a-z_]+/)?.[0] || "batch_accept_failed";
        fail(code === "content_admin_required" ? 403 : 409, code);
      }
      return respond(req, 200, data);
    }
    if (path !== "/" || req.method !== "GET") fail(404, "not_found");
    let filters;
    try {
      if ([...url.searchParams.keys()].some((k) => url.searchParams.getAll(k).length !== 1)) throw new Error();
      filters = parsePreviewFilters(Object.fromEntries(url.searchParams));
    } catch { fail(400, "preview_filter_invalid"); }
    const data = await previewData();
    try { return respond(req, 200, previewPage(data, filters)); } catch { fail(400, "preview_filter_invalid"); }
  } catch (error) {
    const e = error instanceof ApiError ? error : new ApiError(500, "internal_error");
    return respond(req, e.status, { error: e.code });
  }
});
