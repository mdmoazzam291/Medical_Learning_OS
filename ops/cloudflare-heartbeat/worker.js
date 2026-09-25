// This Worker has no public health endpoint. Only Cloudflare Cron invokes it.
const projectUrl = 'https://iyapppmeieqhflnzslao.supabase.co';

export async function checkDatabase(env, request = fetch) {
  const key = env.MLOS_SUPABASE_SECRET_KEY;
  if (!key?.startsWith('sb_secret_')) throw new Error('Dedicated Supabase secret is missing');
  const response = await request(`${projectUrl}/rest/v1/study_catalog?select=version&limit=1`, {
    headers: { apikey: key, Accept: 'application/json', 'Cache-Control': 'no-store' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Database heartbeat failed: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || !Number.isSafeInteger(rows[0]?.version))
    throw new Error('Database heartbeat returned an invalid catalog version');
  return rows[0].version;
}

export default {
  fetch() { return new Response('Not found', { status: 404 }); },
  scheduled(_event, env, context) {
    context.waitUntil(checkDatabase(env));
  },
};
