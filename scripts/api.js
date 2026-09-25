import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { StudyService } from '../src/server/study-service.js';
import { CloudStudyService } from '../src/server/cloud-study-service.js';
import { createStudyApi } from '../src/server/http-api.js';
import { createSupabaseIdentity } from '../src/server/supabase-identity.js';
process.umask(0o077);
const storage = process.env.MLOS_STUDY_STORE || 'sqlite';
if (!['sqlite', 'supabase'].includes(storage)) throw new Error('Invalid MLOS_STUDY_STORE');
if (storage === 'supabase' && process.env.MLOS_AUTH_MODE !== 'supabase')
  throw new Error('Cloud study storage requires verified Supabase Auth');
if (process.env.MLOS_AUTH_MODE === 'supabase' && process.env.MLOS_SUPABASE_URL !== 'https://iyapppmeieqhflnzslao.supabase.co')
  throw new Error('Account API must use the dedicated Medical Learning OS Supabase project');
if (storage === 'supabase' && !process.env.MLOS_SUPABASE_SECRET_KEY?.startsWith('sb_secret_'))
  throw new Error('Cloud study storage requires a server-only secret key');
const rawPath = process.env.MLOS_DB_PATH || '.local/study.sqlite';
const path = rawPath === ':memory:' ? rawPath : resolve(rawPath);
if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
const localService = new StudyService(path);
const service = storage === 'supabase'
  ? new CloudStudyService({
      client: createClient(process.env.MLOS_SUPABASE_URL, process.env.MLOS_SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
      catalog: () => localService.catalog(),
    })
  : localService;
const cloudIdentity = process.env.MLOS_AUTH_MODE === 'supabase'
  ? createSupabaseIdentity({ url: process.env.MLOS_SUPABASE_URL, publishableKey: process.env.MLOS_SUPABASE_PUBLISHABLE_KEY })
  : null;
const server = createStudyApi(service, cloudIdentity ? { authenticate: cloudIdentity } : {});
server.listen(Number(process.env.MLOS_API_PORT || 3001), '127.0.0.1', () => console.log(`Local study API: http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { localService.close(); process.exit(0); }));
