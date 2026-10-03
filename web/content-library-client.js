import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { cloudConfig } from '/web/cloud-config.js';
export const auth = createSupabaseAuth(cloudConfig);
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function request(path, body, retry = true) {
  const session = await auth.getSession();
  if (!session?.accessToken) throw new Error('Sign in through Account to continue.');
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
  if (!response.ok) throw new Error(data.error || 'Request failed. Try again.');
  return data;
}
