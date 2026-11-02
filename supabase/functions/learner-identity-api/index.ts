import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { allocateLearnerCode, normalizeLearnerCode } from "../../../ops/prototypes/learner-identity/learner-code.js";
import { checkRuntimeAccess } from "../learner-experiment-api/_shared/runtime-access.ts";

// Not deployed by the draft PR. Canonical identity is still the Auth user UUID.
// This endpoint cannot locate, list or mutate another learner's identity.
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const configuredOrigins = (Deno.env.get("MLOS_ALLOWED_ORIGINS") ?? "")
  .split(",").map((x: string) => x.trim()).filter(Boolean);
const allowedOrigins = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://medical-learning-os-preview.onrender.com",
  "https://medical-learning-os-web.medicalos.workers.dev",
  ...configuredOrigins
]);

class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
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
function result(req: Request, status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status, headers: {
      ...cors(req), "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff"
    }
  });
}
function routePath(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf("learner-identity-api");
  return "/" + (index >= 0 ? parts.slice(index + 1) : parts).join("/");
}

// The hosted runtime may represent an HTTP Content-Length:0 POST as a stream.
// Accept only end-of-stream, never buffer text/JSON, and bound the first read.
async function rejectRequestPayload(req: Request) {
  if (req.headers.has("content-type")) fail(400, "body_not_supported");
  if (req.body !== null) {
    const reader = req.body.getReader();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const first = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          deadline = setTimeout(() => reject(new ApiError(400, "body_not_supported")), 2000);
        })
      ]);
      if (!first.done || first.value?.byteLength) fail(400, "body_not_supported");
    } finally {
      clearTimeout(deadline);
      void reader.cancel().catch(() => {});
      try { reader.releaseLock(); } catch { /* pending read is cancelled above */ }
    }
  }
}

async function requireRuntimeAccess(admin: any, token: string, authUserId: string) {
    const runtime = await checkRuntimeAccess(admin, token, authUserId);
    if (runtime?.reason === "account_suspended") fail(403, "account_suspended");
    // A missing/failed session-validation RPC is a backend dependency outage,
    // not evidence that the signed-in user lacked permission. Fail closed as
    // unavailable and do not query or allocate a learner code.
    if (runtime?.reason === "runtime_access_unavailable")
      fail(503, "identity_session_check_unavailable");
    if (runtime?.allowed !== true) fail(403, "runtime_access_denied");

}

Deno.serve(async (req: Request) => {
  try {
    const origin = req.headers.get("origin");
    if (origin && !allowedOrigins.has(origin)) fail(403, "origin_not_allowed");
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
    if (!supabaseUrl || !publishableKey || !secretKey) fail(503, "identity_service_unavailable");
    const url = new URL(req.url);
    const path = routePath(url);
    if (url.search) fail(400, "query_not_supported");
    if (!((req.method === "GET" && path === "/me") ||
      (req.method === "POST" && path === "/ensure"))) fail(404, "not_found");
    // No payload is accepted; a proven empty hosted body stream is valid.
    if (req.method === "POST") await rejectRequestPayload(req);

    const authorization = req.headers.get("authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) fail(401, "unauthorized");
    const token = authorization.slice(7);
    if (!token || token.length > 10000) fail(401, "unauthorized");
    // getUser validates the actual Supabase Auth identity; a request-supplied
    // UUID, e-mail, learner code or user_metadata never selects the target.
    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user?.id) fail(401, "unauthorized");
    const authUserId = authData.user.id;

    // Never send the service role key to the client. The privileged data API
    // is used only after successful Auth verification and runtime access.
    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    await requireRuntimeAccess(admin, token, authUserId);

    const table = admin.from("learner_reference_codes");
    const storage = {
      async readByAuthUserId(id: string) {
        const { data, error } = await table.select("auth_user_id,learner_code")
          .eq("auth_user_id", id).maybeSingle();
        if (error) fail(503, "learner_code_read_unavailable");
        return data ? { authUserId: data.auth_user_id, learnerCode: data.learner_code } : null;
      },
      async tryInsert({authUserId: id, learnerCode}: {authUserId: string;learnerCode: string}) {
        const { error } = await table.insert({ auth_user_id: id, learner_code: learnerCode });
        if (!error) return { status: "inserted" };
        // The proposed schema has only UUID-PK and code UNIQUE constraints.
        // On a 23505 collision, read this *same user's* stored code: if one
        // exists it is a concurrent idempotent request. Otherwise retry a
        // distinct generated code. Do not swallow authorization/network errors.
        if (error.code === "23505") {
          const prior = await this.readByAuthUserId(id);
          return { status: prior ? "existing" : "code_collision" };
        }
        fail(503, "learner_code_write_unavailable");
      }
    };

    if (req.method === "GET") {
      const entry = await storage.readByAuthUserId(authUserId);
      // Never invent or rotate a code when this read fails or is missing.
      if (entry && (entry.authUserId !== authUserId ||
          normalizeLearnerCode(entry.learnerCode) !== entry.learnerCode)) {
        fail(503, "learner_code_readback_invalid");
      }
      // A session may be revoked while storage readback was in flight.
      await requireRuntimeAccess(admin, token, authUserId);
      return result(req, 200, {
        contractId: "learner-identity-self-v1",
        learnerCode: entry?.learnerCode ?? null,
        status: entry ? "assigned" : "not_assigned"
      });
    }

    let assigned;
    try {
      assigned = await allocateLearnerCode({ authUserId, storage });
    } catch {
      fail(503, "learner_code_allocation_unavailable");
    }
    // Keep a committed mapping, but withhold delivery after current denial.
    await requireRuntimeAccess(admin, token, authUserId);
    return result(req, 200, {
      contractId: "learner-identity-self-v1",
      learnerCode: assigned.learnerCode,
      status: "assigned"
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 503;
    const code = error instanceof ApiError ? error.code : "learner_identity_unavailable";
    return result(req, status, { error: code });
  }
});
