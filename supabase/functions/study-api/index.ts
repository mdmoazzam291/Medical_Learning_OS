import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Rating, createEmptyCard, fsrs } from "npm:ts-fsrs@5.4.2";

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
  const grouped = new Map<string, any[]>();
  for (const review of evidence.reviews) {
    const questionVersionId = String(review.questionVersionId ?? "");
    if (!questionVersionId) fail(500, "invalid_fsrs_shadow_review");
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
  return {
    questionVersionId: q.questionVersionId,
    questionId: q.questionId,
    version: q.version,
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

    const getCatalog = async () => {
      const { data, error } = await trustedRead("catalog", async () =>
        admin.from("study_catalog").select("version,body").eq("id", 1).single()
      );
      if (error || !data) fail(500, "catalog_unavailable");
      return data as { version: number; body: any };
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
        memoryJudgment: null
      };
      if (session.closed) return result;
      const [{ body }, { data: attempt, error: attemptError }] = await Promise.all([
        getCatalog(),
        trustedRead("session_receipt", async () =>
          admin.from("study_attempts").select("id,receipt").eq("session_id", sessionId)
            .eq("learner_id", learnerId).eq("position", session.position).maybeSingle()
        )
      ]);
      if (attemptError) fail(500, "study_read_failed");
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
      if (!q) return { ...result, blocked: "question_no_longer_published", receipt: attempt?.receipt ?? null, memoryJudgment };
      return { ...result, question: learnerQuestion(q), receipt: attempt?.receipt ?? null, memoryJudgment };
    };

    const url = new URL(req.url);
    const path = routePath(url);

    if (req.method === "GET" && path === "/questions") {
      const filter = url.searchParams.get("filter") || "all";
      if ([...url.searchParams.keys()].some((key) => key !== "filter")) fail(400, "query_not_supported");
      return response(req, 200, { questions: await questions(filter) });
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
        shadowScheduleReason: shadowSchedule
          ? "real_memory_ratings_replayed"
          : "no_real_memory_ratings"
      });
    }

    if (url.search) fail(400, "query_not_supported");

    if (req.method === "GET" && path === "/progress") return response(req, 200, summarize(await getEvents()));

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
      const [{ data: sessions, error: sessionError }, events, bookmarks, recommendations, memoryJudgments] = await Promise.all([
        trustedRead("export_sessions", async () =>
          admin.from("study_sessions").select("id,position,closed,question_version_ids,created_at")
            .eq("learner_id", learnerId).order("created_at", { ascending: true }).order("id", { ascending: true })
        ),
        getEvents(),
        getBookmarks(),
        getRecommendationEvents(),
        getMemoryJudgments()
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
        memoryJudgments
      });
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
