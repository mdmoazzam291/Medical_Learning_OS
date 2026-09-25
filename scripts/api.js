import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { StudyService } from '../src/server/study-service.js';
import { createStudyApi } from '../src/server/http-api.js';
import { createSupabaseIdentity } from '../src/server/supabase-identity.js';
process.umask(0o077);
const path = resolve(process.env.MLOS_DB_PATH || '.local/study.sqlite');
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
const service = new StudyService(path);
if (process.env.MLOS_AUTH_MODE === 'supabase' && process.env.MLOS_SUPABASE_URL !== 'https://iyapppmeieqhflnzslao.supabase.co')
  throw new Error('Account API must use the dedicated Medical Learning OS Supabase project');
const cloudIdentity = process.env.MLOS_AUTH_MODE === 'supabase'
  ? createSupabaseIdentity({ url: process.env.MLOS_SUPABASE_URL, publishableKey: process.env.MLOS_SUPABASE_PUBLISHABLE_KEY })
  : null;
const server = createStudyApi(service, cloudIdentity ? { authenticate: cloudIdentity } : {});
server.listen(Number(process.env.MLOS_API_PORT || 3001), '127.0.0.1', () => console.log(`Local study API: http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { service.close(); process.exit(0); }));
