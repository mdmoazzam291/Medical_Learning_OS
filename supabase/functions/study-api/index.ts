import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Rating, createEmptyCard, fsrs } from "npm:ts-fsrs@5.4.2";
import {
  createLockedSectionRuntimeRun,
  advanceExamRunClock,
  setExamAnswer,
  setExamReview,
  cancelExamRun,
  examRunProgress,
  scoreLockedSectionExamRun,
  seededQuestionOrder
} from "./_shared/exam-runtime.js";

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
const identifier = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(value)) fail(400, "invalid_identifier");
  return value;
};
const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) fail(400, "invalid_integer");
  return Number(value);
};
const object = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(400, "invalid_json");
  return value as Json;
};
const FSRS_SHADOW_ENGINE = Object.freeze({
  package: "ts-fsrs",
  packageVersion: "5.4.2",
  algorithmVersion: "FSRS-6",
  configVersion: "fsrs-shadow-default-v1",
  requestRetention: 0.9,
  maximumIntervalDays: 36500,
  enableFuzz: false,
  enableShortTerm: true
});

const fsrsShadow = fsrs({
  request_retention: FSRS_SHADOW_ENGINE.requestRetention,
  maximum_interval: FSRS_SHADOW_ENGINE.maximumIntervalDays,
  enable_fuzz: FSRS_SHADOW_ENGINE.enableFuzz,
  enable_short_term: FSRS_SHADOW_ENGINE.enableShortTerm
});

const fsrsRating = (value: unknown) => {
  if (value === 1) return Rating.Again;
  if (value === 2) return Rating.Hard;
  if (value === 3) return Rating.Good;
  if (value === 4) return Rating.Easy;
  fail(500, "invalid_fsrs_shadow_rating");
};

const buildFsrsShadowSchedule = (
  evidence: any,
  liveRevisionRows: any[],
  nowIso: string
) => {
  if (!evidence?.hasReplayableEvidence || !Array.isArray(evidence?.reviews) || !evidence.reviews.length) {
    return null;
  }

  const liveByQuestion = new Map(
    (liveRevisionRows ?? []).map((row: any) => [String(row.question_version_id), row])
  );
  const fullyRated = new Set(
    (Array.isArray(evidence?.questionCoverage) ? evidence.questionCoverage : [])
      .filter((row: any) => row?.fullyRated === true)
      .map((row: any) => String(row.questionVersionId))
  );
  const grouped = new Map<string, any[]>();
  for (const review of evidence.reviews) {
    const questionVersionId = String(review.questionVersionId ?? "");
    if (!questionVersionId) fail(500, "invalid_fsrs_shadow_review");
    if (!fullyRated.has(questionVersionId)) continue;
    const list = grouped.get(questionVersionId) ?? [];
    list.push(review);
    grouped.set(questionVersionId, list);
  }

  const now = new Date(nowIso);
  const items = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([questionVersionId, reviews]) => {
      reviews.sort((a, b) =>
        String(a.reviewedAt).localeCompare(String(b.reviewedAt)) ||
        String(a.attemptId).localeCompare(String(b.attemptId))
      );
      let card = createEmptyCard(new Date(reviews[0].reviewedAt));
      for (const review of reviews) {
        const next = fsrsShadow.next(card, new Date(review.reviewedAt), fsrsRating(review.rating));
        card = next.card;
      }

      const live = liveByQuestion.get(questionVersionId);
      const fsrsDueAt = card.due.toISOString();
      const liveDueAt = live?.due_at ?? null;
      const liveDueMs = liveDueAt ? Date.parse(liveDueAt) : NaN;
      const fsrsDueMs = Date.parse(fsrsDueAt);

      return {
        questionVersionId,
        ratedReviewCount: reviews.length,
        fsrsDueAt,
        liveDueAt,
        dueDeltaMs: Number.isFinite(liveDueMs) ? fsrsDueMs - liveDueMs : null,
        stability: card.stability,
        difficulty: card.difficulty,
        scheduledDays: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        retrievabilityNow: fsrsShadow.get_retrievability(card, now, false)
      };
    });

  return {
    engine: FSRS_SHADOW_ENGINE,
    generatedAt: nowIso,
    itemCount: items.length,
    skippedIncompleteQuestionCount: Math.max(
      0,
      Number(evidence?.ratedQuestionCount ?? 0) - items.length
    ),
    items
  };
};

const exactFields = (value: Json, required: string[], optional: string[] = []) => {
  if (required.some((key) => !(key in value)) ||
    Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key))) fail(400, "invalid_fields");
};

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  return {
    ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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
  const index = parts.lastIndexOf("study-api");
  return "/" + (index >= 0 ? parts.slice(index + 1) : parts).join("/");
}

function publishedQuestions(catalog: any) {
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.questions)) return [];
  return catalog.questions.filter((q: any) =>
    q && q.status === "published" && typeof q.publishedAt === "string" &&
    typeof q.questionVersionId === "string" && typeof q.stem === "string" &&
    Array.isArray(q.options) && typeof q.answerOptionId === "string"
  );
}

function learnerQuestion(q: any) {
  const primaryConcept = q.conceptLinks?.find((link: any) => link?.role === "primary");
  return {
    questionVersionId: q.questionVersionId,
    questionId: q.questionId,
    version: q.version,
    conceptId: primaryConcept?.conceptId ?? null,
    stem: q.stem,
    options: q.options.map((option: any) => ({ optionId: option.optionId, text: option.text })),
    conceptLinks: q.conceptLinks,
    provenance: q.provenance
  };
}

function summarize(events: any[]) {
  const concepts = new Map<string, { conceptId: string; attempts: number; correct: number }>();
  let correct = 0;
  for (const event of events) {
    if (event?.correct === true) correct += 1;
    const conceptId = String(event?.conceptId || "");
    if (!conceptId) continue;
    const item = concepts.get(conceptId) ?? { conceptId, attempts: 0, correct: 0 };
    item.attempts += 1;
    if (event?.correct === true) item.correct += 1;
    concepts.set(conceptId, item);
  }
  return {
    attempts: events.length,
    correct,
    accuracy: events.length ? correct / events.length : null,
    concepts: [...concepts.values()].map((item) => ({
      ...item,
      accuracy: item.attempts ? item.correct / item.attempts : null
    }))
  };
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
    const internalExamTester = authData.user.app_metadata?.medical_learning_os_internal_tester === true;

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const requireExamRunAccess = (row: any) => {
      if (row?.state?.assembly?.testingOnly === true && !internalExamTester) {
        fail(403, "internal_exam_test_forbidden");
      }
      return row;
    };

    const trustedRead = async (operation: string, read: () => Promise<any>) => {
      let result = await read();
      if (result.error?.code === "PGRST303") {
        console.warn(JSON.stringify({ event: "trusted_read_retry", operation, code: "PGRST303" }));
        await new Promise((resolve) => setTimeout(resolve, 75));
        result = await read();
      }
      return result;
    };

    const getCatalog = async () => {
      const { data, error } = await trustedRead("catalog", async () =>
        admin.from("study_catalog").select("version,body").eq("id", 1).single()
      );
      if (error || !data) fail(500, "catalog_unavailable");
      return data as { version: number; body: any };
    };
    const learnerMediaPrompt = async (questionVersionId: string) => {
      const { data, error } = await admin.rpc("content_media_prompt", {
        p_question_version_id: questionVersionId
      });
      if (error) fail(500, "media_prompt_failed");
      const sourceMedia = Array.isArray(data?.media) ? data.media : [];
      const media = [];
      for (const item of sourceMedia) {
        const deliveryRef = String(item?.deliveryRef ?? "");
        if (deliveryRef.startsWith("https://")) {
          media.push(item);
          continue;
        }
        const prefix = "storage://mlos-media/";
        if (!deliveryRef.startsWith(prefix)) fail(500, "media_delivery_ref_invalid");
        const objectPath = deliveryRef.slice(prefix.length);
        if (!objectPath || objectPath.startsWith("/") || objectPath.includes("..")) {
          fail(500, "media_delivery_ref_invalid");
        }
        const { data: signed, error: signedError } = await admin.storage
          .from("mlos-media")
          .createSignedUrl(objectPath, 900);
        if (signedError || !signed?.signedUrl) fail(500, "media_delivery_failed");
        media.push({ ...item, deliveryRef: signed.signedUrl });
      }
      return {
        contractId: "content-media-prompt-v1",
        questionVersionId,
        media
      };
    };
    const getEvents = async () => {
      const { data, error } = await trustedRead("attempts", async () =>
        admin.from("study_attempts").select("event,recorded_at,id")
          .eq("learner_id", learnerId).order("recorded_at", { ascending: true }).order("id", { ascending: true })
      );
      if (error) fail(500, "study_read_failed");
      return (data ?? []).map((row: any) => row.event);
    };
    const getBookmarks = async () => {
      const { data, error } = await trustedRead("bookmarks", async () =>
        admin.from("study_bookmarks").select("question_version_id")
          .eq("learner_id", learnerId).order("question_version_id", { ascending: true })
      );
      if (error) fail(500, "study_read_failed");
      return (data ?? []).map((row: any) => row.question_version_id);
    };
    const rebuildRevision = async (questionVersionId: string | null = null) => {
      const { data, error } = await admin.rpc("study_rebuild_revision_state", {
        p_learner: learnerId,
        p_question_version_id: questionVersionId
      });
      if (error) fail(500, "revision_projection_failed");
      return data;
    };
    const getRevisionState = async () => {
      const { data, error } = await trustedRead("revision_state", async () =>
        admin.from("study_revision_state")
          .select("question_version_id,concept_id,attempts,correct,incorrect,consecutive_correct,latest_correct,first_attempt_at,last_attempt_at,last_duration_ms,policy_id,policy_version,due_at,projection_version,evidence_event_count,evidence_last_event_id,projected_at")
          .eq("learner_id", learnerId)
          .order("due_at", { ascending: true })
          .order("question_version_id", { ascending: true })
      );
      if (error) fail(500, "study_read_failed");
      return data ?? [];
    };
    const getVaultAnnotations = async () => {
      const { data, error } = await trustedRead("vault_annotations", async () =>
        admin.from("neural_personal_annotations")
          .select("id,concept_id,body_markdown,anchor_note_version_id,revision,created_at,updated_at")
          .eq("learner_id", learnerId)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: true })
      );
      if (error) fail(500, "study_read_failed");
      return data ?? [];
    };
    const getMemoryJudgments = async () => {
      const { data, error } = await trustedRead("memory_judgments", async () =>
        admin.from("study_memory_judgments")
          .select("id,attempt_id,question_version_id,rating,scale_id,prompt_id,recorded_at")
          .eq("learner_id", learnerId)
          .order("recorded_at", { ascending: true })
          .order("id", { ascending: true })
      );
      if (error) fail(500, "study_read_failed");
      return data ?? [];
    };
    const getScheduleDecisionEvents = async () => {
      const { data, error } = await trustedRead("schedule_decision_events", async () =>
        admin.from("study_schedule_decision_events")
          .select("id,attempt_id,question_version_id,policy_id,policy_version,role,config_version,evidence_cutoff_at,proposed_due_at,decision,created_at")
          .eq("learner_id", learnerId)
          .order("evidence_cutoff_at", { ascending: true })
          .order("id", { ascending: true })
      );
      if (error) fail(500, "study_read_failed");
      return data ?? [];
    };
    const recordScheduleDecision = async ({
      attemptId,
      policyId,
      policyVersion,
      role,
      configVersion,
      proposedDueAt,
      decision
    }: any) => {
      const { data, error } = await admin.rpc("study_record_schedule_decision", {
        p_learner: learnerId,
        p_attempt: attemptId,
        p_policy_id: policyId,
        p_policy_version: policyVersion,
        p_role: role,
        p_config_version: configVersion,
        p_proposed_due_at: proposedDueAt,
        p_decision: decision
      });
      if (error || data?.error) {
        console.warn(JSON.stringify({
          event: "schedule_decision_deferred",
          policyId,
          role,
          code: data?.error || error?.code || "schedule_decision_failed"
        }));
        return null;
      }
      return data;
    };
    const getRecommendationEvents = async () => {
      const { data, error } = await trustedRead("recommendation_events", async () =>
        admin.from("study_recommendation_events")
          .select("id,session_id,strategy,available_minutes,plan,created_at")
          .eq("learner_id", learnerId)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
      );
      if (error) fail(500, "study_read_failed");
      return data ?? [];
    };
    const getOpenSession = async () => {
      const { data, error } = await trustedRead("open_session", async () =>
        admin.from("study_sessions").select("id")
          .eq("learner_id", learnerId).eq("closed", false).maybeSingle()
      );
      if (error) fail(500, "study_read_failed");
      return data?.id ? String(data.id) : null;
    };
    const studyNowEstimateMs = (lastDurationMs: unknown) => {
      const observed = Number(lastDurationMs);
      const base = Number.isFinite(observed) && observed >= 0 ? observed : 60000;
      return Math.min(300000, Math.max(60000, base + 45000));
    };
    const buildStudyNowPlan = (
      revisionRows: any[],
      published: Map<string, any>,
      availableMinutes: number,
      maxItems: number,
      generatedAt: string
    ) => {
      const nowMs = Date.parse(generatedAt);
      const budgetMs = availableMinutes * 60000;
      const due = revisionRows
        .filter((row: any) => published.has(row.question_version_id))
        .map((row: any) => ({
          row,
          dueMs: Date.parse(row.due_at),
          estimatedMs: studyNowEstimateMs(row.last_duration_ms)
        }))
        .filter((item: any) => Number.isFinite(item.dueMs) && item.dueMs <= nowMs)
        .sort((a: any, b: any) =>
          a.dueMs - b.dueMs ||
          String(a.row.question_version_id).localeCompare(String(b.row.question_version_id)));

      const selected: any[] = [];
      let estimatedMs = 0;
      let dueSelectedCount = 0;
      for (const item of due) {
        if (selected.length >= maxItems) break;
        if (estimatedMs + item.estimatedMs > budgetMs) continue;
        selected.push({
          questionVersionId: item.row.question_version_id,
          dueAt: item.row.due_at,
          overdueMs: Math.max(0, nowMs - item.dueMs),
          estimatedMs: item.estimatedMs,
          reason: item.row.latest_correct === false ? "mistake-repair" : "due-revision"
        });
        estimatedMs += item.estimatedMs;
        dueSelectedCount += 1;
      }

      const seen = new Set(revisionRows.map((row: any) => String(row.question_version_id)));
      const unseen = [...published.keys()].filter((questionVersionId) => !seen.has(questionVersionId));
      let newLearningSelectedCount = 0;
      const newLearningEstimateMs = 120000;
      for (const questionVersionId of unseen) {
        if (selected.length >= maxItems) break;
        if (estimatedMs + newLearningEstimateMs > budgetMs) continue;
        selected.push({
          questionVersionId,
          estimatedMs: newLearningEstimateMs,
          reason: "new-learning"
        });
        estimatedMs += newLearningEstimateMs;
        newLearningSelectedCount += 1;
      }

      return {
        generatedAt,
        availableMinutes,
        budgetMs,
        estimatedMs,
        estimatedMinutes: Math.ceil(estimatedMs / 60000),
        dueCount: due.length,
        newLearningCount: unseen.length,
        selectedCount: selected.length,
        dueSelectedCount,
        newLearningSelectedCount,
        deferredDueCount: due.length - dueSelectedCount,
        deferredNewLearningCount: unseen.length - newLearningSelectedCount,
        selected,
        strategy: "due-then-new-v2",
        provisional: true
      };
    };
    const questions = async (filter = "all") => {
      if (!["all", "incorrect", "bookmarks"].includes(filter)) fail(400, "invalid_filter");
      const [{ body }, bookmarks, events] = await Promise.all([getCatalog(), getBookmarks(), getEvents()]);
      let list = publishedQuestions(body);
      if (filter === "bookmarks") list = list.filter((q: any) => bookmarks.includes(q.questionVersionId));
      if (filter === "incorrect") {
        const latest = new Map<string, boolean>();
        for (const event of events) latest.set(String(event.questionVersionId), event.correct === true);
        list = list.filter((q: any) => latest.get(q.questionVersionId) === false);
      }
      return list.map(learnerQuestion);
    };
    const getExamRuleSet = async (ruleSetId: string) => {
      const { data, error } = await trustedRead("exam_rule_set", async () =>
        admin.from("exam_rule_sets")
          .select("rule_set_id,exam_id,version,verification_status,total_questions,total_duration_seconds,rule_set,rule_set_sha256")
          .eq("rule_set_id", ruleSetId)
          .eq("verification_status", "verified")
          .maybeSingle()
      );
      if (error) fail(500, "exam_rule_set_read_failed");
      if (!data) fail(404, "exam_rule_set_not_available");
      return data as any;
    };
    const getOpenExamRun = async () => {
      const { data, error } = await trustedRead("open_exam_run", async () =>
        admin.from("exam_runs")
          .select("id,learner_id,exam_id,rule_set_id,engine_id,status,state_revision,state,started_at,scheduled_end_at,completed_at,created_at,updated_at")
          .eq("learner_id", learnerId)
          .eq("status", "in_progress")
          .maybeSingle()
      );
      if (error) fail(500, "exam_run_read_failed");
      return data as any ?? null;
    };
    const getExamRun = async (runId: string) => {
      const { data, error } = await trustedRead("exam_run", async () =>
        admin.from("exam_runs")
          .select("id,learner_id,exam_id,rule_set_id,engine_id,status,state_revision,state,started_at,scheduled_end_at,completed_at,created_at,updated_at")
          .eq("id", runId)
          .eq("learner_id", learnerId)
          .maybeSingle()
      );
      if (error) fail(500, "exam_run_read_failed");
      if (!data) fail(404, "exam_run_not_found");
      return data as any;
    };
    const getExamRunEvent = async (runId: string, requestKey: string) => {
      const { data, error } = await trustedRead("exam_run_event", async () =>
        admin.from("exam_run_events")
          .select("event_type,event,revision_after")
          .eq("run_id", runId)
          .eq("learner_id", learnerId)
          .eq("request_key", requestKey)
          .maybeSingle()
      );
      if (error) fail(500, "exam_run_read_failed");
      return data as any ?? null;
    };
    const getExamReceipt = async (runId: string) => {
      const { data, error } = await trustedRead("exam_receipt", async () =>
        admin.from("exam_run_receipts")
          .select("receipt,completed_at,recorded_at")
          .eq("run_id", runId)
          .eq("learner_id", learnerId)
          .maybeSingle()
      );
      if (error) fail(500, "exam_run_read_failed");
      return data?.receipt ?? null;
    };
    const examCatalogQuestionMap = async () => {
      const catalog = await getCatalog();
      const rows = Array.isArray(catalog.body?.questions) ? catalog.body.questions : [];
      return {
        catalog,
        byVersion: new Map(rows
          .filter((question: any) => typeof question?.questionVersionId === "string")
          .map((question: any) => [String(question.questionVersionId), question]))
      };
    };
    const buildExamCompletionReceipt = async (run: any) => {
      const [rule, catalogData] = await Promise.all([
        getExamRuleSet(String(run.ruleSetId)),
        examCatalogQuestionMap()
      ]);
      const ids = run.sections.flatMap((section: any) => section.questionVersionIds);
      const answerKey: Record<string, string> = {};
      for (const questionVersionId of ids) {
        const question: any = catalogData.byVersion.get(String(questionVersionId));
        if (!question || typeof question.answerOptionId !== "string" || !question.answerOptionId) {
          fail(500, "exam_answer_key_unavailable");
        }
        answerKey[String(questionVersionId)] = question.answerOptionId;
      }
      const score = scoreLockedSectionExamRun({
        run,
        ruleSetId: String(rule.rule_set_id),
        scoring: rule.rule_set.rules.scoring,
        answerKey
      });
      return {
        contractId: "exam-completion-v1",
        ...score,
        ruleSetSha256: rule.rule_set_sha256,
        catalogVersionAtScoring: catalogData.catalog.version,
        assembly: run.assembly ?? null
      };
    };
    const syncExamClock = async (row: any, at: string) => {
      if (row.status !== "in_progress") return row;
      const nextState = advanceExamRunClock(row.state, at);
      if (JSON.stringify(nextState) === JSON.stringify(row.state)) return row;

      const completed = nextState.status === "completed";
      const completionReceipt = completed
        ? await buildExamCompletionReceipt(nextState)
        : null;
      const eventType = completed ? "run.completed" : "clock.advanced";
      const event = {
        fromSectionIndex: row.state.currentSectionIndex,
        toSectionIndex: nextState.currentSectionIndex,
        serverObservedAt: at,
        scheduledCompletionAt: completed ? nextState.completedAt : null
      };
      const requestKey = completed
        ? `clock:complete:${nextState.completedAt}`
        : `clock:section:${nextState.currentSectionIndex}:${nextState.sections[nextState.currentSectionIndex].scheduledStartAt}`;

      const { data, error } = await admin.rpc("exam_apply_transition", {
        p_learner: learnerId,
        p_run: row.id,
        p_request_key: requestKey,
        p_expected_revision: row.state_revision,
        p_event_type: eventType,
        p_event: event,
        p_next_state: nextState,
        p_occurred_at: at,
        p_completion_receipt: completionReceipt
      });
      if (error) {
        const message = String(error.message || "");
        if (message.includes("exam_revision_conflict")) return await getExamRun(String(row.id));
        fail(500, "exam_clock_write_failed");
      }
      return {
        ...row,
        state_revision: Number(data?.revision ?? row.state_revision + 1),
        status: String(data?.status ?? nextState.status),
        state: data?.state ?? nextState,
        completed_at: nextState.completedAt ?? row.completed_at,
        updated_at: at
      };
    };
    const examRunView = async (row: any, at: string, resumedExisting = false) => {
      const state = row.state;
      const progress = examRunProgress(state, at);
      const catalogData = await examCatalogQuestionMap();
      const currentSection = state.currentSectionIndex === null
        ? null
        : state.sections[state.currentSectionIndex];
      const questions = currentSection
        ? await Promise.all(currentSection.questionVersionIds.map(async (questionVersionId: string) => {
            const question: any = catalogData.byVersion.get(String(questionVersionId));
            if (!question) fail(500, "exam_question_version_unavailable");
            return {
              ...learnerQuestion(question),
              media: await learnerMediaPrompt(String(questionVersionId))
            };
          }))
        : [];
      const responses = currentSection
        ? Object.fromEntries(currentSection.questionVersionIds.map((questionVersionId: string) => [
            questionVersionId,
            state.responses?.[questionVersionId] ?? {
              optionId: null,
              markedForReview: false,
              answeredAt: null,
              updatedAt: null
            }
          ]))
        : {};
      const receipt = state.status === "completed"
        ? await getExamReceipt(String(row.id))
        : null;

      return {
        contractId: "exam-run-view-v1",
        runId: row.id,
        examId: row.exam_id,
        ruleSetId: row.rule_set_id,
        engineId: row.engine_id,
        revision: row.state_revision,
        status: state.status,
        startedAt: state.startedAt,
        scheduledEndAt: state.scheduledEndAt,
        completedAt: state.completedAt,
        caveats: state.caveats,
        assembly: state.assembly ?? null,
        termination: state.termination ?? null,
        resumedExisting,
        progress,
        currentSection: currentSection ? {
          sectionId: currentSection.sectionId,
          label: currentSection.label,
          scheduledStartAt: currentSection.scheduledStartAt,
          scheduledEndAt: currentSection.scheduledEndAt,
          closedAt: currentSection.closedAt,
          questions,
          responses
        } : null,
        receipt
      };
    };

    const sessionState = async (sessionId: string) => {
      const { data: session, error } = await trustedRead("session_state", async () =>
        admin.from("study_sessions").select("id,position,closed,question_version_ids")
          .eq("id", sessionId).eq("learner_id", learnerId).maybeSingle()
      );
      if (error) fail(500, "study_read_failed");
      if (!session) fail(404, "session_not_found");
      const ids = session.question_version_ids as string[];
      const result: any = {
        sessionId: session.id,
        position: session.position,
        total: ids.length,
        closed: session.closed,
        question: null,
        receipt: null,
        memoryJudgment: null,
        recommendationContext: null
      };
      if (session.closed) return result;
      const [{ body }, { data: attempt, error: attemptError }, { data: recommendation, error: recommendationError }] = await Promise.all([
        getCatalog(),
        trustedRead("session_receipt", async () =>
          admin.from("study_attempts").select("id,receipt").eq("session_id", sessionId)
            .eq("learner_id", learnerId).eq("position", session.position).maybeSingle()
        ),
        trustedRead("session_recommendation_context", async () =>
          admin.from("study_recommendation_events")
            .select("strategy,available_minutes,plan,created_at")
            .eq("session_id", sessionId)
            .eq("learner_id", learnerId)
            .maybeSingle()
        )
      ]);
      if (attemptError || recommendationError) fail(500, "study_read_failed");

      const currentQuestionVersionId = ids[session.position];
      const allowedRecommendationReasons = new Set(["mistake-repair", "due-revision", "new-learning"]);
      const selectedRecommendation = Array.isArray(recommendation?.plan?.selected)
        ? recommendation.plan.selected.find(
            (item: any) => String(item?.questionVersionId ?? "") === currentQuestionVersionId
          )
        : null;
      const recommendationReason = allowedRecommendationReasons.has(selectedRecommendation?.reason)
        ? selectedRecommendation.reason
        : null;
      const recommendationContext = recommendation && recommendationReason ? {
        source: "study-now",
        reason: recommendationReason,
        strategy: String(recommendation.strategy ?? ""),
        availableMinutes: Number(recommendation.available_minutes),
        createdAt: recommendation.created_at
      } : null;
      let memoryJudgment = null;
      if (attempt?.id) {
        const { data: judgment, error: judgmentError } = await trustedRead("session_memory_judgment", async () =>
          admin.from("study_memory_judgments")
            .select("id,attempt_id,question_version_id,rating,scale_id,prompt_id,recorded_at")
            .eq("learner_id", learnerId).eq("attempt_id", attempt.id).maybeSingle()
        );
        if (judgmentError) fail(500, "study_read_failed");
        memoryJudgment = judgment ? {
          schemaVersion: 1,
          type: "memory.rating",
          id: judgment.id,
          attemptId: judgment.attempt_id,
          questionVersionId: judgment.question_version_id,
          rating: judgment.rating,
          ratingLabel: ["", "Again", "Hard", "Good", "Easy"][judgment.rating],
          scaleId: judgment.scale_id,
          promptId: judgment.prompt_id,
          recordedAt: judgment.recorded_at
        } : null;
      }
      const q = publishedQuestions(body).find((item: any) => item.questionVersionId === ids[session.position]);
      if (!q) return { ...result, blocked: "question_no_longer_published", receipt: attempt?.receipt ?? null, memoryJudgment, recommendationContext };
      const mediaPrompt = await learnerMediaPrompt(q.questionVersionId);
      return {
        ...result,
        question: {
          ...learnerQuestion(q),
          media: mediaPrompt.media
        },
        receipt: attempt?.receipt ?? null,
        memoryJudgment,
        recommendationContext
      };
    };

    const url = new URL(req.url);
    const path = routePath(url);

    if (req.method === "GET" && path === "/questions") {
      const filter = url.searchParams.get("filter") || "all";
      if ([...url.searchParams.keys()].some((key) => key !== "filter")) fail(400, "query_not_supported");
      return response(req, 200, { questions: await questions(filter) });
    }

    if (req.method === "GET" && path === "/media") {
      const params = new URL(req.url).searchParams;
      if ([...params.keys()].some((key) => key !== "questionVersionId")) fail(400, "query_not_supported");
      const rawQuestionVersionId = params.get("questionVersionId");
      if (!rawQuestionVersionId) fail(400, "question_version_required");
      const questionVersionId = identifier(rawQuestionVersionId);

      const catalog = await getCatalog();
      if (!publishedQuestions(catalog.body).some((question: any) =>
        question.questionVersionId === questionVersionId
      )) fail(404, "question_not_available");

      return response(req, 200, await learnerMediaPrompt(questionVersionId));
    }

    if (req.method === "GET" && path === "/revision/due") {
      if ([...url.searchParams.keys()].some((key) => key !== "limit")) fail(400, "query_not_supported");
      const rawLimit = url.searchParams.get("limit");
      const limit = rawLimit === null ? 20 : integer(Number(rawLimit), 1, 50);

      await rebuildRevision();
      const [catalog, revisionRows] = await Promise.all([getCatalog(), getRevisionState()]);
      const published = new Map(
        publishedQuestions(catalog.body).map((question: any) => [question.questionVersionId, question])
      );
      const generatedAt = new Date().toISOString();
      const nowMs = Date.parse(generatedAt);
      const eligible = revisionRows
        .filter((row: any) => published.has(row.question_version_id))
        .map((row: any) => ({
          row,
          dueMs: Date.parse(row.due_at)
        }))
        .filter((item: any) => Number.isFinite(item.dueMs));

      const due = eligible.filter((item: any) => item.dueMs <= nowMs);
      const upcoming = eligible.filter((item: any) => item.dueMs > nowMs);
      const seenQuestionIds = new Set(revisionRows.map((row: any) => String(row.question_version_id)));
      const unseenCount = [...published.keys()].filter((questionVersionId) => !seenQuestionIds.has(questionVersionId)).length;
      const items = due.slice(0, limit).map(({ row, dueMs }: any) => ({
        question: learnerQuestion(published.get(row.question_version_id)),
        schedule: {
          dueAt: row.due_at,
          overdueMs: Math.max(0, nowMs - dueMs),
          policyId: row.policy_id,
          policyVersion: row.policy_version,
          projectionVersion: row.projection_version
        },
        evidence: {
          attempts: row.attempts,
          correct: row.correct,
          incorrect: row.incorrect,
          consecutiveCorrect: row.consecutive_correct,
          latestCorrect: row.latest_correct,
          firstAttemptAt: row.first_attempt_at,
          lastAttemptAt: row.last_attempt_at,
          lastDurationMs: row.last_duration_ms,
          eventCount: row.evidence_event_count
        }
      }));

      return response(req, 200, {
        generatedAt,
        policy: {
          id: "bootstrap-binary-v1",
          version: 1,
          evidence: "binary-correctness",
          provisional: true
        },
        dueCount: due.length,
        unseenCount,
        studyNowAvailableCount: due.length + unseenCount,
        returnedCount: items.length,
        nextDueAt: upcoming.length ? upcoming[0].row.due_at : null,
        items
      });
    }

    if (req.method === "GET" && path === "/revision/fsrs-shadow") {
      if (url.search) fail(400, "query_not_supported");
      const [{ data, error }, liveRevisionRows] = await Promise.all([
        admin.rpc("study_fsrs_shadow_evidence", {
          p_learner: learnerId
        }),
        getRevisionState()
      ]);
      if (error) fail(500, "fsrs_shadow_projection_failed");
      const evidence = data ?? {};
      const generatedAt = new Date().toISOString();
      const shadowSchedule = buildFsrsShadowSchedule(
        evidence,
        liveRevisionRows,
        generatedAt
      );
      return response(req, 200, {
        generatedAt,
        mode: "shadow-scheduler",
        schedulerControl: false,
        candidateEngine: FSRS_SHADOW_ENGINE,
        livePolicyId: evidence.livePolicyId ?? "bootstrap-binary-v1",
        evidence,
        shadowSchedule,
        shadowScheduleReason: !evidence.hasReplayableEvidence
          ? "no_real_memory_ratings"
          : shadowSchedule?.itemCount > 0
            ? "real_memory_ratings_replayed"
            : "no_fully_rated_question_history"
      });
    }


    if (req.method === "GET" && path === "/vault/search") {
      const qRaw = url.searchParams.get("q") ?? "";
      if ([...url.searchParams.keys()].some(key => key !== "q")) fail(400, "query_not_supported");
      const q = qRaw.trim().toLocaleLowerCase();
      if (q.length < 2 || q.length > 120) fail(400, "vault_search_query_invalid");

      const [catalog, { data: canonicalRows, error: canonicalError }, annotations] = await Promise.all([
        getCatalog(),
        trustedRead("vault_search_canonical", async () =>
          admin.from("neural_canonical_note_versions")
            .select("id,concept_id,version,title,body_markdown,published_at")
            .eq("status", "published")
            .order("concept_id", { ascending: true })
        ),
        getVaultAnnotations()
      ]);
      if (canonicalError) fail(500, "vault_read_failed");

      const canonicalByConcept = new Map(
        (canonicalRows ?? []).map((row: any) => [String(row.concept_id), row])
      );
      const annotationsByConcept = new Map<string, any[]>();
      for (const row of annotations) {
        const conceptId = String(row.concept_id);
        const list = annotationsByConcept.get(conceptId) ?? [];
        list.push(row);
        annotationsByConcept.set(conceptId, list);
      }

      const normalize = (value: unknown) => String(value ?? "").toLocaleLowerCase();
      const concepts = Array.isArray(catalog.body?.concepts) ? catalog.body.concepts : [];
      const results = concepts.flatMap((concept: any, catalogOrder: number) => {
        const conceptId = String(concept.conceptId);
        const canonical = canonicalByConcept.get(conceptId);
        const personal = annotationsByConcept.get(conceptId) ?? [];
        const fields = {
          label: normalize(concept.label),
          aliases: normalize((Array.isArray(concept.aliases) ? concept.aliases : []).join(" ")),
          subjectTags: normalize((Array.isArray(concept.subjectTags) ? concept.subjectTags : []).join(" ")),
          canonicalTitle: normalize(canonical?.title),
          canonicalBody: normalize(canonical?.body_markdown),
          personal: normalize(personal.map((row: any) => row.body_markdown).join(" "))
        };
        const matchedIn = Object.entries(fields)
          .filter(([, value]) => value.includes(q))
          .map(([field]) => field);
        if (!matchedIn.length) return [];

        const rank =
          (fields.label === q ? 0 : fields.label.includes(q) ? 1 : 10) +
          (fields.aliases.includes(q) ? 2 : 0) +
          (fields.subjectTags.includes(q) ? 3 : 0) +
          (fields.canonicalTitle.includes(q) ? 4 : 0) +
          (fields.personal.includes(q) ? 5 : 0) +
          (fields.canonicalBody.includes(q) ? 6 : 0);

        return [{
          conceptId,
          label: concept.label,
          aliases: Array.isArray(concept.aliases) ? concept.aliases : [],
          subjectTags: Array.isArray(concept.subjectTags) ? concept.subjectTags : [],
          matchedIn,
          canonicalNote: canonical ? {
            noteVersionId: canonical.id,
            version: canonical.version,
            title: canonical.title,
            publishedAt: canonical.published_at
          } : null,
          annotationCount: personal.length,
          rank,
          catalogOrder
        }];
      }).sort((a: any, b: any) =>
        a.rank - b.rank ||
        a.catalogOrder - b.catalogOrder ||
        String(a.conceptId).localeCompare(String(b.conceptId))
      ).slice(0, 50).map(({ rank, catalogOrder, ...row }: any) => row);

      return response(req, 200, {
        query: qRaw.trim(),
        count: results.length,
        results
      });
    }

    if (req.method === "GET" && path === "/vault/concepts") {
      if (url.search) fail(400, "query_not_supported");
      const [catalog, { data: canonicalRows, error: canonicalError }, annotations] = await Promise.all([
        getCatalog(),
        trustedRead("vault_canonical_index", async () =>
          admin.from("neural_canonical_note_versions")
            .select("id,concept_id,version,title,published_at")
            .eq("status", "published")
            .order("concept_id", { ascending: true })
        ),
        getVaultAnnotations()
      ]);
      if (canonicalError) fail(500, "vault_read_failed");

      const canonicalByConcept = new Map(
        (canonicalRows ?? []).map((row: any) => [String(row.concept_id), row])
      );
      const annotationCounts = new Map<string, number>();
      for (const row of annotations) {
        const conceptId = String(row.concept_id);
        annotationCounts.set(conceptId, (annotationCounts.get(conceptId) ?? 0) + 1);
      }

      const concepts = Array.isArray(catalog.body?.concepts)
        ? catalog.body.concepts.map((concept: any) => {
            const canonical = canonicalByConcept.get(String(concept.conceptId));
            return {
              conceptId: concept.conceptId,
              label: concept.label,
              aliases: Array.isArray(concept.aliases) ? concept.aliases : [],
              subjectTags: Array.isArray(concept.subjectTags) ? concept.subjectTags : [],
              canonicalNote: canonical ? {
                noteVersionId: canonical.id,
                version: canonical.version,
                title: canonical.title,
                publishedAt: canonical.published_at
              } : null,
              annotationCount: annotationCounts.get(String(concept.conceptId)) ?? 0
            };
          })
        : [];

      return response(req, 200, {
        catalogVersion: catalog.version,
        count: concepts.length,
        concepts
      });
    }

    const vaultConceptMatch = path.match(/^\/vault\/concepts\/([^/]{1,480})$/);
    if (req.method === "GET" && vaultConceptMatch) {
      if (url.search) fail(400, "query_not_supported");
      let conceptId;
      try { conceptId = identifier(decodeURIComponent(vaultConceptMatch[1])); }
      catch { fail(400, "invalid_identifier"); }
      const [
        { data: concept, error: conceptError },
        { data: canonical, error: canonicalError },
        { data: annotations, error: annotationError }
      ] = await Promise.all([
        admin.rpc("neural_catalog_concept", { p_concept_id: conceptId }),
        trustedRead("vault_canonical_note", async () =>
          admin.from("neural_canonical_note_versions")
            .select("id,concept_id,version,title,body_markdown,source_ids,content_sha256,published_at")
            .eq("concept_id", conceptId).eq("status", "published").maybeSingle()
        ),
        trustedRead("vault_concept_annotations", async () =>
          admin.from("neural_personal_annotations")
            .select("id,concept_id,body_markdown,anchor_note_version_id,revision,created_at,updated_at")
            .eq("learner_id", learnerId).eq("concept_id", conceptId)
            .order("updated_at", { ascending: false })
            .order("id", { ascending: true })
        )
      ]);
      if (conceptError || canonicalError || annotationError) fail(500, "vault_read_failed");
      if (!concept) fail(404, "vault_concept_not_found");
      return response(req, 200, {
        concept,
        canonicalNote: canonical ? {
          noteVersionId: canonical.id,
          conceptId: canonical.concept_id,
          version: canonical.version,
          title: canonical.title,
          bodyMarkdown: canonical.body_markdown,
          sourceIds: canonical.source_ids,
          contentSha256: canonical.content_sha256,
          publishedAt: canonical.published_at
        } : null,
        annotations: (annotations ?? []).map((row: any) => ({
          annotationId: row.id,
          conceptId: row.concept_id,
          bodyMarkdown: row.body_markdown,
          anchorNoteVersionId: row.anchor_note_version_id,
          anchorState: row.anchor_note_version_id
            ? canonical
              ? row.anchor_note_version_id === canonical.id
                ? "current"
                : "canonical-updated"
              : "anchor-unavailable"
            : "unanchored",
          revision: row.revision,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      });
    }

    if (url.search) fail(400, "query_not_supported");

    if (req.method === "GET" && path === "/progress") return response(req, 200, summarize(await getEvents()));

    if (req.method === "POST" && path === "/exam-simulator/test-runs") {
      if (url.search) fail(400, "query_not_supported");
      if (!internalExamTester) fail(403, "internal_exam_test_forbidden");
      const input = await jsonBody(req);
      exactFields(input, ["ruleSetId"]);
      const ruleSetId = identifier(input.ruleSetId);
      const now = new Date().toISOString();

      const existing = await getOpenExamRun();
      if (existing) {
        const synced = await syncExamClock(existing, now);
        const existingIsTest = synced.state?.assembly?.testingOnly === true;
        if (synced.status === "in_progress" && !existingIsTest) {
          return response(req, 409, { error: "exam_production_run_already_open" });
        }
        if (synced.status === "in_progress" && synced.rule_set_id !== ruleSetId) {
          return response(req, 409, { error: "exam_run_already_open" });
        }
        if (synced.status === "in_progress" && existingIsTest) {
          return response(req, 200, await examRunView(synced, now, true));
        }
      }

      const { data: readiness, error: readinessError } = await admin.rpc("exam_mock_test_readiness", {
        p_rule_set_id: ruleSetId
      });
      if (readinessError) {
        const message = String(readinessError.message || "");
        if (message.includes("exam_rule_set_not_available")) fail(404, "exam_rule_set_not_available");
        fail(500, "exam_mock_test_readiness_failed");
      }
      if (readiness?.ready !== true) {
        return response(req, 409, {
          error: "exam_mock_test_not_ready",
          readiness: { ...readiness, generatedAt: now }
        });
      }

      const rule = await getExamRuleSet(ruleSetId);
      const runId = crypto.randomUUID();
      const assemblySeed = crypto.randomUUID();
      const { data: assembly, error: assemblyError } = await admin.rpc("exam_assemble_test_mock", {
        p_rule_set_id: ruleSetId,
        p_seed: assemblySeed
      });
      if (assemblyError) fail(500, "exam_mock_test_assembly_failed");
      if (assembly?.ready !== true || !Array.isArray(assembly?.questionVersionIds) || assembly?.testingOnly !== true) {
        return response(req, 409, {
          error: "exam_mock_test_not_ready",
          readiness: assembly
        });
      }

      const orderedIds = await seededQuestionOrder(
        assembly.questionVersionIds.map((value: unknown) => identifier(value)),
        assemblySeed
      );
      const baseState = createLockedSectionRuntimeRun({
        runId,
        examId: String(rule.exam_id),
        ruleSetId: String(rule.rule_set_id),
        caveats: [
          ...(Array.isArray(rule.rule_set?.caveats) ? rule.rule_set.caveats : []),
          "Internal engineering test content may include AI-test-reviewed items that are not production published."
        ],
        sections: rule.rule_set.rules.sections,
        totalQuestions: Number(rule.total_questions),
        totalDurationSeconds: Number(rule.total_duration_seconds),
        questionVersionIds: orderedIds,
        startedAt: now
      });
      const state = {
        ...structuredClone(baseState),
        assembly: {
          policyId: String(assembly.policyId || "human-published-plus-ai-test-reviewed-v1"),
          catalogVersion: Number(assembly.catalogVersion),
          ruleSetSha256: String(rule.rule_set_sha256),
          examBlueprintFidelity: assembly.examBlueprintFidelity === true,
          contentMixFidelity: String(assembly.contentMixFidelity || "exam-priority-planned-not-yet-validated"),
          testingOnly: true,
          productionEquivalent: false,
          aiTestOnlyQuestions: Number(assembly.aiTestOnlyQuestions ?? 0)
        }
      };
      const { data, error } = await admin.rpc("exam_create_run", {
        p_learner: learnerId,
        p_run: runId,
        p_exam_id: rule.exam_id,
        p_rule_set_id: rule.rule_set_id,
        p_engine_id: state.engineId,
        p_state: state,
        p_started_at: state.startedAt,
        p_scheduled_end_at: state.scheduledEndAt
      });
      if (error) {
        const message = String(error.message || "");
        if (message.includes("exam_run_already_open")) {
          const open = await getOpenExamRun();
          if (open?.state?.assembly?.testingOnly === true) {
            return response(req, 200, await examRunView(open, now, true));
          }
          return response(req, 409, { error: "exam_production_run_already_open" });
        }
        fail(500, "exam_run_create_failed");
      }
      const row = {
        id: data?.runId ?? runId,
        learner_id: learnerId,
        exam_id: rule.exam_id,
        rule_set_id: rule.rule_set_id,
        engine_id: state.engineId,
        status: data?.status ?? state.status,
        state_revision: Number(data?.revision ?? 0),
        state: data?.state ?? state,
        started_at: state.startedAt,
        scheduled_end_at: state.scheduledEndAt,
        completed_at: null,
        created_at: now,
        updated_at: now
      };
      return response(req, 200, await examRunView(row, now, false));
    }

    if (req.method === "POST" && path === "/exam-simulator/runs") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      exactFields(input, ["ruleSetId"]);
      const ruleSetId = identifier(input.ruleSetId);
      const now = new Date().toISOString();

      const existing = await getOpenExamRun();
      if (existing) {
        const synced = await syncExamClock(existing, now);
        if (synced.status === "in_progress" && synced.state?.assembly?.testingOnly === true) {
          return response(req, 409, { error: "exam_internal_test_run_already_open" });
        }
        if (synced.status === "in_progress" && synced.rule_set_id !== ruleSetId) {
          return response(req, 409, {
            error: "exam_run_already_open",
            run: await examRunView(synced, now, true)
          });
        }
        if (synced.status === "in_progress") {
          return response(req, 200, await examRunView(synced, now, true));
        }
      }

      const { data: readiness, error: readinessError } = await admin.rpc("exam_mock_readiness", {
        p_rule_set_id: ruleSetId
      });
      if (readinessError) {
        const message = String(readinessError.message || "");
        if (message.includes("exam_rule_set_not_available")) fail(404, "exam_rule_set_not_available");
        fail(500, "exam_mock_readiness_failed");
      }
      if (readiness?.ready !== true) {
        return response(req, 409, {
          error: "exam_mock_not_ready",
          readiness: {
            ...readiness,
            generatedAt: now
          }
        });
      }

      const rule = await getExamRuleSet(ruleSetId);
      const runId = crypto.randomUUID();
      const assemblySeed = crypto.randomUUID();
      const { data: assembly, error: assemblyError } = await admin.rpc("exam_assemble_mock", {
        p_rule_set_id: ruleSetId,
        p_seed: assemblySeed
      });
      if (assemblyError) fail(500, "exam_mock_assembly_failed");
      if (assembly?.ready !== true || !Array.isArray(assembly?.questionVersionIds)) {
        return response(req, 409, {
          error: "exam_mock_not_ready",
          readiness: assembly
        });
      }
      const orderedIds = await seededQuestionOrder(
        assembly.questionVersionIds.map((value: unknown) => identifier(value)),
        assemblySeed
      );
      const baseState = createLockedSectionRuntimeRun({
        runId,
        examId: String(rule.exam_id),
        ruleSetId: String(rule.rule_set_id),
        caveats: Array.isArray(rule.rule_set?.caveats) ? rule.rule_set.caveats : [],
        sections: rule.rule_set.rules.sections,
        totalQuestions: Number(rule.total_questions),
        totalDurationSeconds: Number(rule.total_duration_seconds),
        questionVersionIds: orderedIds,
        startedAt: now
      });
      const state = {
        ...structuredClone(baseState),
        assembly: {
          policyId: String(assembly.policyId || "distinct-published-randomized-v1"),
          catalogVersion: Number(assembly.catalogVersion),
          ruleSetSha256: String(rule.rule_set_sha256),
          examBlueprintFidelity: assembly.examBlueprintFidelity === true,
          contentMixFidelity: String(assembly.contentMixFidelity || "unstratified-reviewed-pool")
        }
      };
      const { data, error } = await admin.rpc("exam_create_run", {
        p_learner: learnerId,
        p_run: runId,
        p_exam_id: rule.exam_id,
        p_rule_set_id: rule.rule_set_id,
        p_engine_id: state.engineId,
        p_state: state,
        p_started_at: state.startedAt,
        p_scheduled_end_at: state.scheduledEndAt
      });
      if (error) {
        const message = String(error.message || "");
        if (message.includes("exam_run_already_open")) {
          const open = await getOpenExamRun();
          if (open) return response(req, 200, await examRunView(open, now, true));
        }
        fail(500, "exam_run_create_failed");
      }
      const row = {
        id: data?.runId ?? runId,
        learner_id: learnerId,
        exam_id: rule.exam_id,
        rule_set_id: rule.rule_set_id,
        engine_id: state.engineId,
        status: data?.status ?? state.status,
        state_revision: Number(data?.revision ?? 0),
        state: data?.state ?? state,
        started_at: state.startedAt,
        scheduled_end_at: state.scheduledEndAt,
        completed_at: null,
        created_at: now,
        updated_at: now
      };
      return response(req, 200, await examRunView(row, now, false));
    }

    if (req.method === "GET" && path === "/exam-simulator/runs/current") {
      if (url.search) fail(400, "query_not_supported");
      const row = await getOpenExamRun();
      if (!row) return response(req, 200, { contractId: "exam-run-view-v1", run: null });
      requireExamRunAccess(row);
      const now = new Date().toISOString();
      const synced = await syncExamClock(row, now);
      return response(req, 200, await examRunView(synced, now, true));
    }

    const examRunReadMatch = path.match(/^\/exam-simulator\/runs\/([a-zA-Z0-9-]+)$/);
    if (req.method === "GET" && examRunReadMatch) {
      if (url.search) fail(400, "query_not_supported");
      const now = new Date().toISOString();
      const row = await getExamRun(identifier(examRunReadMatch[1]));
      requireExamRunAccess(row);
      const synced = await syncExamClock(row, now);
      return response(req, 200, await examRunView(synced, now, true));
    }

    const examRunActionMatch = path.match(/^\/exam-simulator\/runs\/([a-zA-Z0-9-]+)\/(answer|review)$/);
    if (req.method === "POST" && examRunActionMatch) {
      if (url.search) fail(400, "query_not_supported");
      const runId = identifier(examRunActionMatch[1]);
      const action = examRunActionMatch[2];
      const input = await jsonBody(req);
      const now = new Date().toISOString();

      if (action === "answer") {
        exactFields(input, ["requestId", "expectedRevision", "questionVersionId", "optionId"]);
      } else {
        exactFields(input, ["requestId", "expectedRevision", "questionVersionId", "markedForReview"]);
      }
      const requestId = identifier(input.requestId);
      const expectedRevision = integer(input.expectedRevision, 0, 1000000);
      const questionVersionId = identifier(input.questionVersionId);
      const optionId = action === "answer"
        ? (input.optionId === null ? null : identifier(input.optionId))
        : null;
      const markedForReview = action === "review" ? input.markedForReview : null;
      if (action === "review" && typeof markedForReview !== "boolean") fail(400, "invalid_review_flag");

      const priorEvent = await getExamRunEvent(runId, requestId);
      if (priorEvent) {
        const sameIntent = action === "answer"
          ? priorEvent.event_type === "answer.set" &&
            priorEvent.event?.questionVersionId === questionVersionId &&
            priorEvent.event?.optionId === optionId
          : priorEvent.event_type === "review.set" &&
            priorEvent.event?.questionVersionId === questionVersionId &&
            priorEvent.event?.markedForReview === markedForReview;
        if (!sameIntent) fail(409, "exam_request_key_collision");
        let current = await getExamRun(runId);
        requireExamRunAccess(current);
        current = await syncExamClock(current, now);
        return response(req, 200, {
          ...(await examRunView(current, now, true)),
          idempotent: true
        });
      }

      let row = await getExamRun(runId);
      requireExamRunAccess(row);
      row = await syncExamClock(row, now);
      if (row.status !== "in_progress") {
        return response(req, 409, {
          error: "exam_run_completed",
          run: await examRunView(row, now, true)
        });
      }
      if (Number(row.state_revision) !== expectedRevision) {
        return response(req, 409, {
          error: "exam_revision_conflict",
          run: await examRunView(row, now, true)
        });
      }

      let nextState: any;
      let event: any;
      let eventType: string;
      try {
        if (action === "answer") {
          if (optionId !== null) {
            const catalogData = await examCatalogQuestionMap();
            const question: any = catalogData.byVersion.get(questionVersionId);
            if (!question) fail(500, "exam_question_version_unavailable");
            if (!Array.isArray(question.options) ||
                !question.options.some((option: any) => option?.optionId === optionId)) {
              fail(400, "invalid_option");
            }
          }
          nextState = setExamAnswer(row.state, { questionVersionId, optionId, at: now });
          eventType = "answer.set";
          event = { questionVersionId, optionId, serverRecordedAt: now };
        } else {
          nextState = setExamReview(row.state, {
            questionVersionId,
            markedForReview,
            at: now
          });
          eventType = "review.set";
          event = {
            questionVersionId,
            markedForReview,
            serverRecordedAt: now
          };
        }
      } catch (transitionError) {
        const code = transitionError instanceof Error ? transitionError.message : "exam_transition_rejected";
        if (["section_locked", "future_section_locked", "question_not_in_exam_run", "exam_run_completed"].includes(code)) {
          return response(req, 409, {
            error: code,
            run: await examRunView(row, now, true)
          });
        }
        throw transitionError;
      }

      const { data, error } = await admin.rpc("exam_apply_transition", {
        p_learner: learnerId,
        p_run: runId,
        p_request_key: requestId,
        p_expected_revision: expectedRevision,
        p_event_type: eventType,
        p_event: event,
        p_next_state: nextState,
        p_occurred_at: now,
        p_completion_receipt: null
      });
      if (error) {
        const message = String(error.message || "");
        if (message.includes("exam_revision_conflict")) {
          const fresh = await getExamRun(runId);
          return response(req, 409, {
            error: "exam_revision_conflict",
            run: await examRunView(fresh, now, true)
          });
        }
        if (message.includes("exam_request_key_collision")) fail(409, "exam_request_key_collision");
        if (message.includes("exam_run_not_open")) fail(409, "exam_run_completed");
        fail(500, "exam_run_write_failed");
      }

      row = {
        ...row,
        state_revision: Number(data?.revision ?? expectedRevision + 1),
        status: String(data?.status ?? nextState.status),
        state: data?.state ?? nextState,
        updated_at: now
      };
      return response(req, 200, await examRunView(row, now, false));
    }

    const examRunCancelMatch = path.match(/^\/exam-simulator\/runs\/([a-zA-Z0-9-]+)\/cancel$/);
    if (req.method === "POST" && examRunCancelMatch) {
      if (url.search) fail(400, "query_not_supported");
      const runId = identifier(examRunCancelMatch[1]);
      const input = await jsonBody(req);
      exactFields(input, ["requestId", "expectedRevision"]);
      const requestId = identifier(input.requestId);
      const expectedRevision = integer(input.expectedRevision, 0, 1000000);
      const reason = "user_abandoned";
      const now = new Date().toISOString();

      const priorEvent = await getExamRunEvent(runId, requestId);
      if (priorEvent) {
        const sameIntent = priorEvent.event_type === "run.cancelled" &&
          priorEvent.event?.reason === reason;
        if (!sameIntent) fail(409, "exam_request_key_collision");
        const current = await getExamRun(runId);
        requireExamRunAccess(current);
        return response(req, 200, {
          ...(await examRunView(current, now, true)),
          idempotent: true
        });
      }

      let row = await getExamRun(runId);
      requireExamRunAccess(row);
      row = await syncExamClock(row, now);
      if (row.status === "completed") {
        return response(req, 409, {
          error: "exam_run_completed",
          run: await examRunView(row, now, true)
        });
      }
      if (row.status === "cancelled") {
        return response(req, 409, {
          error: "exam_run_cancelled",
          run: await examRunView(row, now, true)
        });
      }
      if (Number(row.state_revision) !== expectedRevision) {
        return response(req, 409, {
          error: "exam_revision_conflict",
          run: await examRunView(row, now, true)
        });
      }

      let nextState: any;
      try {
        nextState = cancelExamRun(row.state, { at: now, reason });
      } catch (transitionError) {
        const code = transitionError instanceof Error ? transitionError.message : "exam_transition_rejected";
        if (["exam_run_completed", "exam_run_cancelled", "exam_run_not_open"].includes(code)) {
          return response(req, 409, {
            error: code,
            run: await examRunView(row, now, true)
          });
        }
        throw transitionError;
      }

      const event = {
        reason,
        fromSectionIndex: row.state.currentSectionIndex,
        serverRecordedAt: now
      };
      const { data, error } = await admin.rpc("exam_apply_transition", {
        p_learner: learnerId,
        p_run: runId,
        p_request_key: requestId,
        p_expected_revision: expectedRevision,
        p_event_type: "run.cancelled",
        p_event: event,
        p_next_state: nextState,
        p_occurred_at: now,
        p_completion_receipt: null
      });
      if (error) {
        const message = String(error.message || "");
        if (message.includes("exam_revision_conflict")) {
          const fresh = await getExamRun(runId);
          return response(req, 409, {
            error: "exam_revision_conflict",
            run: await examRunView(fresh, now, true)
          });
        }
        if (message.includes("exam_request_key_collision")) fail(409, "exam_request_key_collision");
        if (message.includes("exam_run_not_open")) fail(409, "exam_run_cancelled");
        fail(500, "exam_run_cancel_failed");
      }

      row = {
        ...row,
        state_revision: Number(data?.revision ?? expectedRevision + 1),
        status: String(data?.status ?? nextState.status),
        state: data?.state ?? nextState,
        updated_at: now
      };
      return response(req, 200, await examRunView(row, now, false));
    }

    if (req.method === "GET" && path === "/exam-simulator/readiness") {
      const rawRuleSetId = new URL(req.url).searchParams.get("ruleSetId");
      if (!rawRuleSetId) fail(400, "exam_rule_set_required");
      const ruleSetId = identifier(rawRuleSetId);
      const { data, error } = await admin.rpc("exam_mock_readiness", {
        p_rule_set_id: ruleSetId
      });
      if (error) {
        const message = String(error.message || "");
        if (message.includes("exam_rule_set_not_available")) fail(404, "exam_rule_set_not_available");
        fail(500, "exam_mock_readiness_failed");
      }
      return response(req, 200, {
        ...data,
        generatedAt: new Date().toISOString()
      });
    }

    if (req.method === "GET" && path === "/exam-dna") {
      const examParam = new URL(req.url).searchParams.get("examId");
      const examId = examParam === null || examParam === "" ? null : identifier(examParam);
      const { data, error } = await admin.rpc("exam_dna_observations", {
        p_exam_id: examId
      });
      if (error) fail(500, "exam_dna_projection_failed");
      return response(req, 200, {
        ...data,
        generatedAt: new Date().toISOString()
      });
    }

    if (req.method === "GET" && path === "/diagnostics/mistakes") {
      const [{ data, error }, catalog] = await Promise.all([
        admin.rpc("study_mistake_evidence", { p_learner: learnerId }),
        getCatalog()
      ]);
      if (error) fail(500, "mistake_evidence_projection_failed");

      const conceptMap = new Map(
        (Array.isArray(catalog.body?.concepts) ? catalog.body.concepts : [])
          .map((concept: any) => [String(concept.conceptId), concept])
      );
      const publishedQuestionMap = new Map(
        publishedQuestions(catalog.body)
          .map((question: any) => [String(question.questionVersionId), question])
      );

      const fingerprints = (Array.isArray(data?.fingerprints) ? data.fingerprints : []).map((row: any) => {
        const conceptId = String(row.conceptId ?? "");
        const concept = conceptMap.get(conceptId);
        const episodes = (Array.isArray(row.episodes) ? row.episodes : []).map((episode: any) => {
          const currentQuestion = publishedQuestionMap.get(String(episode.questionVersionId ?? ""));
          return {
            ...episode,
            currentQuestion: currentQuestion ? {
              questionVersionId: currentQuestion.questionVersionId,
              stem: currentQuestion.stem
            } : null
          };
        });
        const uncertaintyReasons = ["error-cause-not-observed", "transfer-error-pattern-not-modeled"];
        if (Number(row.affectedQuestionVersions ?? 0) < 2) {
          uncertaintyReasons.push("single-question-version-error-evidence");
        }
        if (!episodes.some((episode: any) => Number.isInteger(episode.memoryRating))) {
          uncertaintyReasons.push("no-error-memory-self-report");
        }

        return {
          conceptId,
          label: concept?.label ?? conceptId,
          aliases: Array.isArray(concept?.aliases) ? concept.aliases : [],
          subjectTags: Array.isArray(concept?.subjectTags) ? concept.subjectTags : [],
          observed: {
            ...row,
            episodes
          },
          interpretation: {
            status: "observational-only",
            causeInferenceEnabled: false,
            causes: []
          },
          uncertainty: {
            reasons: uncertaintyReasons
          }
        };
      });

      return response(req, 200, {
        generatedAt: new Date().toISOString(),
        contractId: data?.contractId ?? "mistake-observation-v1",
        scope: "observed-mistake-evidence",
        causeInferenceEnabled: false,
        fingerprints
      });
    }

    if (req.method === "GET" && path === "/diagnostics/concepts") {
      const [{ data, error }, catalog] = await Promise.all([
        admin.rpc("study_concept_evidence", { p_learner: learnerId }),
        getCatalog()
      ]);
      if (error) fail(500, "concept_evidence_projection_failed");

      const catalogConcepts = new Map(
        (Array.isArray(catalog.body?.concepts) ? catalog.body.concepts : [])
          .map((concept: any) => [String(concept.conceptId), concept])
      );

      const concepts = (Array.isArray(data?.concepts) ? data.concepts : []).map((row: any) => {
        const conceptId = String(row.conceptId ?? "");
        const concept = catalogConcepts.get(conceptId);
        const uncertaintyReasons: string[] = [];

        if (Number(row.distinctQuestionVersions ?? 0) < 2) {
          uncertaintyReasons.push("single-question-version-only");
        }
        if (Number(row.repeatAttemptCount ?? 0) < 1) {
          uncertaintyReasons.push("no-repeat-retrieval");
        }
        if (Number(row.ratedAttempts ?? 0) === 0) {
          uncertaintyReasons.push("no-memory-self-report");
        } else if (Number(row.ratedAttempts ?? 0) < Number(row.totalAttempts ?? 0)) {
          uncertaintyReasons.push("partial-memory-self-report");
        }
        uncertaintyReasons.push("transfer-evidence-not-modeled");
        if (!concept) uncertaintyReasons.push("concept-not-in-current-catalog");

        return {
          conceptId,
          label: concept?.label ?? conceptId,
          aliases: Array.isArray(concept?.aliases) ? concept.aliases : [],
          subjectTags: Array.isArray(concept?.subjectTags) ? concept.subjectTags : [],
          observed: row,
          inference: {
            status: "withheld",
            knowledgeState: "unestimated",
            mastery: null,
            forgetting: null,
            confidence: null
          },
          uncertainty: {
            reasons: uncertaintyReasons,
            distinctQuestionVersions: Number(row.distinctQuestionVersions ?? 0),
            repeatAttemptCount: Number(row.repeatAttemptCount ?? 0),
            ratingCoverage: row.ratingCoverage ?? null
          }
        };
      });

      return response(req, 200, {
        generatedAt: new Date().toISOString(),
        contractId: data?.contractId ?? "concept-observation-v1",
        scope: "observed-concept-evidence",
        inferenceEnabled: false,
        concepts
      });
    }

    if (req.method === "GET" && path === "/revision/policy-evaluation") {
      const { data, error } = await admin.rpc("study_schedule_policy_outcomes", {
        p_learner: learnerId
      });
      if (error) fail(500, "schedule_policy_outcomes_failed");
      return response(req, 200, {
        generatedAt: new Date().toISOString(),
        scope: "descriptive-schedule-policy-outcomes",
        causal: false,
        livePolicyId: "bootstrap-binary-v1",
        outcomes: Array.isArray(data) ? data : []
      });
    }

    if (req.method === "GET" && path === "/study-now/outcomes") {
      const { data, error } = await admin.rpc("study_recommendation_outcomes", {
        p_learner: learnerId
      });
      if (error) fail(500, "study_outcome_projection_failed");
      return response(req, 200, {
        generatedAt: new Date().toISOString(),
        scope: "descriptive-recommendation-outcomes",
        causal: false,
        outcomes: Array.isArray(data) ? data : []
      });
    }

    if (req.method === "POST" && path === "/study-now/start") {
      const input = await jsonBody(req);
      exactFields(input, ["availableMinutes"], ["maxItems"]);
      const availableMinutes = integer(input.availableMinutes, 5, 120);
      const maxItems = input.maxItems === undefined ? 50 : integer(input.maxItems, 1, 50);

      const existingSessionId = await getOpenSession();
      if (existingSessionId) {
        return response(req, 200, {
          plan: {
            generatedAt: new Date().toISOString(),
            availableMinutes,
            selectedCount: null,
            strategy: "resume-existing",
            provisional: true,
            resumedExisting: true
          },
          session: await sessionState(existingSessionId)
        });
      }

      await rebuildRevision();
      const [catalog, revisionRows] = await Promise.all([getCatalog(), getRevisionState()]);
      const published = new Map(
        publishedQuestions(catalog.body).map((question: any) => [question.questionVersionId, question])
      );
      const generatedAt = new Date().toISOString();
      const plan = buildStudyNowPlan(
        revisionRows,
        published,
        availableMinutes,
        maxItems,
        generatedAt
      );
      const ids = plan.selected.map((item: any) => item.questionVersionId);
      if (!ids.length) {
        return response(req, 200, { plan, session: null });
      }

      const proposedId = crypto.randomUUID();
      const { data, error } = await admin.rpc("study_start_recommendation_session", {
        p_learner: learnerId,
        p_id: proposedId,
        p_ids: ids,
        p_started: generatedAt,
        p_available_minutes: availableMinutes,
        p_plan: plan
      });
      if (error) fail(500, "study_write_failed");
      if (data?.error) fail(data.error === "session_not_found" ? 404 : 409, data.error);

      const actualId = String(data?.id || proposedId);
      if (data?.resumed === true || actualId !== proposedId) {
        return response(req, 200, {
          plan: {
            ...plan,
            selectedCount: null,
            strategy: "resume-existing",
            resumedExisting: true,
            recommendationId: null
          },
          session: await sessionState(actualId)
        });
      }

      return response(req, 200, {
        plan: {
          ...plan,
          resumedExisting: false,
          recommendationId: data?.recommendationId ?? null
        },
        session: await sessionState(actualId)
      });
    }

    if (req.method === "GET" && path === "/export") {
      const [{ data: sessions, error: sessionError }, events, bookmarks, recommendations, memoryJudgments, scheduleDecisions, vaultAnnotations] = await Promise.all([
        trustedRead("export_sessions", async () =>
          admin.from("study_sessions").select("id,position,closed,question_version_ids,created_at")
            .eq("learner_id", learnerId).order("created_at", { ascending: true }).order("id", { ascending: true })
        ),
        getEvents(),
        getBookmarks(),
        getRecommendationEvents(),
        getMemoryJudgments(),
        getScheduleDecisionEvents(),
        getVaultAnnotations()
      ]);
      if (sessionError) fail(500, "study_read_failed");
      return response(req, 200, {
        schemaVersion: 1,
        scope: "cloud-study",
        learnerId,
        events,
        bookmarks,
        sessions: sessions ?? [],
        recommendations,
        memoryJudgments,
        scheduleDecisions,
        neuralVault: {
          annotations: vaultAnnotations
        }
      });
    }

    if (req.method === "POST" && path === "/vault/annotations") {
      const input = await jsonBody(req, 24576);
      exactFields(input, ["conceptId", "bodyMarkdown"], ["anchorNoteVersionId"]);
      const conceptId = identifier(input.conceptId);
      if (typeof input.bodyMarkdown !== "string" ||
          new TextEncoder().encode(input.bodyMarkdown).byteLength > 20000) {
        fail(400, "invalid_note_body");
      }
      const anchorNoteVersionId =
        input.anchorNoteVersionId === undefined || input.anchorNoteVersionId === null
          ? null
          : identifier(input.anchorNoteVersionId);
      const { data, error } = await admin.rpc("neural_create_annotation", {
        p_learner: learnerId,
        p_concept_id: conceptId,
        p_body_markdown: input.bodyMarkdown,
        p_anchor_note_version_id: anchorNoteVersionId
      });
      if (error) fail(500, "vault_write_failed");
      if (data?.error) fail(data.error === "neural_concept_unknown" ? 404 : 409, data.error);
      return response(req, 200, data);
    }

    const vaultAnnotationMatch = path.match(/^\/vault\/annotations\/([a-zA-Z0-9-]+)$/);
    if (req.method === "PATCH" && vaultAnnotationMatch) {
      const input = await jsonBody(req, 24576);
      exactFields(input, ["expectedRevision", "bodyMarkdown"]);
      if (typeof input.bodyMarkdown !== "string" ||
          new TextEncoder().encode(input.bodyMarkdown).byteLength > 20000) {
        fail(400, "invalid_note_body");
      }
      const { data, error } = await admin.rpc("neural_update_annotation", {
        p_learner: learnerId,
        p_annotation_id: identifier(vaultAnnotationMatch[1]),
        p_expected_revision: integer(input.expectedRevision, 1, 1000000),
        p_body_markdown: input.bodyMarkdown
      });
      if (error) fail(500, "vault_write_failed");
      if (data?.error) fail(data.error === "neural_annotation_not_found" ? 404 : 409, data.error);
      return response(req, 200, data);
    }

    if (req.method === "DELETE" && vaultAnnotationMatch) {
      const { data, error } = await admin.rpc("neural_delete_annotation", {
        p_learner: learnerId,
        p_annotation_id: identifier(vaultAnnotationMatch[1])
      });
      if (error) fail(500, "vault_write_failed");
      if (data?.error) fail(404, data.error);
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/memory-judgments") {
      const input = await jsonBody(req);
      exactFields(input, ["attemptId", "rating"]);
      const attemptId = identifier(input.attemptId);
      const rating = integer(input.rating, 1, 4);
      const { data, error } = await admin.rpc("study_record_memory_judgment", {
        p_learner: learnerId,
        p_attempt: attemptId,
        p_rating: rating
      });
      if (error) fail(500, "memory_judgment_write_failed");
      if (data?.error) fail(data.error === "attempt_not_found" ? 404 : 409, data.error);

      try {
        const [{ data: attemptRows, error: attemptError }, { data: evidence, error: evidenceError }, revisionRows] =
          await Promise.all([
            trustedRead("shadow_attempt_history", async () =>
              admin.from("study_attempts").select("id,event,recorded_at")
                .eq("learner_id", learnerId)
                .order("recorded_at", { ascending: true })
                .order("id", { ascending: true })
            ),
            admin.rpc("study_fsrs_shadow_evidence", { p_learner: learnerId }),
            getRevisionState()
          ]);
        if (attemptError || evidenceError) throw new Error("shadow_evidence_unavailable");

        const questionVersionId = String(data?.questionVersionId || "");
        const questionAttempts = (attemptRows ?? []).filter(
          (row: any) => String(row.event?.questionVersionId || "") === questionVersionId
        );
        const latestAttempt = questionAttempts.at(-1);
        if (latestAttempt?.id === attemptId) {
          const generatedAt = new Date().toISOString();
          const shadow = buildFsrsShadowSchedule(evidence ?? {}, revisionRows, generatedAt);
          const item = shadow?.items?.find(
            (candidate: any) => candidate.questionVersionId === questionVersionId
          );
          if (item) {
            await recordScheduleDecision({
              attemptId,
              policyId: "fsrs-shadow",
              policyVersion: 1,
              role: "shadow",
              configVersion: FSRS_SHADOW_ENGINE.configVersion,
              proposedDueAt: item.fsrsDueAt,
              decision: {
                engine: FSRS_SHADOW_ENGINE,
                ratedReviewCount: item.ratedReviewCount,
                stability: item.stability,
                difficulty: item.difficulty,
                scheduledDays: item.scheduledDays,
                reps: item.reps,
                lapses: item.lapses,
                state: item.state,
                liveDueAt: item.liveDueAt,
                dueDeltaMs: item.dueDeltaMs
              }
            });
          }
        }
      } catch (shadowError) {
        console.warn(JSON.stringify({
          event: "fsrs_shadow_decision_deferred",
          code: shadowError instanceof Error ? shadowError.message : "shadow_decision_failed"
        }));
      }

      return response(req, 200, data);
    }

    const sessionMatch = path.match(/^\/sessions\/([a-zA-Z0-9-]+)$/);
    if (req.method === "GET" && sessionMatch) return response(req, 200, await sessionState(sessionMatch[1]));

    if (req.method === "POST" && path === "/sessions") {
      const input = await jsonBody(req);
      exactFields(input, [], ["limit", "filter"]);
      const limit = input.limit === undefined ? 15 : integer(input.limit, 1, 50);
      const filter = input.filter === undefined ? "all" : String(input.filter);
      if (!["all", "incorrect", "bookmarks"].includes(filter)) fail(400, "invalid_filter");
      const list = await questions(filter);
      const ids = list.slice(0, limit).map((q: any) => q.questionVersionId);
      if (!ids.length) fail(409, "no_published_questions");
      const id = crypto.randomUUID();
      const { data, error } = await admin.rpc("study_start_session", {
        p_learner: learnerId, p_id: id, p_ids: ids, p_started: new Date().toISOString()
      });
      if (error) fail(500, "study_write_failed");
      if (data?.error) fail(data.error === "session_not_found" ? 404 : 409, data.error);
      return response(req, 200, await sessionState(data?.id || id));
    }

    if (req.method === "POST" && path === "/bookmarks") {
      const input = await jsonBody(req);
      exactFields(input, ["questionVersionId", "bookmarked"]);
      const questionVersionId = identifier(input.questionVersionId);
      if (typeof input.bookmarked !== "boolean") fail(400, "invalid_bookmark");
      if (input.bookmarked) {
        const available = await questions("all");
        if (!available.some((q: any) => q.questionVersionId === questionVersionId)) fail(404, "question_not_available");
        const { error } = await admin.from("study_bookmarks").upsert(
          { learner_id: learnerId, question_version_id: questionVersionId },
          { onConflict: "learner_id,question_version_id", ignoreDuplicates: true }
        );
        if (error) fail(500, "study_write_failed");
      } else {
        const { error } = await admin.from("study_bookmarks").delete()
          .eq("learner_id", learnerId).eq("question_version_id", questionVersionId);
        if (error) fail(500, "study_write_failed");
      }
      return response(req, 200, { questionVersionId, bookmarked: input.bookmarked });
    }

    const actionMatch = path.match(/^\/sessions\/([a-zA-Z0-9-]+)\/(answer|next|cancel)$/);
    if (req.method === "POST" && actionMatch) {
      const sessionId = actionMatch[1];
      const action = actionMatch[2];
      const input = await jsonBody(req);

      if (action === "cancel") {
        exactFields(input, []);
        const { data, error } = await admin.rpc("study_cancel_session", { p_learner: learnerId, p_session: sessionId });
        if (error) fail(500, "study_write_failed");
        if (data?.error) fail(data.error === "session_not_found" ? 404 : 409, data.error);
        return response(req, 200, await sessionState(sessionId));
      }

      if (action === "next") {
        exactFields(input, ["position"]);
        const position = integer(input.position, 0, 49);
        const { data, error } = await admin.rpc("study_advance_session", {
          p_learner: learnerId, p_session: sessionId, p_position: position, p_started: new Date().toISOString()
        });
        if (error) fail(500, "study_write_failed");
        if (data?.error) fail(data.error === "session_not_found" ? 404 : 409, data.error);
        return response(req, 200, await sessionState(sessionId));
      }

      exactFields(input, ["requestId", "position", "optionId"]);
      const requestId = identifier(input.requestId);
      const optionId = identifier(input.optionId);
      const position = integer(input.position, 0, 49);

      const [{ data: session, error: sessionError }, catalog] = await Promise.all([
        trustedRead("answer_session", async () =>
          admin.from("study_sessions").select("id,position,closed,question_version_ids,question_started_at")
            .eq("id", sessionId).eq("learner_id", learnerId).maybeSingle()
        ),
        getCatalog()
      ]);
      if (sessionError) fail(500, "study_read_failed");
      if (!session) fail(404, "session_not_found");
      const qid = (session.question_version_ids as string[])[position];
      const q = publishedQuestions(catalog.body).find((item: any) => item.questionVersionId === qid);
      if (!q) fail(409, "question_no_longer_published");
      if (!q.options.some((option: any) => option.optionId === optionId)) fail(400, "invalid_option");
      const primary = q.conceptLinks?.find((link: any) => link.role === "primary");
      if (!primary?.conceptId) fail(500, "catalog_invalid");

      const now = Date.now();
      const started = new Date(session.question_started_at).getTime();
      const event = {
        schemaVersion: 1,
        type: "question.answered",
        eventId: crypto.randomUUID(),
        learnerId,
        questionVersionId: q.questionVersionId,
        conceptId: primary.conceptId,
        occurredAt: new Date(now).toISOString(),
        correct: q.answerOptionId === optionId,
        durationMs: Math.max(0, Number.isFinite(started) ? now - started : 0)
      };
      const sources = (catalog.body.sources || [])
        .filter((source: any) => q.sourceIds?.includes(source.sourceId))
        .map((source: any) => ({
          sourceId: source.sourceId, title: source.title, url: source.url ?? null, version: source.version
        }));
      const receipt = {
        event,
        selectedOptionId: optionId,
        answerOptionId: q.answerOptionId,
        explanation: q.explanation,
        sources,
        catalogVersion: catalog.version
      };
      const { data, error } = await admin.rpc("study_record_attempt", {
        p_learner: learnerId,
        p_session: sessionId,
        p_request_key: requestId,
        p_position: position,
        p_option: optionId,
        p_event: event,
        p_receipt: receipt
      });
      if (error) fail(500, "study_write_failed");
      if (data?.error) fail(data.error === "session_not_found" ? 404 : 409, data.error);

      const { error: revisionError } = await admin.rpc("study_rebuild_revision_state", {
        p_learner: learnerId,
        p_question_version_id: q.questionVersionId
      });
      if (revisionError) {
        console.warn(JSON.stringify({
          event: "revision_projection_deferred",
          operation: "answer_projection",
          code: revisionError.code || "revision_projection_failed"
        }));
      } else {
        try {
          const revisionRows = await getRevisionState();
          const row = revisionRows.find(
            (candidate: any) => candidate.question_version_id === q.questionVersionId
          );
          if (row && row.evidence_last_event_id === event.eventId) {
            await recordScheduleDecision({
              attemptId: event.eventId,
              policyId: row.policy_id,
              policyVersion: row.policy_version,
              role: "authoritative",
              configVersion: row.policy_id + "@" + row.policy_version,
              proposedDueAt: row.due_at,
              decision: {
                projectionVersion: row.projection_version,
                attempts: row.attempts,
                correct: row.correct,
                incorrect: row.incorrect,
                consecutiveCorrect: row.consecutive_correct,
                latestCorrect: row.latest_correct,
                evidenceEventCount: row.evidence_event_count
              }
            });
          }
        } catch (decisionError) {
          console.warn(JSON.stringify({
            event: "authoritative_schedule_decision_deferred",
            code: decisionError instanceof Error ? decisionError.message : "schedule_decision_failed"
          }));
        }
      }

      return response(req, 200, data?.receipt ?? receipt);
    }

    fail(404, "route_not_found");
  } catch (error) {
    if (error instanceof ApiError) return response(req, error.status, { error: error.code });
    console.error("study-api internal error", error instanceof Error ? error.message : String(error));
    return response(req, 500, { error: "internal_error" });
  }
});
