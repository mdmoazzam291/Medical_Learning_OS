import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export const INDEXNOW_KEY = '94df2900a699a7c8797e515d868f2010';
const homepage = 'https://medretica.com/';

async function verifyDeployment(key, expectedHomepage, fetchImpl) {
  const keyResponse = await fetchImpl(`${homepage}${key}.txt`, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== key) throw new Error('live_key_not_ready');
  const pageResponse = await fetchImpl(homepage, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!pageResponse.ok || (await pageResponse.text()).trim() !== expectedHomepage.trim()) throw new Error('homepage_deployment_not_ready');
}

export async function submitIndexNow({ key = INDEXNOW_KEY, expectedHomepage, fetchImpl = fetch, waitForDeployment = false } = {}) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('invalid_key');
  if (typeof expectedHomepage !== 'string' || !expectedHomepage.trim()) throw new Error('missing_expected_homepage');
  const attempts = waitForDeployment ? 20 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { await verifyDeployment(key, expectedHomepage, fetchImpl); break; }
    catch (error) {
      if (attempt === attempts - 1) throw error;
      await delay(15000);
    }
  }
  // A notification goes out only after matching the deployed page. Do not retry submissions.
  const response = await fetchImpl('https://api.indexnow.org/indexnow', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'medretica.com', key, keyLocation: `${homepage}${key}.txt`, urlList: [homepage] })
  });
  if (![200, 202].includes(response.status)) throw new Error(`submission_http_${response.status}`);
  return response.status;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const expectedHomepage = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
  const status = await submitIndexNow({ expectedHomepage, waitForDeployment: process.argv.includes('--wait') });
  console.log(`IndexNow notification received (HTTP ${status}); this does not confirm indexing or ranking.`);
}
