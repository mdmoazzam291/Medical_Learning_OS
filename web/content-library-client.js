import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { cloudConfig } from '/web/cloud-config.js';
export const auth = createSupabaseAuth(cloudConfig);
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function request(path, body, retry = true) {
  const session = await auth.getSession();
  if (!session?.accessToken) throw Object.assign(new Error('Sign in to continue.'), { code: 'authentication_required' });
  const response = await fetch(cloudConfig.projectUrl + '/functions/v1/content-library-api' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {apikey:cloudConfig.publishableKey,Authorization:'Bearer '+session.accessToken,...(body === undefined ? {} : {'Content-Type':'application/json'})},
    body: body === undefined ? undefined : JSON.stringify(body), cache:'no-store'
  });
  if (response.status === 401 && retry) {
    const refreshed = await auth.getSession({forceRefresh:true});
    if (refreshed?.accessToken && refreshed.accessToken !== session.accessToken) return request(path,body,false);
  }
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed. Try again.'), { code: response.status === 401 ? 'authentication_required' : typeof data.error === 'string' && /^[a-z][a-z0-9_]{0,100}$/.test(data.error) ? data.error : 'request_failed', status: response.status });
  return data;
}
