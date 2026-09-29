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

function boundedInteger(value: unknown, min: number, max: number, code: string) {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) fail(400, code);
  return Number(value);
}

function uuidValue(value: unknown, code: string) {
  if (typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    fail(400, code);
  }
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

function mapReviewMeasurementWriteError(error: any): never {
  const message = String(error?.message || "");
  if (message.includes("reviewer_not_authorized")) fail(403, "reviewer_not_authorized");
  if (message.includes("review_measurement_review_unknown")) fail(404, "review_measurement_review_unknown");
  if (message.includes("conflicting_review_measurement_retry")) fail(409, "conflicting_review_measurement_retry");
  if (message.includes("review_measurement_")) fail(400, message.match(/review_measurement_[a-z_]+/)?.[0] || "review_measurement_invalid");
  fail(500, "review_measurement_write_failed");
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

    let adminAccessPromise: Promise<{ isAdmin: boolean; reviewKinds: string[] }> | null = null;
    const getAdminAccess = async () => {
      if (!adminAccessPromise) {
        adminAccessPromise = (async () => {
          const { data, error } = await trustedRead("content_admin_status", async () =>
            admin.rpc("content_admin_status_v1", { p_user: reviewerId })
          );
          if (error) fail(500, "review_authz_unavailable");
          const payload = data && typeof data === "object" ? data as any : {};
          return {
            isAdmin: payload.isAdmin === true,
            reviewKinds: Array.isArray(payload.reviewKinds)
              ? payload.reviewKinds.map((value: unknown) => String(value))
              : []
          };
        })();
      }
      return adminAccessPromise;
    };

    const getGrants = async () => (await getAdminAccess()).reviewKinds;

    const requireAdmin = async () => {
      const access = await getAdminAccess();
      if (!access.isAdmin) fail(403, "content_admin_required");
      return access;
    };

    const requireGrant = async (kind: string) => {
      const access = await requireAdmin();
      if (!access.reviewKinds.includes(kind)) fail(403, "reviewer_not_authorized");
      return access.reviewKinds;
    };

    const signedReviewMedia = async (questionVersionId: string, kind: string) => {
      const [
        { data: target, error: targetError },
        { data: targetSha256, error: hashError }
      ] = await Promise.all([
        admin.rpc("content_media_review_target", {
          p_question_version_id: questionVersionId,
          p_review_kind: kind
        }),
        admin.rpc("current_review_target_sha256", {
          p_question_version_id: questionVersionId,
          p_review_kind: kind
        })
      ]);
      if (targetError || hashError) fail(500, "review_media_target_unavailable");

      const reviewTarget = Array.isArray(target) ? target : [];
      if (!reviewTarget.length) return null;

      const ids = [...new Set(
        reviewTarget
          .map((item: any) => String(item?.link?.mediaAssetVersionId ?? ""))
          .filter(Boolean)
      )];
      if (!ids.length) fail(500, "review_media_target_invalid");

      const { data: assets, error: assetError } = await trustedRead(
        "review_media_assets",
        async () =>
          admin.from("content_media_assets")
            .select("media_asset_version_id,delivery_ref,modality,mime_type,width,height")
            .in("media_asset_version_id", ids)
      );
      if (assetError) fail(500, "review_media_delivery_unavailable");
      const byId = new Map(
        (assets ?? []).map((asset: any) => [String(asset.media_asset_version_id), asset])
      );

      const media = [];
      for (const targetItem of reviewTarget) {
        const mediaAssetVersionId = String(targetItem?.link?.mediaAssetVersionId ?? "");
        const asset: any = byId.get(mediaAssetVersionId);
        if (!asset) fail(500, "review_media_delivery_unavailable");

        const rawRef = String(asset.delivery_ref ?? "");
        let deliveryRef = rawRef;
        if (!rawRef.startsWith("https://")) {
          const prefix = "storage://mlos-media/";
          if (!rawRef.startsWith(prefix)) fail(500, "review_media_delivery_ref_invalid");
          const objectPath = rawRef.slice(prefix.length);
          if (!objectPath || objectPath.startsWith("/") || objectPath.includes("..")) {
            fail(500, "review_media_delivery_ref_invalid");
          }
          const { data: signed, error: signedError } = await admin.storage
            .from("mlos-media")
            .createSignedUrl(objectPath, 900);
          if (signedError || !signed?.signedUrl) fail(500, "review_media_delivery_unavailable");
          deliveryRef = signed.signedUrl;
        }

        media.push({
          mediaAssetVersionId,
          role: String(targetItem?.link?.role ?? ""),
          displayOrder: Number(targetItem?.link?.displayOrder ?? 0),
          modality: String(asset.modality ?? ""),
          mimeType: String(asset.mime_type ?? ""),
          width: asset.width === null ? null : Number(asset.width),
          height: asset.height === null ? null : Number(asset.height),
          deliveryRef
        });
      }

      return {
        contractId: "content-media-review-surface-v1",
        reviewKind: kind,
        targetSha256: String(targetSha256 ?? ""),
        media,
        target: reviewTarget
      };
    };

    const url = new URL(req.url);
    const path = routePath(url);

    if (req.method === "GET" && path === "/me") {
      if (url.search) fail(400, "query_not_supported");
      const access = await getAdminAccess();
      return response(req, 200, {
        reviewerId,
        isAdmin: access.isAdmin,
        reviewKinds: access.isAdmin ? access.reviewKinds : []
      });
    }

    if (req.method === "GET" && path === "/pipeline-status") {
      if (url.search) fail(400, "query_not_supported");
      const grants = await getGrants();
      if (!grants.length) fail(403, "reviewer_not_authorized");
      const { data, error } = await admin.rpc("content_intake_pipeline_status");
      if (error) fail(500, "content_pipeline_status_unavailable");
      return response(req, 200, data);
    }

    if (req.method === "GET" && path === "/transfer-pairs") {
      if (url.search) fail(400, "query_not_supported");
      await requireAdmin();

      const [
        { data: readiness, error: readinessError },
        { data: catalog, error: catalogError },
        { data: validations, error: validationsError }
      ] = await Promise.all([
        admin.rpc("study_retention_probe_readiness_v1"),
        trustedRead("transfer_pair_catalog", async () =>
          admin.from("study_catalog").select("body").eq("id", 1).single()
        ),
        trustedRead("transfer_pair_validations", async () =>
          admin.from("study_transfer_pair_validations")
            .select("id,primary_concept_id,question_a_version_id,question_b_version_id,decision,surface_novelty,construct_alignment,reasoning_alignment,difficulty_comparability,cue_overlap_risk,transfer_evidence_valid,retention_probe_comparable,validation_sha256,validated_at")
            .order("validated_at", { ascending: true })
        )
      ]);

      if (readinessError) fail(500, "transfer_pair_readiness_unavailable");
      if (catalogError || !catalog) fail(500, "review_catalog_unavailable");
      if (validationsError) fail(500, "transfer_pair_validation_history_unavailable");

      const body = catalog.body as any;
      const questions = Array.isArray(body?.questions) ? body.questions : [];
      const byVersion = new Map(
        questions.map((question: any) => [String(question?.questionVersionId ?? ""), question])
      );
      const validationByPair = new Map<string, any>();
      for (const row of validations ?? []) {
        const ids = [String(row.question_a_version_id), String(row.question_b_version_id)].sort();
        validationByPair.set(ids.join("|"), row);
      }

      const candidates: any[] = [];
      const concepts = Array.isArray((readiness as any)?.concepts) ? (readiness as any).concepts : [];
      for (const concept of concepts) {
        const published = Array.isArray(concept?.publishedItems) ? concept.publishedItems : [];
        for (let i = 0; i < published.length; i += 1) {
          for (let j = i + 1; j < published.length; j += 1) {
            const aVersion = String(published[i]?.questionVersionId ?? "");
            const bVersion = String(published[j]?.questionVersionId ?? "");
            if (!aVersion || !bVersion) continue;
            const ids = [aVersion, bVersion].sort();
            const a = byVersion.get(ids[0]) as any;
            const b = byVersion.get(ids[1]) as any;
            if (!a || !b || a?.questionId === b?.questionId) continue;
            const existing = validationByPair.get(ids.join("|")) ?? null;
            candidates.push({
              primaryConceptId: String(concept?.conceptId ?? ""),
              questionA: {
                questionId: String(a.questionId ?? ""),
                questionVersionId: String(a.questionVersionId ?? ""),
                stem: String(a.stem ?? ""),
                options: Array.isArray(a.options) ? a.options : [],
                answerOptionId: String(a.answerOptionId ?? ""),
                explanation: String(a.explanation ?? "")
              },
              questionB: {
                questionId: String(b.questionId ?? ""),
                questionVersionId: String(b.questionVersionId ?? ""),
                stem: String(b.stem ?? ""),
                options: Array.isArray(b.options) ? b.options : [],
                answerOptionId: String(b.answerOptionId ?? ""),
                explanation: String(b.explanation ?? "")
              },
              validation: existing
            });
          }
        }
      }

      return response(req, 200, {
        contractId: "admin-transfer-pair-queue-v1",
        pairs: candidates,
        activationAuthority: false,
        probeSchedulingEnabled: false
      });
    }

    if (req.method === "POST" && path === "/transfer-pairs/validate") {
      await requireAdmin();
      const body = await jsonBody(req, 12288);
      exactFields(body, [
        "questionVersionA",
        "questionVersionB",
        "decision",
        "surfaceNovelty",
        "constructAlignment",
        "reasoningAlignment",
        "difficultyComparability",
        "cueOverlapRisk",
        "retentionProbeComparable",
        "notes",
        "attestationVersion",
        "attested"
      ]);

      const questionVersionA = identifier(body.questionVersionA);
      const questionVersionB = identifier(body.questionVersionB);
      const decision = String(body.decision ?? "");
      const surfaceNovelty = String(body.surfaceNovelty ?? "");
      const constructAlignment = String(body.constructAlignment ?? "");
      const reasoningAlignment = String(body.reasoningAlignment ?? "");
      const difficultyComparability = String(body.difficultyComparability ?? "");
      const cueOverlapRisk = String(body.cueOverlapRisk ?? "");
      const notes = typeof body.notes === "string" ? body.notes.trim() : "";
      const retentionProbeComparable = body.retentionProbeComparable;
      const attestationVersion = String(body.attestationVersion ?? "");

      if (questionVersionA === questionVersionB) fail(400, "distinct_question_versions_required");
      if (!["validated", "rejected"].includes(decision)) fail(400, "invalid_transfer_pair_decision");
      if (!["low", "moderate", "high"].includes(surfaceNovelty)) fail(400, "invalid_surface_novelty");
      if (!["same_primary_construct", "related_construct", "mismatch"].includes(constructAlignment)) fail(400, "invalid_construct_alignment");
      if (!["comparable", "bounded_difference", "materially_different"].includes(reasoningAlignment)) fail(400, "invalid_reasoning_alignment");
      if (!["comparable", "bounded_difference", "unknown", "materially_different"].includes(difficultyComparability)) fail(400, "invalid_difficulty_comparability");
      if (!["low", "moderate", "high"].includes(cueOverlapRisk)) fail(400, "invalid_cue_overlap_risk");
      if (typeof retentionProbeComparable !== "boolean") fail(400, "invalid_retention_probe_comparable");
      if (notes.length < 20 || notes.length > 4000) fail(400, "invalid_transfer_pair_notes");
      if (attestationVersion !== "transfer-pair-human-validation-v1" || body.attested !== true) {
        fail(400, "transfer_pair_attestation_required");
      }

      const { data, error } = await admin.rpc("record_transfer_pair_validation_v1", {
        p_question_version_1: questionVersionA,
        p_question_version_2: questionVersionB,
        p_validator: reviewerId,
        p_decision: decision,
        p_surface_novelty: surfaceNovelty,
        p_construct_alignment: constructAlignment,
        p_reasoning_alignment: reasoningAlignment,
        p_difficulty_comparability: difficultyComparability,
        p_cue_overlap_risk: cueOverlapRisk,
        p_retention_probe_comparable: retentionProbeComparable,
        p_notes: notes
      });

      if (error) {
        const message = String(error.message || "");
        if (message.includes("content_admin_required") || message.includes("transfer_pair_validator_not_authorized")) {
          fail(403, "content_admin_required");
        }
        if (error.code === "23505") fail(409, "transfer_pair_already_validated");
        if (message.includes("unknown_transfer_pair_question_version")) fail(404, "transfer_pair_question_not_found");
        if (message.includes("transfer_pair_requires_published_questions")) fail(409, "transfer_pair_not_published");
        if (message.includes("validated_pair_fails_transfer_semantic_gate") || message.includes("retention_comparability_gate_failed")) {
          fail(409, "transfer_pair_validation_gate_failed");
        }
        fail(400, "transfer_pair_validation_failed");
      }

      const receipt = Array.isArray(data) ? data[0] : data;
      return response(req, 200, {
        contractId: "admin-transfer-pair-validation-receipt-v1",
        receipt,
        activationAuthority: false,
        probeSchedulingEnabled: false
      });
    }

    if (req.method === "GET" && path === "/learner-reports") {
      if (url.search) fail(400, "query_not_supported");
      const grants = await getGrants();
      if (!grants.length) fail(403, "reviewer_not_authorized");

      const [
        { data: reports, error: reportError },
        { data: triageEvents, error: triageError },
        { data: catalog, error: catalogError }
      ] = await Promise.all([
        trustedRead("learner_content_issue_reports", async () =>
          admin.from("learner_content_issue_reports")
            .select("id,learner_id,concept_id,target_type,target_id,target_sha256,report_kind,details,suggested_correction,created_at,contract_id")
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
        ),
        trustedRead("learner_content_issue_triage_events", async () =>
          admin.from("learner_content_issue_triage_events")
            .select("report_id")
            .order("triaged_at", { ascending: true })
            .order("triage_event_id", { ascending: true })
        ),
        trustedRead("learner_report_catalog", async () =>
          admin.from("study_catalog").select("body,version").eq("id", 1).single()
        )
      ]);

      if (reportError) fail(500, "learner_report_queue_unavailable");
      if (triageError) fail(500, "learner_report_triage_evidence_unavailable");
      if (catalogError || !catalog) fail(500, "review_catalog_unavailable");

      const triaged = new Set((triageEvents ?? []).map((row: any) => String(row.report_id)));
      const openReports = (reports ?? []).filter((row: any) =>
        !triaged.has(String(row.id)) &&
        String(row.learner_id) !== reviewerId
      );

      const noteTargetIds = [...new Set(
        openReports
          .filter((row: any) => row.target_type === "canonical_note")
          .map((row: any) => String(row.target_id))
      )];

      let noteRows: any[] = [];
      if (noteTargetIds.length) {
        const { data, error } = await trustedRead("learner_report_note_targets", async () =>
          admin.from("neural_canonical_note_versions")
            .select("id,concept_id,version,title,body_markdown,source_ids,content_sha256,status,published_at")
            .in("id", noteTargetIds)
        );
        if (error) fail(500, "learner_report_target_unavailable");
        noteRows = data ?? [];
      }

      const body = catalog.body as any;
      const questions = Array.isArray(body?.questions) ? body.questions : [];
      const sources = Array.isArray(body?.sources) ? body.sources : [];
      const notesById = new Map(noteRows.map((row: any) => [String(row.id), row]));
      const groups = new Map<string, any>();

      for (const row of openReports) {
        const key = [row.target_type, row.target_id, row.target_sha256].join("|");
        let group = groups.get(key);
        if (!group) {
          let targetState = "unavailable";
          let target: any = null;
          let targetSources: any[] = [];

          if (row.target_type === "question_version") {
            const question = questions.find((item: any) => item?.questionVersionId === row.target_id) ?? null;
            if (question) {
              targetState = question.status === "published" ? "current" : "superseded";
              targetSources = sources.filter(
                (source: any) => Array.isArray(question.sourceIds) && question.sourceIds.includes(source?.sourceId)
              );
            }
            target = { question };
          } else {
            const note = notesById.get(String(row.target_id)) ?? null;
            if (note) {
              targetState = note.status === "published" ? "current" : "superseded";
              targetSources = sources.filter(
                (source: any) => Array.isArray(note.source_ids) && note.source_ids.includes(source?.sourceId)
              );
            }
            target = note ? {
              note: {
                noteVersionId: note.id,
                conceptId: note.concept_id,
                version: note.version,
                title: note.title,
                bodyMarkdown: note.body_markdown,
                sourceIds: note.source_ids,
                contentSha256: note.content_sha256,
                status: note.status,
                publishedAt: note.published_at
              }
            } : { note: null };
          }

          group = {
            targetType: row.target_type,
            targetId: row.target_id,
            targetSha256: row.target_sha256,
            conceptId: row.concept_id,
            targetState,
            target,
            sources: targetSources,
            reports: []
          };
          groups.set(key, group);
        }

        group.reports.push({
          reportId: row.id,
          reportKind: row.report_kind,
          details: row.details,
          suggestedCorrection: row.suggested_correction,
          createdAt: row.created_at
        });
      }

      const grouped = [...groups.values()]
        .map((group: any) => ({
          ...group,
          reportCount: group.reports.length,
          oldestReportAt: group.reports[0]?.createdAt ?? null
        }))
        .sort((a: any, b: any) =>
          b.reportCount - a.reportCount ||
          String(a.oldestReportAt || "").localeCompare(String(b.oldestReportAt || "")) ||
          String(a.targetId).localeCompare(String(b.targetId))
        );

      return response(req, 200, {
        contractId: "learner-content-issue-triage-queue-v1",
        catalogVersion: catalog.version,
        reportCount: grouped.reduce((sum: number, group: any) => sum + group.reportCount, 0),
        groupCount: grouped.length,
        groups: grouped,
        learnerIdentityExposed: false,
        canonicalMutationAuthority: false
      });
    }

    if (req.method === "POST" && path === "/learner-reports/triage") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req, 32768);
      exactFields(input, [
        "reportIds",
        "reviewKind",
        "decision",
        "reasonCode",
        "attestationVersion",
        "attested"
      ]);
      if (!Array.isArray(input.reportIds) ||
          input.reportIds.length < 1 ||
          input.reportIds.length > 100) {
        fail(400, "content_issue_triage_batch_size_invalid");
      }
      const reportIds = input.reportIds.map((value: unknown) =>
        uuidValue(value, "content_issue_triage_report_invalid")
      );
      if (new Set(reportIds).size !== reportIds.length) {
        fail(400, "content_issue_triage_duplicate_report");
      }
      const kind = reviewKind(input.reviewKind);
      const decision = String(input.decision || "");
      if (!["no_canonical_issue", "correction_required"].includes(decision)) {
        fail(400, "content_issue_triage_decision_invalid");
      }
      const reasonCode = String(input.reasonCode || "");
      const noIssueReasons = new Set([
        "canonical_content_current",
        "report_not_reproducible",
        "target_superseded"
      ]);
      const correctionReasons = new Set([
        "medical_correction_required",
        "reference_update_required",
        "rights_or_provenance_review_required",
        "ambiguous_scope_requires_revision",
        "other_correction_required"
      ]);
      if (decision === "no_canonical_issue" && !noIssueReasons.has(reasonCode)) {
        fail(400, "content_issue_triage_reason_mismatch");
      }
      if (decision === "correction_required" && !correctionReasons.has(reasonCode)) {
        fail(400, "content_issue_triage_reason_mismatch");
      }
      if (input.attestationVersion !== "learner-content-issue-triage-attestation-v1" ||
          input.attested !== true) {
        fail(400, "content_issue_triage_attestation_required");
      }
      await requireGrant(kind);

      const { data, error } = await admin.rpc("triage_learner_content_issue_reports", {
        p_report_ids: reportIds,
        p_reviewer: reviewerId,
        p_review_kind: kind,
        p_decision: decision,
        p_reason_code: reasonCode,
        p_attestation_version: String(input.attestationVersion),
        p_attested: true
      });

      if (error) {
        const message = String(error?.message || "");
        if (message.includes("reviewer_not_authorized") ||
            message.includes("content_issue_triage_self_review_blocked")) {
          fail(403, message.includes("self_review") ? "content_issue_triage_self_review_blocked" : "reviewer_not_authorized");
        }
        if (message.includes("content_issue_triage_already_recorded") || error?.code === "23505") {
          fail(409, "content_issue_triage_already_recorded");
        }
        const code = message.match(/content_issue_triage_[a-z_]+/)?.[0];
        if (code) fail(400, code);
        fail(500, "content_issue_triage_write_failed");
      }

      if (data?.contractId !== "learner-content-issue-triage-receipt-v1" ||
          data?.decisionCount !== reportIds.length ||
          data?.canonicalMutation !== false ||
          data?.publicationAuthority !== false ||
          data?.learnerModelAuthority !== false ||
          !Array.isArray(data?.triageEvents) ||
          data.triageEvents.length !== reportIds.length) {
        fail(500, "content_issue_triage_write_failed");
      }

      return response(req, 200, data);
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
      const pending = questions
        .filter((q: any) =>
          q?.status === "in_review" &&
          typeof q?.questionVersionId === "string" &&
          !reviewed.has(q.questionVersionId)
        );
      const queue = await Promise.all(pending.map(async (q: any) => ({
        question: q,
        sources: sources.filter(
          (source: any) => Array.isArray(q.sourceIds) && q.sourceIds.includes(source?.sourceId)
        ),
        mediaReview: await signedReviewMedia(q.questionVersionId, kind)
      })));

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
            .select("id,concept_id,version,supersedes_id,title,body_markdown,source_ids,provenance,status,content_sha256,author_id,created_at")
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
            provenance: note.provenance,
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

    if (req.method === "GET" && path === "/review-measurements/summary") {
      if ([...url.searchParams.keys()].some((key) => key !== "experimentId")) fail(400, "query_not_supported");
      const experimentId = identifier(url.searchParams.get("experimentId"));
      const grants = await getGrants();
      if (!grants.length) fail(403, "reviewer_not_authorized");
      const { data, error } = await admin.rpc("content_review_workflow_measurement_summary", {
        p_experiment_id: experimentId
      });
      if (error) fail(500, "review_measurement_summary_unavailable");
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/review-measurements") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, [
        "reviewId",
        "workflowMode",
        "experimentId",
        "clientSessionId",
        "foregroundActiveMs",
        "elapsedWallMs",
        "queueSize"
      ]);
      const reviewId = uuidValue(input.reviewId, "invalid_review_id");
      const clientSessionId = uuidValue(input.clientSessionId, "invalid_client_session_id");
      const workflowMode = String(input.workflowMode || "");
      if (!["standard","claim_first","source_first"].includes(workflowMode)) {
        fail(400, "review_measurement_mode_invalid");
      }
      const experimentId = identifier(input.experimentId);
      const foregroundActiveMs = boundedInteger(
        input.foregroundActiveMs, 0, 14400000, "review_measurement_timing_invalid"
      );
      const elapsedWallMs = boundedInteger(
        input.elapsedWallMs, foregroundActiveMs, 21600000, "review_measurement_timing_invalid"
      );
      const queueSize = boundedInteger(
        input.queueSize, 1, 5000, "review_measurement_queue_size_invalid"
      );

      const { data, error } = await admin.rpc("record_content_review_workflow_measurement", {
        p_review_id: reviewId,
        p_reviewer: reviewerId,
        p_workflow_mode: workflowMode,
        p_experiment_id: experimentId,
        p_client_session_id: clientSessionId,
        p_foreground_active_ms: foregroundActiveMs,
        p_elapsed_wall_ms: elapsedWallMs,
        p_queue_size: queueSize
      });
      if (error) mapReviewMeasurementWriteError(error);
      if (!data?.measurementId || data?.reviewId !== reviewId) fail(500, "review_measurement_write_failed");
      return response(req, 200, data);
    }

    if (req.method === "GET" && path === "/reference-review-batch/summary") {
      if ([...url.searchParams.keys()].some((key) => key !== "experimentId")) fail(400, "query_not_supported");
      const experimentId = identifier(url.searchParams.get("experimentId"));
      await requireGrant("references");
      const { data, error } = await admin.rpc("content_review_workflow_batch_measurement_summary", {
        p_experiment_id: experimentId
      });
      if (error) fail(500, "review_batch_summary_unavailable");
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/reference-review-batch") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req, 32768);
      exactFields(input, [
        "questionVersionIds",
        "decisions",
        "notes",
        "experimentId",
        "workflowMode",
        "clientSessionId",
        "foregroundActiveMs",
        "elapsedWallMs",
        "queueSize",
        "attestationVersion",
        "attested"
      ]);
      await requireGrant("references");
      if (!Array.isArray(input.questionVersionIds) || input.questionVersionIds.length !== 7 ||
          !Array.isArray(input.decisions) || input.decisions.length !== 7 ||
          !Array.isArray(input.notes) || input.notes.length !== 7) {
        fail(400, "review_batch_size_invalid");
      }
      const questionVersionIds = input.questionVersionIds.map((value: unknown) => identifier(value));
      const decisions = input.decisions.map((value: unknown) => {
        const decision = String(value || "");
        if (!["approved", "rejected"].includes(decision)) fail(400, "invalid_review_decision");
        return decision;
      });
      const notes = input.notes.map((value: unknown) => {
        if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 4000) {
          fail(400, "invalid_review_notes");
        }
        return value.trim();
      });
      const experimentId = identifier(input.experimentId);
      const workflowMode = String(input.workflowMode || "");
      if (!["claim_first", "standard"].includes(workflowMode)) fail(400, "review_batch_workflow_invalid");
      const clientSessionId = uuidValue(input.clientSessionId, "invalid_client_session_id");
      const foregroundActiveMs = boundedInteger(
        input.foregroundActiveMs, 0, 14400000, "review_batch_timing_invalid"
      );
      const elapsedWallMs = boundedInteger(
        input.elapsedWallMs, foregroundActiveMs, 21600000, "review_batch_timing_invalid"
      );
      const queueSize = boundedInteger(input.queueSize, 1, 5000, "review_batch_timing_invalid");
      if (input.attestationVersion !== "references-batch-attestation-v1" || input.attested !== true) {
        fail(400, "review_batch_attestation_required");
      }

      const { data, error } = await admin.rpc("record_content_review_batch_with_measurement", {
        p_question_version_ids: questionVersionIds,
        p_decisions: decisions,
        p_notes: notes,
        p_reviewer: reviewerId,
        p_experiment_id: experimentId,
        p_workflow_mode: workflowMode,
        p_client_session_id: clientSessionId,
        p_foreground_active_ms: foregroundActiveMs,
        p_elapsed_wall_ms: elapsedWallMs,
        p_queue_size: queueSize,
        p_attestation_version: String(input.attestationVersion),
        p_attested: true
      });
      if (error) {
        const message = String(error?.message || "");
        if (message.includes("reviewer_not_authorized")) fail(403, "reviewer_not_authorized");
        if (message.includes("review_batch_targets_changed") || error?.code === "23505") {
          fail(409, "review_batch_targets_changed");
        }
        if (message.includes("question_not_in_review") || message.includes("question_review_rejected")) {
          fail(409, "review_batch_target_unavailable");
        }
        const code = message.match(/(?:review_batch|invalid_review|unknown_question)[a-z_]*/)?.[0];
        if (code) fail(400, code);
        fail(500, "review_batch_write_failed");
      }
      if (data?.contractId !== "content-review-batch-receipt-v1" ||
          data?.experimentId !== experimentId ||
          data?.workflowMode !== workflowMode ||
          data?.decisionCount !== 7 ||
          !Array.isArray(data?.reviews) ||
          data.reviews.length !== 7) {
        fail(500, "review_batch_write_failed");
      }
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/structured-review-batch") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req, 32768);
      exactFields(input, [
        "targetType",
        "targetIds",
        "reviewKind",
        "decision",
        "reasonCode",
        "attestationVersion",
        "attested"
      ]);
      const targetType = String(input.targetType || "");
      if (!["question_version", "neural_note_version"].includes(targetType)) {
        fail(400, "structured_review_target_type_invalid");
      }
      if (!Array.isArray(input.targetIds) || input.targetIds.length < 1 || input.targetIds.length > 500) {
        fail(400, "structured_review_batch_size_invalid");
      }
      const targetIds = input.targetIds.map((value: unknown) => {
        const id = String(value || "");
        if (targetType === "neural_note_version") return uuidValue(id, "structured_review_target_invalid");
        return identifier(id);
      });
      const kind = reviewKind(input.reviewKind);
      const decision = String(input.decision || "");
      if (!["approved", "rejected"].includes(decision)) fail(400, "invalid_review_decision");
      const reasonCode = String(input.reasonCode || "");
      const allowedReasons = new Set([
        "human_reviewed_no_issue",
        "needs_medical_correction",
        "reference_support_insufficient",
        "rights_or_provenance_problem",
        "duplicate_or_scope_problem",
        "other_review_problem"
      ]);
      if (!allowedReasons.has(reasonCode)) fail(400, "structured_review_reason_invalid");
      if (decision === "approved" && reasonCode !== "human_reviewed_no_issue") {
        fail(400, "structured_review_reason_decision_mismatch");
      }
      if (decision === "rejected" && reasonCode === "human_reviewed_no_issue") {
        fail(400, "structured_review_reason_decision_mismatch");
      }
      if (input.attestationVersion !== "structured-human-review-v1" || input.attested !== true) {
        fail(400, "structured_review_attestation_required");
      }
      await requireGrant(kind);

      const { data, error } = await admin.rpc("record_structured_review_batch", {
        p_target_type: targetType,
        p_target_ids: targetIds,
        p_review_kind: kind,
        p_reviewer: reviewerId,
        p_decision: decision,
        p_reason_code: reasonCode,
        p_attestation_version: String(input.attestationVersion),
        p_attested: true
      });
      if (error) {
        const message = String(error?.message || "");
        if (message.includes("reviewer_not_authorized")) fail(403, "reviewer_not_authorized");
        if (message.includes("rights_not_resolved")) fail(409, "rights_not_resolved");
        if (message.includes("question_not_in_review") ||
            message.includes("neural_note_not_in_review") ||
            message.includes("question_review_rejected") ||
            message.includes("neural_note_review_rejected") ||
            error?.code === "23505") {
          fail(409, "structured_review_target_unavailable");
        }
        const code = message.match(/(?:structured_review|invalid_review|unknown_question|neural_note)[a-z_]*/)?.[0];
        if (code) fail(400, code);
        fail(500, "structured_review_write_failed");
      }
      if (data?.contractId !== "structured-review-batch-receipt-v1" ||
          data?.targetType !== targetType ||
          data?.reviewKind !== kind ||
          data?.decision !== decision ||
          data?.decisionCount !== targetIds.length ||
          data?.publicationAuthority !== false ||
          !Array.isArray(data?.reviews) ||
          data.reviews.length !== targetIds.length) {
        fail(500, "structured_review_write_failed");
      }
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/full-question-review") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, [
        "questionVersionId",
        "medicalNotes",
        "referencesNotes",
        "rightsNotes",
        "attestationVersion",
        "attested"
      ]);
      const questionVersionId = identifier(input.questionVersionId);
      for (const kind of ["medical", "references", "rights"]) await requireGrant(kind);
      for (const field of ["medicalNotes", "referencesNotes", "rightsNotes"]) {
        const value = input[field];
        if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 4000) {
          fail(400, "invalid_review_notes");
        }
      }
      if (input.attestationVersion !== "full-question-review-attestation-v1" || input.attested !== true) {
        fail(400, "full_review_attestation_required");
      }

      const { data, error } = await admin.rpc("record_full_question_review_bundle", {
        p_question_version_id: questionVersionId,
        p_reviewer: reviewerId,
        p_medical_notes: String(input.medicalNotes).trim(),
        p_references_notes: String(input.referencesNotes).trim(),
        p_rights_notes: String(input.rightsNotes).trim(),
        p_attestation_version: String(input.attestationVersion),
        p_attested: true
      });
      if (error) {
        const message = String(error?.message || "");
        if (message.includes("reviewer_not_authorized")) fail(403, "reviewer_not_authorized");
        if (message.includes("unknown_question_version")) fail(404, "question_not_found");
        if (message.includes("question_not_in_review") ||
            message.includes("full_review_requires_unreviewed_version") ||
            message.includes("rights_not_resolved") ||
            error?.code === "23505") fail(409, "full_review_not_available");
        if (message.includes("full_review_") || message.includes("invalid_review_notes")) {
          fail(400, message.match(/(?:full_review|invalid_review_notes)[a-z_]*/)?.[0] || "full_review_invalid");
        }
        fail(500, "review_write_failed");
      }
      if (data?.contractId !== "full-question-review-bundle-receipt-v1" ||
          data?.questionVersionId !== questionVersionId ||
          data?.reviewCount !== 3 ||
          !Array.isArray(data?.reviews) ||
          data.reviews.length !== 3) {
        fail(500, "review_write_failed");
      }
      return response(req, 200, data);
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
