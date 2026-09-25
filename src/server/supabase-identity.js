import { createClient } from '@supabase/supabase-js';
import { ServiceError } from './study-service.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createSupabaseIdentity({ url, publishableKey, client } = {}) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url || '') || !publishableKey?.startsWith('sb_publishable_'))
    throw new Error('Valid Supabase URL and publishable key are required');
  const auth = client || createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return async token => {
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) throw new ServiceError(401, 'unauthorized');
    try {
      // getUser(token) checks the token with the project's Auth server. Never
      // trust a decoded JWT or a client-provided learner identifier here.
      const { data, error } = await auth.auth.getUser(token);
      if (error || !uuid.test(data?.user?.id || '')) throw new ServiceError(401, 'unauthorized');
      return data.user.id;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(503, 'identity_unavailable');
    }
  };
}
