export async function checkRuntimeAccess(admin: any, token: string, userId: string) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return { allowed: false, reason: "session_claim_missing" };
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    const sessionId = typeof payload?.session_id === "string" ? payload.session_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      return { allowed: false, reason: "session_claim_missing" };
    }
    const { data, error } = await admin.rpc("learner_runtime_access_v1", {
      p_user: userId,
      p_session: sessionId
    });
    if (error || !data || typeof data !== "object") return { allowed: false, reason: "runtime_access_unavailable" };
    return data as any;
  } catch {
    return { allowed: false, reason: "session_claim_invalid" };
  }
}
