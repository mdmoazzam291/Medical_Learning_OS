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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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

Deno.serve(async (req: Request) => {
  try {
    enforceOrigin(req);
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (!supabaseUrl || !publishableKey || !secretKey) fail(500, "server_configuration_error");
    if (req.method !== "GET") fail(405, "method_not_allowed");

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
    if (!access || typeof access !== "object" || (access as any).isAdmin !== true) {
      fail(403, "content_admin_required");
    }

    const url = new URL(req.url);
    const path = routePath(url);

    if (path === "/dashboard") {
      if (url.search) fail(400, "query_not_supported");
      const [{ data, error }, storage] = await Promise.all([
        admin.rpc("owner_admin_dashboard_v1"),
        admin.storage.listBuckets()
      ]);
      if (error || !data || typeof data !== "object") fail(500, "owner_dashboard_unavailable");
      const buckets = storage.error ? null : (storage.data ?? []).map((bucket: any) => ({
        id: String(bucket.id ?? bucket.name ?? ""),
        name: String(bucket.name ?? ""),
        public: bucket.public === true
      }));
      const infrastructure = {
        ...((data as any).infrastructure || {}),
        ownerApi: { status: "healthy", version: "owner-api-v1" },
        supabaseStorage: storage.error
          ? { status: "degraded", bucketCount: null }
          : { status: "healthy", bucketCount: buckets?.length ?? 0, buckets }
      };
      return response(req, 200, {
        ...(data as Record<string, unknown>),
        owner: {
          userId: authData.user.id,
          email: authData.user.email ?? null,
          singleton: true
        },
        infrastructure
      });
    }

    if (path === "/learners") {
      if ([...url.searchParams.keys()].some((key) => key !== "q")) fail(400, "query_not_supported");
      const q = String(url.searchParams.get("q") || "").trim();
      if (q.length < 2 || q.length > 160) fail(400, "owner_learner_search_query_invalid");
      const { data, error } = await admin.rpc("owner_admin_learner_search_v1", { p_query: q });
      if (error) {
        if (String(error.message || "").includes("owner_learner_search_query_invalid")) {
          fail(400, "owner_learner_search_query_invalid");
        }
        fail(500, "owner_learner_search_unavailable");
      }
      return response(req, 200, data);
    }

    fail(404, "not_found");
  } catch (error) {
    if (error instanceof ApiError) return response(req, error.status, { error: error.code });
    console.error(JSON.stringify({ event: "owner_api_unhandled", code: "internal_error" }));
    return response(req, 500, { error: "internal_error" });
  }
});
