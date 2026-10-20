// Navigation intent only: never store credentials or authorization decisions here.
const allowed = new Set(['/', '/web/medical', '/web/medical.html', '/web/library', '/web/library.html', '/web/exam', '/web/exam.html', '/web/vault', '/web/vault.html', '/web/workspace', '/web/workspace.html']);
const workspaceReturns = new Set(['home:progress','home:recent','study:mistakes','study:revision','exams:dna','exams:past','exams:autopsy','exams:rules','account:preferences','account:data']);
const key = 'mlos-learner-return-v1';
const maxAge = 30 * 60 * 1000;
export function safeLearnerDestination(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, 'https://medretica.invalid');
    if (url.origin !== 'https://medretica.invalid' || !allowed.has(url.pathname) || (url.hash && !/^#[a-z][a-z0-9-]{0,80}$/.test(url.hash)) || [...url.searchParams.keys()].some(k => /token|password|secret|^code$|^state$|^error/i.test(k))) return null;
    if (/^\/web\/workspace(?:\.html)?$/.test(url.pathname)) {
      if (url.searchParams.getAll('master').length !== 1 || url.searchParams.getAll('section').length !== 1 || [...url.searchParams.keys()].some(k => !['master','section'].includes(k)) || !workspaceReturns.has(url.searchParams.get('master') + ':' + url.searchParams.get('section'))) return null;
    }
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}
export function accountEntryHref(destination, create = false) {
  const params = new URLSearchParams({ returnTo: safeLearnerDestination(destination) || '/' });
  if (create) params.set('mode', 'create');
  return '/web/account.html?' + params;
}
export function createLearnerReturn({ storage, now = Date.now } = {}) {
  const clear = () => { try { storage?.removeItem(key); } catch { /* Optional navigation memory. */ } };
  const explicit = search => safeLearnerDestination(new URLSearchParams(search).get('returnTo'));
  return {
    clear,
    capture(search, isCallback) {
      const path = explicit(search);
      if (path) { try { storage?.setItem(key, JSON.stringify({ path, createdAt: now() })); } catch { /* Explicit URL still works for email sign-in. */ } }
      else if (new URLSearchParams(search).has('returnTo') || !isCallback) clear();
    },
    destination(search) {
      const path = explicit(search);
      if (path) return path;
      try {
        const saved = JSON.parse(storage?.getItem(key) || 'null');
        const age = now() - saved?.createdAt;
        if (Number.isFinite(age) && age >= 0 && age <= maxAge && safeLearnerDestination(saved?.path)) return safeLearnerDestination(saved.path);
      } catch { /* Return safely to Home when navigation memory is unavailable. */ }
      clear(); return '/';
    }
  };
}
