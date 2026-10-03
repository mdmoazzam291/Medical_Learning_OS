import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const cloudflareHealthUrl = Deno.env.get("MLOS_CLOUDFLARE_EDGE_HEALTH_URL") ??
  "https://medical-learning-os-web.medicalos.workers.dev/__edge-health";
const renderHealthUrl = Deno.env.get("MLOS_RENDER_HEALTH_URL") ??
  "https://medical-learning-os-preview.onrender.com/healthz";
const githubRepo = "mdmoazzam291/Medical_Learning_OS";
const githubWorkflows = ["supabase-r2-backup.yml", "r2-storage-audit.yml", "supabase-r2-restore-drill.yml"];

type ProviderStatus = "healthy" | "degraded" | "unavailable" | "configured";
type ProviderResult = {
  provider: string;
  status: ProviderStatus;
  source: string;
  observedAt: string;
  metrics: Record<string, unknown>;
};
type DeliveryIntent = {
  idempotencyKey: string;
  alertId: string;
  provider: string;
  notificationKind: "opened" | "repeat" | "escalation" | "recovery";
  severity: "warning" | "critical";
  providerStatus: "healthy" | "degraded" | "unavailable";
  payload?: Record<string, unknown>;
  deliveryState?: "pending" | "failed" | "sent";
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    let body: any = null;
    try { body = await response.json(); } catch {}
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

async function readSecret(admin: any, name: string) {
  const { data, error } = await admin.rpc("owner_monitor_provider_secret_v1", { p_name: name });
  return error || typeof data !== "string" || !data ? null : data;
}

async function cloudflareProbe(): Promise<ProviderResult> {
  const observedAt = new Date().toISOString();
  const started = Date.now();
  try {
    const { response, body } = await fetchJson(cloudflareHealthUrl, {}, 6000);
    return {
      provider: "cloudflare",
      status: response.ok && body?.ok === true ? "healthy" : "degraded",
      source: "edge_health",
      observedAt,
      metrics: { httpStatus: response.status, latencyMs: Date.now() - started, service: body?.service ?? null, origin: body?.origin ?? null }
    };
  } catch (error) {
    return { provider: "cloudflare", status: "unavailable", source: "edge_health", observedAt, metrics: { error: String((error as Error)?.message || "probe_failed") } };
  }
}

async function renderProbe(): Promise<ProviderResult> {
  const observedAt = new Date().toISOString();
  const started = Date.now();
  try {
    const { response, body } = await fetchJson(renderHealthUrl, {}, 30000);
    return {
      provider: "render",
      status: response.ok && body?.status === "ok" ? "healthy" : "degraded",
      source: "healthz",
      observedAt,
      metrics: { httpStatus: response.status, latencyMs: Date.now() - started, service: body?.service ?? null }
    };
  } catch (error) {
    return { provider: "render", status: "unavailable", source: "healthz", observedAt, metrics: { error: String((error as Error)?.message || "probe_failed") } };
  }
}

async function r2Probe(): Promise<ProviderResult> {
  const observedAt = new Date().toISOString();
  const runs: Record<string, unknown>[] = [];
  try {
    for (const workflow of githubWorkflows) {
      const url = `https://api.github.com/repos/${githubRepo}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=1`;
      const { response, body } = await fetchJson(url, { headers: { "user-agent": "medical-learning-os-infra-monitor" } }, 6000);
      const run = Array.isArray(body?.workflow_runs) ? body.workflow_runs[0] : null;
      runs.push({ workflow, httpStatus: response.status, status: run?.status ?? null, conclusion: run?.conclusion ?? null, updatedAt: run?.updated_at ?? null, htmlUrl: run?.html_url ?? null });
    }
    const failed = runs.some((run: any) => run.httpStatus !== 200 || run.status !== "completed" || run.conclusion !== "success");
    return { provider: "r2", status: failed ? "degraded" : "healthy", source: "github_workflow_runs", observedAt, metrics: { workflows: runs } };
  } catch (error) {
    return { provider: "r2", status: "unavailable", source: "github_workflow_runs", observedAt, metrics: { workflows: runs, error: String((error as Error)?.message || "probe_failed") } };
  }
}

async function supabaseProbe(admin: any): Promise<ProviderResult> {
  const observedAt = new Date().toISOString();
  const started = Date.now();
  try {
    const [summary, storage] = await Promise.all([
      admin.rpc("owner_admin_access_summary_v1"),
      admin.storage.listBuckets()
    ]);
    const ok = !summary.error && !storage.error;
    return {
      provider: "supabase",
      status: ok ? "healthy" : "degraded",
      source: "service_role_runtime_probe",
      observedAt,
      metrics: {
        latencyMs: Date.now() - started,
        databaseRpc: summary.error ? "error" : "ok",
        storage: storage.error ? "error" : "ok",
        bucketCount: storage.error ? null : (storage.data ?? []).length
      }
    };
  } catch (error) {
    return { provider: "supabase", status: "unavailable", source: "service_role_runtime_probe", observedAt, metrics: { error: String((error as Error)?.message || "probe_failed") } };
  }
}

async function resendProbe(admin: any): Promise<ProviderResult> {
  const observedAt = new Date().toISOString();
  const apiKey = Deno.env.get("RESEND_API_KEY") || await readSecret(admin, "mlos_resend_api_key");
  if (!apiKey) {
    return { provider: "resend", status: "configured", source: "credential_required", observedAt, metrics: { readTelemetryConnected: false, endpoint: "GET /usage" } };
  }
  try {
    const { response, body } = await fetchJson("https://api.resend.com/usage", { headers: { authorization: `Bearer ${apiKey}` } }, 7000);
    if (response.status === 401 || response.status === 403) {
      return { provider: "resend", status: "configured", source: "credential_permission_required", observedAt, metrics: { readTelemetryConnected: false, httpStatus: response.status, endpoint: "GET /usage" } };
    }
    if (!response.ok) return { provider: "resend", status: "unavailable", source: "resend_usage_api", observedAt, metrics: { httpStatus: response.status } };
    const daily = body?.emails?.daily;
    const monthly = body?.emails?.monthly;
    const validQuota = (quota: any) => quota && Number.isSafeInteger(quota.used) && quota.used >= 0 &&
      (quota.limit === null || (Number.isSafeInteger(quota.limit) && quota.limit >= 0));
    if (!validQuota(daily) || !validQuota(monthly)) {
      return { provider: "resend", status: "unavailable", source: "resend_usage_api", observedAt, metrics: { readTelemetryConnected: true, httpStatus: response.status, error: "usage_response_invalid" } };
    }
    const dailyUsed = daily.used;
    const dailyLimit = daily.limit;
    const monthlyUsed = monthly.used;
    const monthlyLimit = monthly.limit;
    const dailyRatio = dailyLimit === null ? null : dailyLimit === 0 ? 1 : dailyUsed / dailyLimit;
    const monthlyRatio = monthlyLimit === null ? null : monthlyLimit === 0 ? 1 : monthlyUsed / monthlyLimit;
    const nearLimit = (dailyRatio !== null && dailyRatio >= 0.9) || (monthlyRatio !== null && monthlyRatio >= 0.9);
    return {
      provider: "resend",
      status: nearLimit ? "degraded" : "healthy",
      source: "resend_usage_api",
      observedAt,
      metrics: { readTelemetryConnected: true, dailyUsed, dailyLimit, monthlyUsed, monthlyLimit, dailyRatio, monthlyRatio, rateLimit: body?.rate_limit ?? null }
    };
  } catch (error) {
    return { provider: "resend", status: "unavailable", source: "resend_usage_api", observedAt, metrics: { readTelemetryConnected: true, error: String((error as Error)?.message || "probe_failed") } };
  }
}

async function sentryProbe(admin: any): Promise<ProviderResult> {
  const observedAt = new Date().toISOString();
  const authToken = Deno.env.get("SENTRY_AUTH_TOKEN") || await readSecret(admin, "mlos_sentry_auth_token");
  const org = Deno.env.get("SENTRY_ORG") || await readSecret(admin, "mlos_sentry_org");
  const project = Deno.env.get("SENTRY_PROJECT") || await readSecret(admin, "mlos_sentry_project");
  if (!authToken || !org || !project) {
    return { provider: "sentry", status: "configured", source: "credential_required", observedAt, metrics: { clientSdkConfigured: true, readTelemetryConnected: false, missing: [!authToken ? "auth_token" : null, !org ? "org" : null, !project ? "project" : null].filter(Boolean) } };
  }
  const base = (Deno.env.get("SENTRY_API_BASE_URL") || "https://sentry.io").replace(/\/$/, "");
  const headers = { authorization: `Bearer ${authToken}` };
  try {
    const [issuesResult, statsResult] = await Promise.all([
      fetchJson(`${base}/api/0/organizations/${encodeURIComponent(org)}/issues/?project=${encodeURIComponent(project)}&query=is%3Aunresolved&statsPeriod=24h&limit=25`, { headers }, 8000),
      fetchJson(`${base}/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/stats/?stat=received&resolution=1h`, { headers }, 8000)
    ]);
    if (!issuesResult.response.ok || !statsResult.response.ok) {
      return { provider: "sentry", status: "unavailable", source: "sentry_api", observedAt, metrics: { readTelemetryConnected: true, issuesHttpStatus: issuesResult.response.status, statsHttpStatus: statsResult.response.status } };
    }
    const issues = Array.isArray(issuesResult.body) ? issuesResult.body : [];
    const points = Array.isArray(statsResult.body) ? statsResult.body : [];
    const eventCount24h = points.reduce((sum: number, point: any) => sum + Number(Array.isArray(point) ? point[1] : 0), 0);
    const unresolvedSampleCount = issues.length;
    const noisy = unresolvedSampleCount >= 5 || eventCount24h >= 20;
    return {
      provider: "sentry",
      status: noisy ? "degraded" : "healthy",
      source: "sentry_api",
      observedAt,
      metrics: { readTelemetryConnected: true, unresolvedSampleCount, unresolvedSampleCappedAt: 25, eventCount24h, thresholds: { unresolvedIssues: 5, events24h: 20 } }
    };
  } catch (error) {
    return { provider: "sentry", status: "unavailable", source: "sentry_api", observedAt, metrics: { readTelemetryConnected: true, error: String((error as Error)?.message || "probe_failed") } };
  }
}

async function resolveAlertRecipient(admin: any) {
  const { data: owner, error: ownerError } = await admin
    .from("content_admin_account")
    .select("admin_user_id")
    .eq("singleton", true)
    .single();
  if (ownerError || !owner?.admin_user_id) throw new Error("alert_owner_unavailable");

  const { data, error } = await admin.auth.admin.getUserById(owner.admin_user_id);
  const email = data?.user?.email;
  if (error || typeof email !== "string" || !email.includes("@")) {
    throw new Error("alert_owner_email_unavailable");
  }
  return email;
}

async function sendAlertNotification(admin: any, intent: DeliveryIntent) {
  const apiKey = Deno.env.get("RESEND_API_KEY") || await readSecret(admin, "mlos_resend_api_key");
  const from = Deno.env.get("MLOS_ALERT_FROM") ?? "";
  if (!apiKey || !from) throw new Error("alert_delivery_not_configured");
  const to = await resolveAlertRecipient(admin);
  const provider = String(intent.provider || "provider").slice(0, 40);
  const severity = intent.severity === "critical" ? "CRITICAL" : "WARNING";
  const kind = String(intent.notificationKind || "update").slice(0, 20);
  const status = String(intent.providerStatus || "unknown").slice(0, 20);
  const subject = `[Medical Learning OS] ${severity}: ${provider} ${kind}`;
  const text = [
    "Medical Learning OS infrastructure alert",
    `Provider: ${provider}`,
    `Event: ${kind}`,
    `Severity: ${severity.toLowerCase()}`,
    `Observed status: ${status}`,
    "This message contains operational health metadata only."
  ].join("\n");

  const { response, body } = await fetchJson("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "Idempotency-Key": intent.idempotencyKey
    },
    body: JSON.stringify({ from, to: [to], subject, text })
  }, 8000);

  if (!response.ok) throw new Error(`resend_alert_http_${response.status}`);
  return typeof body?.id === "string" ? body.id : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!supabaseUrl || !secretKey) return json(500, { error: "server_configuration_error" });

  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const monitorKey = req.headers.get("x-mlos-monitor-key") || "";
  const { data: authorized, error: authError } = await admin.rpc("owner_monitor_cron_authorized_v1", { p_key: monitorKey });
  if (authError || authorized !== true) return json(401, { error: "monitor_unauthorized" });

  const probes = await Promise.all([
    cloudflareProbe(),
    renderProbe(),
    r2Probe(),
    supabaseProbe(admin),
    resendProbe(admin),
    sentryProbe(admin)
  ]);

  const receipts = [];
  const deliveryIntents: DeliveryIntent[] = [];
  for (const result of probes) {
    const { data, error } = await admin.rpc("owner_monitor_record_provider_v1", {
      p_provider: result.provider,
      p_observed_at: result.observedAt,
      p_status: result.status,
      p_source: result.source,
      p_metrics: result.metrics
    });
    receipts.push(error ? { provider: result.provider, error: "record_failed" } : data);
    if (!error && data?.deliveryIntent?.idempotencyKey) {
      deliveryIntents.push(data.deliveryIntent as DeliveryIntent);
    }
  }

  const deliveries = [];
  for (const intent of deliveryIntents) {
    try {
      const providerMessageId = await sendAlertNotification(admin, intent);
      const { data, error } = await admin.rpc("owner_monitor_record_notification_delivery_v1", {
        p_idempotency_key: intent.idempotencyKey,
        p_outcome: "sent",
        p_provider_message_id: providerMessageId,
        p_error_code: null
      });
      deliveries.push(error
        ? { idempotencyKey: intent.idempotencyKey, error: "delivery_evidence_record_failed" }
        : data);
    } catch (error) {
      const deliveryErrorCode = "delivery_failed";
      const { data, error: recordError } = await admin.rpc("owner_monitor_record_notification_delivery_v1", {
        p_idempotency_key: intent.idempotencyKey,
        p_outcome: "failed",
        p_provider_message_id: null,
        p_error_code: deliveryErrorCode
      });
      deliveries.push({
        idempotencyKey: intent.idempotencyKey,
        error: deliveryErrorCode,
        detail: String((error as Error)?.message || "alert_send_failed").slice(0, 120),
        evidence: recordError ? "record_failed" : data
      });
    }
  }

  return json(200, {
    contractId: "owner-infrastructure-monitor-v2",
    observedAt: new Date().toISOString(),
    providers: probes,
    receipts,
    deliveries
  });
});
