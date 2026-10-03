import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
const edgeHealthUrl = Deno.env.get("MLOS_CLOUDFLARE_EDGE_HEALTH_URL") ??
  "https://medical-learning-os-web.medicalos.workers.dev/__edge-health";
const githubRepo = "mdmoazzam291/Medical_Learning_OS";

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

function enforceOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) fail(403, "origin_not_allowed");
}

function routePath(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf("owner-api");
  return "/" + (index >= 0 ? parts.slice(index + 1) : parts).join("/");
}

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(400, "invalid_json");
  return value as Record<string, unknown>;
}

async function jsonBody(req: Request, maxBytes = 16384) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > maxBytes) fail(413, "body_too_large");
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") || "")) fail(415, "json_required");
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) fail(413, "body_too_large");
  try { return object(JSON.parse(text || "{}")); }
  catch { fail(400, "invalid_json"); }
}

function uuidValue(value: unknown, code = "invalid_uuid") {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) fail(400, code);
  return value;
}

function reasonValue(value: unknown) {
  if (typeof value !== "string" || value.trim().length < 10 || value.trim().length > 1000) fail(400, "owner_action_reason_invalid");
  return value.trim();
}

async function externalJson(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetch(url, {
      headers: { "User-Agent": "medical-learning-os-owner-api" },
      signal: controller.signal
    });
    let payload: any = null;
    try { payload = await result.json(); } catch {}
    if (!result.ok) throw new Error(`http_${result.status}`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function cloudflareHealth() {
  try {
    const started = Date.now();
    const payload = await externalJson(edgeHealthUrl, 4500);
    return {
      status: payload?.ok === true ? "healthy" : "degraded",
      observedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      service: String(payload?.service || "medical-learning-os-edge"),
      origin: String(payload?.origin || "")
    };
  } catch (error) {
    return { status: "unavailable", observedAt: new Date().toISOString(), error: String((error as Error)?.message || "probe_failed") };
  }
}

async function workflowHealth(file: string) {
  const url = `https://api.github.com/repos/${githubRepo}/actions/workflows/${encodeURIComponent(file)}/runs?per_page=1`;
  try {
    const payload = await externalJson(url, 4500);
    const run = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs[0] : null;
    if (!run) return { status: "unavailable", workflow: file, observedAt: new Date().toISOString(), reason: "no_runs" };
    const good = run.status === "completed" && run.conclusion === "success";
    return {
      status: good ? "healthy" : run.status === "in_progress" || run.status === "queued" ? "configured" : "degraded",
      workflow: file,
      runStatus: run.status,
      conclusion: run.conclusion,
      runNumber: run.run_number,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      htmlUrl: run.html_url
    };
  } catch (error) {
    return { status: "unavailable", workflow: file, observedAt: new Date().toISOString(), error: String((error as Error)?.message || "probe_failed") };
  }
}

function mapOwnerWriteError(error: any): never {
  const message = String(error?.message || "");
  for (const code of [
    "content_admin_required",
    "owner_target_protected",
    "owner_beta_action_invalid",
    "owner_auth_action_invalid",
    "owner_action_reason_invalid",
    "owner_learner_not_found",
    "owner_beta_expiry_invalid"
  ]) {
    if (message.includes(code)) fail(code === "owner_learner_not_found" ? 404 : code === "content_admin_required" || code === "owner_target_protected" ? 403 : 400, code);
  }
  fail(500, "owner_action_write_failed");
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

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: access, error: accessError } = await admin.rpc("content_admin_status_v1", {
      p_user: authData.user.id
    });
    if (accessError) fail(500, "owner_authz_unavailable");
    if (!access || typeof access !== "object" || (access as any).isAdmin !== true) fail(403, "content_admin_required");

    const url = new URL(req.url);
    const path = routePath(url);

    if (req.method === "GET" && path === "/dashboard") {
      if (url.search) fail(400, "query_not_supported");
      const [dashboardResult, storage, accessSummaryResult, snapshotsResult, edge, r2Backup, r2Audit, restoreDrill] = await Promise.all([
        admin.rpc("owner_admin_dashboard_v1"),
        admin.storage.listBuckets(),
        admin.rpc("owner_admin_access_summary_v1"),
        admin.rpc("owner_infrastructure_snapshots_v1"),
        cloudflareHealth(),
        workflowHealth("supabase-r2-backup.yml"),
        workflowHealth("r2-storage-audit.yml"),
        workflowHealth("supabase-r2-restore-drill.yml")
      ]);
      if (dashboardResult.error || !dashboardResult.data || typeof dashboardResult.data !== "object") fail(500, "owner_dashboard_unavailable");
      if (accessSummaryResult.error) fail(500, "owner_access_summary_unavailable");
      const buckets = storage.error ? null : (storage.data ?? []).map((bucket: any) => ({
        id: String(bucket.id ?? bucket.name ?? ""),
        name: String(bucket.name ?? ""),
        public: bucket.public === true
      }));
      const providerSnapshots = snapshotsResult.error ? {} : ((snapshotsResult.data as any)?.providers || {});
      const infrastructure = {
        ...((dashboardResult.data as any).infrastructure || {}),
        ownerApi: { status: "healthy", version: "owner-api-v2" },
        supabaseStorage: storage.error
          ? { status: "degraded", bucketCount: null }
          : { status: "healthy", bucketCount: buckets?.length ?? 0, buckets },
        cloudflare: edge,
        r2: { status: [r2Backup, r2Audit, restoreDrill].every((item: any) => item.status === "healthy") ? "healthy" : "degraded", backup: r2Backup, storageAudit: r2Audit, restoreDrill },
        sentry: providerSnapshots.sentry || { status: "unavailable", source: "not_connected" },
        resend: providerSnapshots.resend || { status: "unavailable", source: "not_connected" }
      };
      return response(req, 200, {
        ...(dashboardResult.data as Record<string, unknown>),
        owner: { userId: authData.user.id, email: authData.user.email ?? null, singleton: true },
        learnerAdministration: accessSummaryResult.data,
        infrastructure
      });
    }

    if (req.method === "GET" && path === "/learners") {
      if ([...url.searchParams.keys()].some((key) => key !== "q")) fail(400, "query_not_supported");
      const q = String(url.searchParams.get("q") || "").trim();
      if (q.length < 2 || q.length > 160) fail(400, "owner_learner_search_query_invalid");
      const { data, error } = await admin.rpc("owner_admin_learner_search_v1", { p_query: q });
      if (error) fail(500, "owner_learner_search_unavailable");
      const learners = Array.isArray((data as any)?.learners) ? (data as any).learners : [];
      const enriched = await Promise.all(learners.map(async (learner: any) => {
        const detail = await admin.rpc("owner_admin_learner_detail_v1", { p_learner: learner.id });
        return detail.error || !detail.data ? learner : { ...learner, ...(detail.data as any).learner };
      }));
      return response(req, 200, { contractId: "owner-admin-learner-search-v2", query: q, learners: enriched });
    }

    if (req.method === "GET" && path === "/learner") {
      if ([...url.searchParams.keys()].some((key) => key !== "id")) fail(400, "query_not_supported");
      const learnerId = uuidValue(url.searchParams.get("id"), "owner_learner_id_invalid");
      const { data, error } = await admin.rpc("owner_admin_learner_detail_v1", { p_learner: learnerId });
      if (error) fail(500, "owner_learner_detail_unavailable");
      if (!data) fail(404, "owner_learner_not_found");
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/learner-actions") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      const allowedFields = new Set(["learnerId","action","reason","confirmation","requestId","betaAccessUntil","suspensionHours"]);
      if (Object.keys(input).some((key) => !allowedFields.has(key))) fail(400, "invalid_fields");
      const learnerId = uuidValue(input.learnerId, "owner_learner_id_invalid");
      const requestId = uuidValue(input.requestId, "owner_request_id_invalid");
      const action = String(input.action || "");
      const reason = reasonValue(input.reason);
      const expectedConfirmations: Record<string, string> = {
        grant_beta: "GRANT BETA",
        revoke_beta: "REVOKE BETA",
        suspend: "SUSPEND",
        restore: "RESTORE"
      };
      if (!(action in expectedConfirmations)) fail(400, "owner_action_invalid");
      if (String(input.confirmation || "") !== expectedConfirmations[action]) fail(400, "owner_action_confirmation_required");
      if (learnerId === authData.user.id) fail(403, "owner_target_protected");

      if (action === "grant_beta" || action === "revoke_beta") {
        let betaUntil: string | null = null;
        if (action === "grant_beta") {
          if (typeof input.betaAccessUntil !== "string" || !Number.isFinite(Date.parse(input.betaAccessUntil))) fail(400, "owner_beta_expiry_invalid");
          betaUntil = new Date(input.betaAccessUntil).toISOString();
        } else if (input.betaAccessUntil !== null && input.betaAccessUntil !== undefined) {
          fail(400, "owner_beta_expiry_invalid");
        }
        const { data, error } = await admin.rpc("owner_admin_apply_beta_access_v1", {
          p_actor: authData.user.id,
          p_learner: learnerId,
          p_action: action,
          p_beta_until: betaUntil,
          p_reason: reason,
          p_request_id: requestId
        });
        if (error) mapOwnerWriteError(error);
        return response(req, 200, data);
      }

      const detailBefore = await admin.rpc("owner_admin_learner_detail_v1", { p_learner: learnerId });
      if (detailBefore.error) fail(500, "owner_learner_detail_unavailable");
      if (!detailBefore.data) fail(404, "owner_learner_not_found");
      const before = (detailBefore.data as any).learner || {};

      let banDuration = "none";
      if (action === "suspend") {
        if (!Number.isSafeInteger(input.suspensionHours) || Number(input.suspensionHours) < 1 || Number(input.suspensionHours) > 8760) fail(400, "owner_suspension_duration_invalid");
        banDuration = `${Number(input.suspensionHours)}h`;
      } else if (input.suspensionHours !== null && input.suspensionHours !== undefined) {
        fail(400, "owner_suspension_duration_invalid");
      }

      const { error: authWriteError } = await admin.auth.admin.updateUserById(learnerId, { ban_duration: banDuration });
      if (authWriteError) fail(500, "owner_auth_action_failed");

      const detailAfter = await admin.rpc("owner_admin_learner_detail_v1", { p_learner: learnerId });
      if (detailAfter.error || !detailAfter.data) {
        if (action === "suspend") await admin.auth.admin.updateUserById(learnerId, { ban_duration: "none" });
        fail(500, "owner_learner_detail_unavailable");
      }
      const after = (detailAfter.data as any).learner || {};

      const audit = await admin.rpc("owner_admin_record_auth_action_v1", {
        p_actor: authData.user.id,
        p_learner: learnerId,
        p_action: action,
        p_reason: reason,
        p_request_id: requestId,
        p_before: before,
        p_after: after
      });
      if (audit.error) {
        if (action === "suspend") {
          await admin.auth.admin.updateUserById(learnerId, { ban_duration: "none" });
        } else if (before?.bannedUntil && Date.parse(before.bannedUntil) > Date.now()) {
          const hours = Math.max(1, Math.ceil((Date.parse(before.bannedUntil) - Date.now()) / 3600000));
          await admin.auth.admin.updateUserById(learnerId, { ban_duration: `${hours}h` });
        }
        mapOwnerWriteError(audit.error);
      }
      return response(req, 200, audit.data);
    }

    fail(404, "not_found");
  } catch (error) {
    if (error instanceof ApiError) return response(req, error.status, { error: error.code });
    console.error(JSON.stringify({ event: "owner_api_unhandled", code: "internal_error" }));
    return response(req, 500, { error: "internal_error" });
  }
});
