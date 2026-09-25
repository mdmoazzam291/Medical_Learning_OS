import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { StudyService } from '../src/server/study-service.js';
import { CloudStudyService } from '../src/server/cloud-study-service.js';
import { CloudCatalogStore, createStudyCloudClient, STUDY_PROJECT_URL } from '../src/server/cloud-catalog.js';
import { createStudyApi } from '../src/server/http-api.js';
import { createSupabaseIdentity } from '../src/server/supabase-identity.js';
process.umask(0o077);
const storage = process.env.MLOS_STUDY_STORE || 'sqlite';
if (!['sqlite', 'supabase'].includes(storage)) throw new Error('Invalid MLOS_STUDY_STORE');
if (storage === 'supabase' && process.env.MLOS_AUTH_MODE !== 'supabase')
  throw new Error('Cloud study storage requires verified Supabase Auth');
if (process.env.MLOS_AUTH_MODE === 'supabase' && process.env.MLOS_SUPABASE_URL !== STUDY_PROJECT_URL)
  throw new Error('Account API must use the dedicated Medical Learning OS Supabase project');
const rawPath = process.env.MLOS_DB_PATH || '.local/study.sqlite';
const path = rawPath === ':memory:' ? rawPath : resolve(rawPath);
if (storage === 'sqlite' && path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
const localService = storage === 'sqlite' ? new StudyService(path) : null;
const client = storage === 'supabase' ? createStudyCloudClient({
  url: process.env.MLOS_SUPABASE_URL, secretKey: process.env.MLOS_SUPABASE_SECRET_KEY,
}) : null;
const service = storage === 'supabase'
  ? new CloudStudyService({
      client, catalog: () => new CloudCatalogStore(client).read(),
    })
  : localService;
const cloudIdentity = process.env.MLOS_AUTH_MODE === 'supabase'
  ? createSupabaseIdentity({ url: process.env.MLOS_SUPABASE_URL, publishableKey: process.env.MLOS_SUPABASE_PUBLISHABLE_KEY })
  : null;
const server = createStudyApi(service, cloudIdentity ? { authenticate: cloudIdentity } : {});
server.listen(Number(process.env.MLOS_API_PORT || 3001), '127.0.0.1', () => console.log(`Local study API: http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { localService?.close(); process.exit(0); }));
