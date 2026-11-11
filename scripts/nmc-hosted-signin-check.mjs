import assert from 'node:assert/strict';

const staging = 'https://vwtdwafjrraptrgeshzt.supabase.co';
const route = '/functions/v1/owner-api/foundation-objective-drafts';
const key = process.env.MLOS_STAGING_PUBLISHABLE_KEY;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function request(path, options = {}) {
  try {
    return await fetch(staging + path, {
      ...options,
      headers: { apikey: key, ...options.headers },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(`Could not reach staging at ${path}`);
  }
}

async function signIn(role, email, password) {
  const response = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, `${role} sign-in HTTP status`);
  const data = await response.json();
  if (typeof data.access_token !== 'string' || data.user?.email !== email) {
    throw new Error(`${role} sign-in returned an unexpected session`);
  }
  return data.access_token;
}

async function main() {
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? '')) {
    throw new Error('Set MLOS_STAGING_PUBLISHABLE_KEY to the staging publishable key');
  }
  const ownerEmail = required('MLOS_STAGING_OWNER_EMAIL');
  const learnerEmail = required('MLOS_STAGING_LEARNER_EMAIL');
  const ownerPassword = required('MLOS_STAGING_OWNER_PASSWORD');
  const learnerPassword = required('MLOS_STAGING_LEARNER_PASSWORD');
  if (ownerEmail === learnerEmail) throw new Error('Use two distinct staging accounts');

  const learner = await signIn('Learner', learnerEmail, learnerPassword);
  const denied = await request(route, { headers: { Authorization: `Bearer ${learner}` } });
  assert.equal(denied.status, 403, 'Learner preview HTTP status');
  const denial = await denied.json();
  if (denial?.error !== 'content_admin_required' || Object.keys(denial).length !== 1) {
    throw new Error('Learner preview did not return an error-only response');
  }

  const owner = await signIn('Owner', ownerEmail, ownerPassword);
  const allowed = await request(route, { headers: { Authorization: `Bearer ${owner}` } });
  assert.equal(allowed.status, 200, 'Owner preview HTTP status');
  const { namesOnlyPreview: preview } = await allowed.json();
  for (const [field, count] of Object.entries({ concepts: 91, headings: 2, aliases: 6, held: 1 })) {
    assert.equal(preview?.[field]?.length, count, `Owner preview ${field} count`);
  }
  const brownSequard = preview.concepts.find(({ label }) => label === 'Brown-Sequard syndrome');
  assert.deepEqual([...(brownSequard?.codes ?? [])].sort(), ['AN57.5', 'PY10.10']);
  console.log('Staging Owner preview and learner denial verified, including both Brown-Sequard references.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
