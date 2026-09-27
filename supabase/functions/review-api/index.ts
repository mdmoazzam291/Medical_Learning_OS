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
const reviewKinds = new Set(["medical", "references", "rights"]);

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

function identifier(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(value)) fail(400, "invalid_identifier");
  return value;
}

async function jsonBody(req: Request) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 8192) fail(413, "body_too_large");
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") || "")) fail(415, "json_required");
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > 8192) fail(413, "body_too_large");
  try { return object(JSON.parse(text || "{}")); }
  catch { fail(400, "invalid_json"); }
}

function routePath(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf("review-api");
  return "/" + (index >= 0 ? parts.slice(index + 1) : parts).join("/");
}

function reviewKind(value: unknown) {
  if (typeof value !== "string" || !reviewKinds.has(value)) fail(400, "invalid_review_kind");
  return value;
}

function rightsStatus(value: unknown) {
  const allowed = new Set(["owned", "licensed", "public_domain", "citation_only", "restricted"]);
  if (typeof value !== "string" || !allowed.has(value)) fail(400, "invalid_rights_status");
  return value;
}

function mapRightsWriteError(error: any): never {
  const message = String(error?.message || "");
  if (error?.code === "23505") fail(409, "source_rights_already_resolved");
  if (message.includes("reviewer_not_authorized")) fail(403, "reviewer_not_authorized");
  if (message.includes("unknown_source")) fail(404, "source_not_found");
  if (message.includes("invalid_rights_status")) fail(400, "invalid_rights_status");
  if (message.includes("invalid_rights_evidence")) fail(400, "invalid_rights_evidence");
  fail(500, "rights_write_failed");
}

function mapNeuralNoteReviewWriteError(error: any): never {
  const message = String(error?.message || "");
  if (error?.code === "23505") fail(409, "review_already_recorded");
  if (message.includes("reviewer_not_authorized")) fail(403, "reviewer_not_authorized");
  if (message.includes("author_cannot_self_review")) fail(403, "author_cannot_self_review");
  if (message.includes("neural_note_unknown")) fail(404, "neural_note_not_found");
  if (message.includes("neural_note_not_in_review")) fail(409, "neural_note_not_in_review");
  if (message.includes("neural_note_review_rejected")) fail(409, "neural_note_review_rejected");
  if (message.includes("review_target_sources_missing")) fail(409, "review_target_invalid");
  if (message.includes("rights_not_resolved")) fail(409, "rights_not_resolved");
  fail(500, "review_write_failed");
}

function mapReviewWriteError(error: any): never {
  const message = String(error?.message || "");
  if (error?.code === "23505") fail(409, "review_already_recorded");
  if (message.includes("reviewer_not_authorized")) fail(403, "reviewer_not_authorized");
  if (message.includes("author_cannot_self_review")) fail(403, "author_cannot_self_review");
  if (message.includes("unknown_question_version")) fail(404, "question_not_found");
  if (message.includes("question_not_in_review")) fail(409, "question_not_in_review");
  if (message.includes("review_target_sources_missing")) fail(409, "review_target_invalid");
  if (message.includes("review_target_changed")) fail(409, "review_target_changed");
  if (message.includes("question_review_rejected")) fail(409, "question_review_rejected");
  if (message.includes("rights_not_resolved")) fail(409, "rights_not_resolved");
  fail(500, "review_write_failed");
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
    const reviewerId = authData.user.id;

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const trustedRead = async (operation: string, read: () => Promise<any>) => {
      let result = await read();
      if (result.error?.code === "PGRST303") {
        console.warn(JSON.stringify({ event: "trusted_read_retry", operation, code: "PGRST303" }));
        await new Promise((resolve) => setTimeout(resolve, 75));
        result = await read();
      }
      return result;
    };

    const getGrants = async () => {
      const { data, error } = await trustedRead("reviewer_grants", async () =>
        admin.rpc("get_active_reviewer_grants", { p_reviewer: reviewerId })
      );
      if (error) fail(500, "review_authz_unavailable");
      return (data ?? []).map((row: any) => String(row.review_kind));
    };

    const requireGrant = async (kind: string) => {
      const grants = await getGrants();
      if (!grants.includes(kind)) fail(403, "reviewer_not_authorized");
      return grants;
    };

    const url = new URL(req.url);
    const path = routePath(url);

    if (req.method === "GET" && path === "/me") {
      if (url.search) fail(400, "query_not_supported");
      return response(req, 200, { reviewerId, reviewKinds: await getGrants() });
    }

    if (req.method === "GET" && path === "/queue") {
      if ([...url.searchParams.keys()].some((key) => key !== "kind")) fail(400, "query_not_supported");
      const kind = reviewKind(url.searchParams.get("kind"));
      await requireGrant(kind);

      const [{ data: catalog, error: catalogError }, { data: decisions, error: decisionError }] = await Promise.all([
        trustedRead("review_catalog", async () =>
          admin.from("study_catalog").select("body").eq("id", 1).single()
        ),
        trustedRead("review_decisions", async () =>
          admin.from("content_review_events").select("question_version_id")
            .eq("review_kind", kind).order("reviewed_at", { ascending: true })
        )
      ]);
      if (catalogError || !catalog) fail(500, "review_catalog_unavailable");
      if (decisionError) fail(500, "review_evidence_unavailable");

      const reviewed = new Set((decisions ?? []).map((row: any) => String(row.question_version_id)));
      const body = catalog.body as any;
      const sources = Array.isArray(body?.sources) ? body.sources : [];
      const questions = Array.isArray(body?.questions) ? body.questions : [];
      const queue = questions
        .filter((q: any) => q?.status === "in_review" && typeof q?.questionVersionId === "string" && !reviewed.has(q.questionVersionId))
        .map((q: any) => ({
          question: q,
          sources: sources.filter((source: any) => Array.isArray(q.sourceIds) && q.sourceIds.includes(source?.sourceId))
        }));

      return response(req, 200, { reviewKind: kind, items: queue });
    }

    if (req.method === "GET" && path === "/note-queue") {
      if ([...url.searchParams.keys()].some((key) => key !== "kind")) fail(400, "query_not_supported");
      const kind = reviewKind(url.searchParams.get("kind"));
      await requireGrant(kind);

      const [
        { data: notes, error: noteError },
        { data: decisions, error: decisionError },
        { data: catalog, error: catalogError }
      ] = await Promise.all([
        trustedRead("neural_note_queue", async () =>
          admin.from("neural_canonical_note_versions")
            .select("id,concept_id,version,supersedes_id,title,body_markdown,source_ids,status,content_sha256,author_id,created_at")
            .eq("status", "in_review")
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
        ),
        trustedRead("neural_note_decisions", async () =>
          admin.from("content_review_events").select("target_id")
            .eq("target_type", "neural_note_version")
            .eq("review_kind", kind)
            .order("reviewed_at", { ascending: true })
        ),
        trustedRead("neural_note_catalog", async () =>
          admin.from("study_catalog").select("body,version").eq("id", 1).single()
        )
      ]);

      if (noteError) fail(500, "review_note_queue_unavailable");
      if (decisionError) fail(500, "review_evidence_unavailable");
      if (catalogError || !catalog) fail(500, "review_catalog_unavailable");

      const reviewed = new Set((decisions ?? []).map((row: any) => String(row.target_id)));
      const sources = Array.isArray((catalog.body as any)?.sources) ? (catalog.body as any).sources : [];
      const queue = (notes ?? [])
        .filter((note: any) => note?.author_id !== reviewerId && !reviewed.has(String(note?.id)))
        .map((note: any) => ({
          note: {
            noteVersionId: note.id,
            conceptId: note.concept_id,
            version: note.version,
            supersedesNoteVersionId: note.supersedes_id,
            title: note.title,
            bodyMarkdown: note.body_markdown,
            sourceIds: note.source_ids,
            status: note.status,
            contentSha256: note.content_sha256,
            createdAt: note.created_at
          },
          sources: sources.filter(
            (source: any) => Array.isArray(note.source_ids) && note.source_ids.includes(source?.sourceId)
          )
        }));

      return response(req, 200, {
        reviewKind: kind,
        targetType: "neural_note_version",
        catalogVersion: catalog.version,
        items: queue
      });
    }

    if (req.method === "POST" && path === "/source-rights") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, ["sourceId", "rightsStatus", "evidence"]);
      const sourceId = identifier(input.sourceId);
      const status = rightsStatus(input.rightsStatus);
      if (typeof input.evidence !== "string" || input.evidence.trim().length < 1 || input.evidence.trim().length > 4000) {
        fail(400, "invalid_rights_evidence");
      }
      await requireGrant("rights");

      const { data, error } = await admin.rpc("resolve_source_rights", {
        p_source_id: sourceId,
        p_reviewer: reviewerId,
        p_rights_status: status,
        p_evidence: input.evidence.trim()
      });
      if (error) mapRightsWriteError(error);
      const receipt = Array.isArray(data) ? data[0] : data;
      if (!receipt?.rights_event_id || !receipt?.source_fingerprint_sha256 || !receipt?.reviewed_at) fail(500, "rights_write_failed");

      return response(req, 200, {
        rightsEventId: receipt.rights_event_id,
        sourceId,
        rightsStatus: status,
        sourceFingerprintSha256: receipt.source_fingerprint_sha256,
        reviewedAt: receipt.reviewed_at
      });
    }

    if (req.method === "POST" && path === "/note-reviews") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, ["noteVersionId", "reviewKind", "decision", "notes"]);
      const noteVersionId = identifier(input.noteVersionId);
      const kind = reviewKind(input.reviewKind);
      if (!["approved", "rejected"].includes(String(input.decision))) fail(400, "invalid_review_decision");
      if (typeof input.notes !== "string" || input.notes.trim().length < 1 || input.notes.trim().length > 4000) {
        fail(400, "invalid_review_notes");
      }
      await requireGrant(kind);

      const { data, error } = await admin.rpc("record_neural_note_review", {
        p_note_version_id: noteVersionId,
        p_review_kind: kind,
        p_reviewer: reviewerId,
        p_decision: String(input.decision),
        p_notes: input.notes.trim()
      });
      if (error) mapNeuralNoteReviewWriteError(error);
      const receipt = Array.isArray(data) ? data[0] : data;
      if (!receipt?.review_id || !receipt?.target_sha256 || !receipt?.reviewed_at) fail(500, "review_write_failed");

      return response(req, 200, {
        reviewId: receipt.review_id,
        noteVersionId,
        targetType: "neural_note_version",
        reviewKind: kind,
        decision: String(input.decision),
        targetSha256: receipt.target_sha256,
        reviewedAt: receipt.reviewed_at,
        noteStatus: receipt.note_status
      });
    }

    if (req.method === "POST" && path === "/reviews") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, ["questionVersionId", "reviewKind", "decision", "notes"]);
      const questionVersionId = identifier(input.questionVersionId);
      const kind = reviewKind(input.reviewKind);
      if (!["approved", "rejected"].includes(String(input.decision))) fail(400, "invalid_review_decision");
      if (typeof input.notes !== "string" || input.notes.trim().length < 1 || input.notes.trim().length > 4000) {
        fail(400, "invalid_review_notes");
      }
      await requireGrant(kind);

      const { data, error } = await admin.rpc("record_content_review", {
        p_question_version_id: questionVersionId,
        p_review_kind: kind,
        p_reviewer: reviewerId,
        p_decision: String(input.decision),
        p_notes: input.notes.trim()
      });
      if (error) mapReviewWriteError(error);
      const receipt = Array.isArray(data) ? data[0] : data;
      if (!receipt?.review_id || !receipt?.target_sha256 || !receipt?.reviewed_at) fail(500, "review_write_failed");

      return response(req, 200, {
        reviewId: receipt.review_id,
        questionVersionId,
        reviewKind: kind,
        decision: String(input.decision),
        targetSha256: receipt.target_sha256,
        reviewedAt: receipt.reviewed_at
      });
    }

    fail(404, "not_found");
  } catch (error) {
    if (error instanceof ApiError) return response(req, error.status, { error: error.code });
    console.error(JSON.stringify({ event: "review_api_unhandled", code: "internal_error" }));
    return response(req, 500, { error: "internal_error" });
  }
});
