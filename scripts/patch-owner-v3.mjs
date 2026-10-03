import { readFile, writeFile } from 'node:fs/promises';

async function patch(path, transform) {
  const before = await readFile(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`no_change:${path}`);
  await writeFile(path, after);
}

function once(text, needle, replacement, label) {
  const first = text.indexOf(needle);
  if (first < 0) throw new Error(`anchor_missing:${label}`);
  if (text.indexOf(needle, first + needle.length) >= 0) throw new Error(`anchor_not_unique:${label}`);
  return text.slice(0, first) + replacement + text.slice(first + needle.length);
}

const helperImport = 'import { checkRuntimeAccess } from "./_shared/runtime-access.ts";\n';
const runtimeBlock = (userExpr) => `\n    const runtimeAccess = await checkRuntimeAccess(admin, token, ${userExpr});\n    if (runtimeAccess?.reason === "account_suspended") fail(403, "account_suspended");\n    if (runtimeAccess?.allowed !== true) fail(401, String(runtimeAccess?.reason || "runtime_access_denied"));\n`;

await patch('supabase/functions/study-api/index.ts', (text) => {
  text = once(text,
    'import { createClient } from "npm:@supabase/supabase-js@2";\n',
    'import { createClient } from "npm:@supabase/supabase-js@2";\n' + helperImport,
    'study-import');
  const adminAnchor = '    const admin = createClient(supabaseUrl, secretKey, {\n      auth: { persistSession: false, autoRefreshToken: false }\n    });\n';
  text = once(text, adminAnchor, adminAnchor + runtimeBlock('learnerId'), 'study-runtime');
  const routeAnchor = '    const path = routePath(url);\n';
  text = once(text, routeAnchor, routeAnchor + `\n    if (req.method === "GET" && path === "/features") {\n      if (url.search) fail(400, "query_not_supported");\n      const { data, error } = await admin.rpc("learner_feature_entitlements_v1", { p_user: learnerId });\n      if (error || !data) fail(500, "feature_entitlements_unavailable");\n      return response(req, 200, data);\n    }\n`, 'study-features');
  return text;
});

await patch('supabase/functions/review-api/index.ts', (text) => {
  text = once(text,
    'import { createClient } from "npm:@supabase/supabase-js@2";\n',
    'import { createClient } from "npm:@supabase/supabase-js@2";\n' + helperImport,
    'review-import');
  const adminAnchor = '    const admin = createClient(supabaseUrl, secretKey, {\n      auth: { persistSession: false, autoRefreshToken: false }\n    });\n';
  text = once(text, adminAnchor, adminAnchor + runtimeBlock('reviewerId'), 'review-runtime');
  return text;
});

await patch('supabase/functions/retention-probe-api/index.ts', (text) => {
  text = once(text,
    'import { createClient } from "npm:@supabase/supabase-js@2";\n',
    'import { createClient } from "npm:@supabase/supabase-js@2";\n' + helperImport,
    'retention-import');
  const adminAnchor = '    const admin = createClient(supabaseUrl, secretKey, {\n      auth: { persistSession: false, autoRefreshToken: false }\n    });\n';
  text = once(text, adminAnchor, adminAnchor + runtimeBlock('learnerId'), 'retention-runtime');
  const routeAnchor = '    const path = routePath(url);\n';
  text = once(text, routeAnchor, routeAnchor + `\n    if (path === "/origin" || path === "/origin/start") {\n      const { data: featureAllowed, error: featureError } = await admin.rpc("learner_feature_allowed_v1", {\n        p_user: learnerId,\n        p_feature: "retention_origin_handoff"\n      });\n      if (featureError) fail(500, "feature_entitlement_unavailable");\n      if (featureAllowed !== true) fail(403, "feature_not_enabled");\n    }\n`, 'retention-feature-gate');
  return text;
});

await patch('supabase/functions/owner-api/index.ts', (text) => {
  text = once(text,
    'import { createClient } from "npm:@supabase/supabase-js@2";\n',
    'import { createClient } from "npm:@supabase/supabase-js@2";\n' + helperImport,
    'owner-import');
  const adminAnchor = '    const admin = createClient(supabaseUrl, secretKey, {\n      auth: { persistSession: false, autoRefreshToken: false }\n    });\n';
  text = once(text, adminAnchor, adminAnchor + runtimeBlock('authData.user.id'), 'owner-runtime');

  text = once(text,
    '      const [dashboardResult, storage, accessSummaryResult, snapshotsResult, edge, r2Backup, r2Audit, restoreDrill] = await Promise.all([\n        admin.rpc("owner_admin_dashboard_v1"),\n        admin.storage.listBuckets(),\n        admin.rpc("owner_admin_access_summary_v1"),\n        admin.rpc("owner_infrastructure_snapshots_v1"),\n        cloudflareHealth(),',
    '      const [dashboardResult, storage, accessSummaryResult, snapshotsResult, featureFlagsResult, alertsResult, edge, r2Backup, r2Audit, restoreDrill] = await Promise.all([\n        admin.rpc("owner_admin_dashboard_v1"),\n        admin.storage.listBuckets(),\n        admin.rpc("owner_admin_access_summary_v1"),\n        admin.rpc("owner_infrastructure_snapshots_v1"),\n        admin.rpc("owner_feature_flags_v1"),\n        admin.rpc("owner_infrastructure_alerts_v1"),\n        cloudflareHealth(),',
    'owner-dashboard-promise');

  text = once(text,
    '        ownerApi: { status: "healthy", version: "owner-api-v2" },',
    '        ownerApi: { status: "healthy", version: "owner-api-v3" },',
    'owner-version');

  text = once(text,
    '        owner: { userId: authData.user.id, email: authData.user.email ?? null, singleton: true },\n        learnerAdministration: accessSummaryResult.data,\n        infrastructure\n      });',
    '        owner: { userId: authData.user.id, email: authData.user.email ?? null, singleton: true },\n        learnerAdministration: accessSummaryResult.data,\n        featureFlags: featureFlagsResult.error ? { contractId: "owner-feature-flags-v1", flags: [] } : featureFlagsResult.data,\n        infrastructureAlerts: alertsResult.error ? { contractId: "owner-infrastructure-alerts-v1", openCount: null, alerts: [] } : alertsResult.data,\n        infrastructure\n      });',
    'owner-dashboard-return');

  const learnerActionAnchor = '    if (req.method === "POST" && path === "/learner-actions") {';
  const featureRoutes = `    if (req.method === "GET" && path === "/feature-flags") {\n      if (url.search) fail(400, "query_not_supported");\n      const { data, error } = await admin.rpc("owner_feature_flags_v1");\n      if (error) fail(500, "owner_feature_flags_unavailable");\n      return response(req, 200, data);\n    }\n\n    if (req.method === "POST" && path === "/feature-flags") {\n      if (url.search) fail(400, "query_not_supported");\n      const input = await jsonBody(req);\n      const allowedFields = new Set(["featureKey","audience","reason","confirmation","requestId"]);\n      if (Object.keys(input).some((key) => !allowedFields.has(key))) fail(400, "invalid_fields");\n      const featureKey = String(input.featureKey || "");\n      if (!/^[a-z][a-z0-9_]{2,63}$/.test(featureKey)) fail(400, "owner_feature_key_invalid");\n      const audience = String(input.audience || "");\n      if (!["all","beta","off"].includes(audience)) fail(400, "owner_feature_audience_invalid");\n      const reason = reasonValue(input.reason);\n      const requestId = uuidValue(input.requestId, "owner_request_id_invalid");\n      if (String(input.confirmation || "") !== "SET FEATURE AUDIENCE") fail(400, "owner_action_confirmation_required");\n      const { data, error } = await admin.rpc("owner_admin_set_feature_flag_v1", {\n        p_actor: authData.user.id,\n        p_feature: featureKey,\n        p_audience: audience,\n        p_reason: reason,\n        p_request_id: requestId\n      });\n      if (error) {\n        const message = String(error.message || "");\n        if (message.includes("owner_feature_not_found")) fail(404, "owner_feature_not_found");\n        if (message.includes("owner_feature_audience_invalid")) fail(400, "owner_feature_audience_invalid");\n        if (message.includes("owner_action_reason_invalid")) fail(400, "owner_action_reason_invalid");\n        if (message.includes("content_admin_required")) fail(403, "content_admin_required");\n        fail(500, "owner_feature_flag_write_failed");\n      }\n      return response(req, 200, data);\n    }\n\n`;
  text = once(text, learnerActionAnchor, featureRoutes + learnerActionAnchor, 'owner-feature-routes');
  return text;
});

await patch('src/adapters/cloud-owner.js', (text) => once(text,
  "    learnerAction(input) {\n      return request('/learner-actions', { method: 'POST', body: input });\n    }\n",
  "    learnerAction(input) {\n      return request('/learner-actions', { method: 'POST', body: input });\n    },\n    setFeatureFlag(input) {\n      return request('/feature-flags', { method: 'POST', body: input });\n    }\n",
  'cloud-owner-feature'));

await patch('web/owner-console.js', (text) => {
  const helperAnchor = 'function infrastructureRows(infra) {';
  const featureHelpers = `function featureFlagRows(featureFlags) {\n  const flags = Array.isArray(featureFlags?.flags) ? featureFlags.flags : [];\n  if (!flags.length) return '<p class="muted">No feature gates are registered.</p>';\n  return '<div class="owner-feature-list">' + flags.map(flag => \`<form class="owner-feature-form" data-owner-feature-form><div><strong>\${escape(flag.featureKey)}</strong><small>\${escape(flag.mappedSurface || '')}</small></div><select name="audience" aria-label="Audience for \${escape(flag.featureKey)}"><option value="all" \${flag.audience === 'all' ? 'selected' : ''}>All learners</option><option value="beta" \${flag.audience === 'beta' ? 'selected' : ''}>Beta learners only</option><option value="off" \${flag.audience === 'off' ? 'selected' : ''}>Off</option></select><input type="hidden" name="featureKey" value="\${escape(flag.featureKey)}"><input name="reason" minlength="10" maxlength="1000" required placeholder="Reason for this audience change"><input name="confirmation" required placeholder="Type SET FEATURE AUDIENCE"><button class="secondary" type="submit">Apply</button></form>\`).join('') + '</div>';\n}\n\nfunction alertRows(alerts) {\n  const rows = Array.isArray(alerts?.alerts) ? alerts.alerts.filter(item => item?.state === 'open') : [];\n  if (!rows.length) return '<p class="muted">No open infrastructure alerts.</p>';\n  return '<div class="owner-alert-list">' + rows.map(item => \`<article><span class="badge">\${escape(String(item.severity || 'warning').toUpperCase())}</span><strong>\${escape(item.provider || 'provider')}</strong><small>\${escape(item.status || '')} · first seen \${escape(dateTime(item.firstSeenAt))}</small></article>\`).join('') + '</div>';\n}\n\n`;
  text = once(text, helperAnchor, featureHelpers + helperAnchor, 'owner-ui-helpers');

  const aiAnchor = '    <section id="owner-ai" class="panel">';
  const featureSection = `    <section id="owner-features" class="panel">\n      <div class="section-heading"><div><span class="eyebrow">FEATURE ENTITLEMENTS</span><h2>Controlled beta exposure</h2><p>Audience is enforced server-side. Beta membership does not grant content-review authority.</p></div><span class="badge">SERVER GATED</span></div>\n      \${featureFlagRows(data?.featureFlags)}\n    </section>\n\n`;
  text = once(text, aiAnchor, featureSection + aiAnchor, 'owner-ui-feature-section');

  const infraRowsAnchor = '      ${infrastructureRows(infra)}\n      <p class="muted">Catalog freshness checkpoint:';
  text = once(text, infraRowsAnchor,
    '      ${infrastructureRows(infra)}\n      <div class="owner-status-block"><strong>Open infrastructure alerts</strong>${alertRows(data?.infrastructureAlerts)}</div>\n      <p class="muted">Catalog freshness checkpoint:',
    'owner-ui-alerts');

  const navAnchor = "    ['#owner-ai', 'AI Usage'],\n    ['#owner-infrastructure', 'Infrastructure']";
  text = once(text, navAnchor,
    "    ['#owner-features', 'Feature Gates'],\n    ['#owner-ai', 'AI Usage'],\n    ['#owner-infrastructure', 'Infrastructure']",
    'owner-ui-nav');

  const listenerAnchor = "app?.addEventListener('submit', event => {\n  const form = event.target.closest('#owner-learner-search-form');";
  const featureListener = `app?.addEventListener('submit', event => {\n  const form = event.target.closest('[data-owner-feature-form]');\n  if (!form) return;\n  event.preventDefault();\n  const input = Object.fromEntries(new FormData(form).entries());\n  const button = form.querySelector('button[type="submit"]');\n  if (button) button.disabled = true;\n  (async () => {\n    try {\n      await owner.setFeatureFlag({\n        featureKey: String(input.featureKey || ''),\n        audience: String(input.audience || ''),\n        reason: String(input.reason || ''),\n        confirmation: String(input.confirmation || ''),\n        requestId: crypto.randomUUID()\n      });\n      location.reload();\n    } catch (error) {\n      announce('Feature audience change was not applied. Check the reason and exact confirmation phrase.');\n      if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-console', operation: 'set_feature_flag', code: error?.code || null });\n      if (button) button.disabled = false;\n    }\n  })();\n});\n\n`;
  text = once(text, listenerAnchor, featureListener + listenerAnchor, 'owner-ui-feature-listener');
  return text;
});

console.log('Owner Operations V3 patches applied');
