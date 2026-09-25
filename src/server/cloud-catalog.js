import { createClient } from '@supabase/supabase-js';
import { validateCatalog } from '../domain/content.js';
import { validateCatalogTransition, CatalogTransitionError } from '../domain/catalog-transition.js';
import { ServiceError } from './study-service.js';

export const STUDY_PROJECT_URL = 'https://iyapppmeieqhflnzslao.supabase.co';

export function createStudyCloudClient({ url, secretKey }) {
  if (url !== STUDY_PROJECT_URL) throw new Error('Cloud study storage requires the dedicated project');
  if (!secretKey?.startsWith('sb_secret_')) throw new Error('Cloud study storage requires a server-only secret key');
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export class CloudCatalogStore {
  constructor(client) { this.client = client; }
  async read() {
    const { data, error } = await this.client.from('study_catalog').select('version,body').eq('id', 1).single();
    if (error || !data || !Number.isSafeInteger(data.version)) throw new ServiceError(503, 'cloud_catalog_unavailable');
    try { return { version: data.version, body: validateCatalog(data.body) }; }
    catch { throw new ServiceError(503, 'cloud_catalog_invalid'); }
  }
  async catalog() { return (await this.read()).body; }
  async importDraft(input) {
    const next = validateCatalog(input);
    // Authenticated medical/reference/rights reviewers are not implemented.
    // This operator CLI may prepare drafts, never publish or record approvals.
    if (next.questions.some(q => q.status !== 'draft' || q.reviews.length || q.publishedAt !== null))
      throw new ServiceError(409, 'authenticated_review_required');
    const previous = await this.read();
    try { validateCatalogTransition(previous.body, next); }
    catch (error) { if (error instanceof CatalogTransitionError) throw new ServiceError(409, error.code); throw error; }
    const { data, error } = await this.client.rpc('study_import_catalog', {
      p_expected: previous.version, p_body: next,
    });
    if (error || !data) throw new ServiceError(503, 'cloud_catalog_unavailable');
    if (data.error) throw new ServiceError(data.error === 'stale_catalog' ? 409 : 500,
      data.error === 'stale_catalog' ? data.error : 'cloud_catalog_invalid');
    return { version: data.version, published: 0 };
  }
}
