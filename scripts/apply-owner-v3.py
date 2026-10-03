from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"anchor_count:{label}:{count}")
    return text.replace(old, new, 1)


def patch(path, fn):
    p = Path(path)
    before = p.read_text()
    after = fn(before)
    if after == before:
        raise RuntimeError(f"no_change:{path}")
    p.write_text(after)

IMPORT = 'import { checkRuntimeAccess } from "./_shared/runtime-access.ts";\n'
CREATE_CLIENT_IMPORT = 'import { createClient } from "npm:@supabase/supabase-js@2";\n'
ADMIN_BLOCK = '''    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
'''
ROUTE_BLOCK = '''    const url = new URL(req.url);
    const path = routePath(url);
'''


def runtime_block(user_expr):
    return f'''
    const runtimeAccess = await checkRuntimeAccess(admin, token, {user_expr});
    if (runtimeAccess?.reason === "account_suspended") fail(403, "account_suspended");
    if (runtimeAccess?.allowed !== true) fail(401, String(runtimeAccess?.reason || "runtime_access_denied"));
'''


def common_auth_patch(text, user_expr, label):
    text = replace_once(text, CREATE_CLIENT_IMPORT, CREATE_CLIENT_IMPORT + IMPORT, f'{label}-import')
    text = replace_once(text, ADMIN_BLOCK, ADMIN_BLOCK + runtime_block(user_expr), f'{label}-runtime')
    return text


def study(text):
    text = common_auth_patch(text, 'learnerId', 'study')
    feature_route = '''
    if (req.method === "GET" && path === "/features") {
      if (url.search) fail(400, "query_not_supported");
      const { data, error } = await admin.rpc("learner_feature_entitlements_v1", { p_user: learnerId });
      if (error || !data) fail(500, "feature_entitlements_unavailable");
      return response(req, 200, data);
    }
'''
    text = replace_once(text, ROUTE_BLOCK, ROUTE_BLOCK + feature_route, 'study-features')
    return text


def review(text):
    return common_auth_patch(text, 'reviewerId', 'review')


def retention(text):
    text = common_auth_patch(text, 'learnerId', 'retention')
    gate = '''
    if (path === "/origin" || path === "/origin/start") {
      const { data: featureAllowed, error: featureError } = await admin.rpc("learner_feature_allowed_v1", {
        p_user: learnerId,
        p_feature: "retention_origin_handoff"
      });
      if (featureError) fail(500, "feature_entitlement_unavailable");
      if (featureAllowed !== true) fail(403, "feature_not_enabled");
    }
'''
    text = replace_once(text, ROUTE_BLOCK, ROUTE_BLOCK + gate, 'retention-feature-gate')
    return text


def owner(text):
    text = common_auth_patch(text, 'authData.user.id', 'owner')
    anchor = '    if (req.method === "POST" && path === "/learner-actions") {'
    routes = '''    if (req.method === "GET" && path === "/feature-flags") {
      if (url.search) fail(400, "query_not_supported");
      const { data, error } = await admin.rpc("owner_feature_flags_v1");
      if (error) fail(500, "owner_feature_flags_unavailable");
      return response(req, 200, data);
    }

    if (req.method === "POST" && path === "/feature-flags") {
      if (url.search) fail(400, "query_not_supported");
      const input = await jsonBody(req);
      const allowedFields = new Set(["featureKey","audience","reason","confirmation","requestId"]);
      if (Object.keys(input).some((key) => !allowedFields.has(key))) fail(400, "invalid_fields");
      const featureKey = String(input.featureKey || "");
      if (!/^[a-z][a-z0-9_]{2,63}$/.test(featureKey)) fail(400, "owner_feature_key_invalid");
      const audience = String(input.audience || "");
      if (!["all","beta","off"].includes(audience)) fail(400, "owner_feature_audience_invalid");
      const reason = reasonValue(input.reason);
      const requestId = uuidValue(input.requestId, "owner_request_id_invalid");
      if (String(input.confirmation || "") !== "SET FEATURE AUDIENCE") fail(400, "owner_action_confirmation_required");
      const { data, error } = await admin.rpc("owner_admin_set_feature_flag_v1", {
        p_actor: authData.user.id,
        p_feature: featureKey,
        p_audience: audience,
        p_reason: reason,
        p_request_id: requestId
      });
      if (error) {
        const message = String(error.message || "");
        if (message.includes("owner_feature_not_found")) fail(404, "owner_feature_not_found");
        if (message.includes("owner_feature_audience_invalid")) fail(400, "owner_feature_audience_invalid");
        if (message.includes("owner_action_reason_invalid")) fail(400, "owner_action_reason_invalid");
        if (message.includes("content_admin_required")) fail(403, "content_admin_required");
        fail(500, "owner_feature_flag_write_failed");
      }
      return response(req, 200, data);
    }

    if (req.method === "GET" && path === "/infrastructure-alerts") {
      if (url.search) fail(400, "query_not_supported");
      const { data, error } = await admin.rpc("owner_infrastructure_alerts_v1");
      if (error) fail(500, "owner_infrastructure_alerts_unavailable");
      return response(req, 200, data);
    }

'''
    text = replace_once(text, anchor, routes + anchor, 'owner-v3-routes')
    return text

patch('supabase/functions/study-api/index.ts', study)
patch('supabase/functions/review-api/index.ts', review)
patch('supabase/functions/retention-probe-api/index.ts', retention)
patch('supabase/functions/owner-api/index.ts', owner)
print('Owner Operations V3 source transformation complete')
