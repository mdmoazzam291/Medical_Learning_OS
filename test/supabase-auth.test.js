import test from "node:test";
import assert from "node:assert/strict";
import { learnerPrincipal, signInWithPassword, supabaseBrowserConfig } from "../src/adapters/supabase-auth.js";

test("Supabase browser config uses only publishable credentials", () => {
  const config = supabaseBrowserConfig();
  assert.equal(config.url, "https://iyapppmeieqhflnzslao.supabase.co");
  assert.match(config.publishableKey, /^sb_publishable_/);
});

test("authenticated Supabase UUID is the canonical learner principal", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(learnerPrincipal({ id }), { learnerId: id, authUserId: id });
});

test("password sign-in sends publishable key and no privileged secret", async () => {
  let observed;
  const fetchImpl = async (url, init) => {
    observed = { url, init };
    return { ok: true, json: async () => ({ access_token: "jwt" }) };
  };
  const result = await signInWithPassword("learner@example.test", "correct horse battery staple", { fetchImpl });
  assert.equal(result.access_token, "jwt");
  assert.match(observed.url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.match(observed.init.headers.apikey, /^sb_publishable_/);
  assert.equal("service_role" in observed.init.headers, false);
});
