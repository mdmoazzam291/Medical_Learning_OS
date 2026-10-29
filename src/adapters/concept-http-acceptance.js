export const acceptanceOrigin = 'https://feat-admin-concept-drafts-20261029-medical-learning-os-web.medicalos.workers.dev';
export const acceptanceOrigins = Object.freeze([acceptanceOrigin, 'https://feat-admin-concept-acceptance-20261029-medical-learning-os-web.medicalos.workers.dev']);
const project = 'https://iyapppmeieqhflnzslao.supabase.co';
function fail(message) { const error = new Error('acceptance_failed'); error.acceptanceFailure = message; throw error; }
export async function runConceptHttpAcceptance({projectUrl, publishableKey, origin, role, suite = 'drafts', getSession, getMe, fetchFn = fetch}) {
  if (!acceptanceOrigins.includes(origin) || projectUrl !== project || !['admin','learner'].includes(role) || !['drafts','acceptance'].includes(suite)) fail('Unsupported test scope.');
  const session = await getSession();
  if (!session?.accessToken) fail('Sign in first.');
  const me = await getMe();
  if (typeof me?.isAdmin !== 'boolean' || me.isAdmin !== (role === 'admin')) fail('The signed-in account does not match the selected role.');
  const reports = [];
  const endpoint = project + '/functions/v1/owner-api/' + (suite === 'acceptance' ? 'concept-draft-accept' : 'concept-drafts');
  async function test(name, status, {method = 'GET', signed = true, path = '', errorCode} = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetchFn(endpoint + path, {method, headers: {
        apikey: publishableKey,
        ...(signed ? {Authorization: `Bearer ${session.accessToken}`} : {}),
        ...(method === 'POST' ? {'Content-Type':'application/json'} : {})
      }, ...(method === 'POST' ? {body:'{}'} : {}), signal:controller.signal, cache:'no-store'});
    } catch { fail(name + ': transport unavailable.'); } finally { clearTimeout(timer); }
    if (response.status !== status || response.headers.get('cache-control') !== 'no-store') fail(name + ': status/cache mismatch.');
    // A readable cross-origin response proves browser CORS enforcement succeeded.
    // Access-Control-Allow-Origin is not a CORS-exposed response header.
    let payload;
    try { payload = await response.json(); } catch { fail(name + ': invalid JSON.'); }
    if (errorCode && payload?.error !== errorCode) fail(name + ': error contract mismatch.');
    if (status === 200 && (payload?.contractId !== 'admin-concept-drafts-v1' || !Array.isArray(payload.concepts) || !Array.isArray(payload.drafts))) fail(name + ': inventory contract mismatch.');
    reports.push({name, status});
  }
  await test('anonymous GET',401,{signed:false,errorCode:'unauthorized'});
  await test('anonymous invalid POST',401,{signed:false,method:'POST',errorCode:'unauthorized'});
  if (role === 'learner') {
    await test('learner GET',403,{errorCode:'content_admin_required'});
    await test('learner invalid POST',403,{method:'POST',errorCode:'content_admin_required'});
  } else if (suite === 'acceptance') {
    await test('Admin acceptance method',405,{errorCode:'method_not_allowed'});
    await test('Admin invalid acceptance POST',400,{method:'POST',errorCode:'concept_accept_invalid'});
  } else {
    await test('Admin inventory',200);
    await test('Admin missing proposal',404,{path:'/00000000-0000-4000-8000-000000000000',errorCode:'concept_draft_not_found'});
    await test('Admin invalid POST',400,{method:'POST',errorCode:'concept_draft_invalid'});
  }
  return reports;
}
