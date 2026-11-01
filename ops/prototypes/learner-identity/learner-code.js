/**
 * Learner Code v1: OFFLINE DOMAIN FOUNDATION, NOT A LIVE ACCOUNT ENDPOINT.
 *
 * The canonical key remains the existing Auth user UUID. A Learner Code is only
 * a human-readable reference; never a login, authorization, or recovery proof.
 * Before deployment, the persistence boundary needs a separately reviewed,
 * private schema, authenticated server handler and managed-RLS acceptance.
 */
export const LEARNER_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const LEARNER_CODE_CONTRACT = 'learner-code-v1';
const SYMBOLS = 16;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMPACT = /^ML[0-9A-HJKMNP-TV-Z]{16}$/;
const CANONICAL = /^ML(?:-[0-9A-HJKMNP-TV-Z]{4}){4}$/;
const MAX_ALLOCATION_ATTEMPTS = 5;
const fail = code => { throw new TypeError(code); };

export function validAuthUserId(value) {
  return typeof value === 'string' && UUID.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
}

export function normalizeLearnerCode(value) {
  if (typeof value !== 'string' || value.length > 23) fail('learner_code_invalid');
  const upper = value.toUpperCase();
  if (!CANONICAL.test(upper) && !COMPACT.test(upper)) fail('learner_code_invalid');
  const symbols = upper.slice(2).replaceAll('-', '');
  return 'ML-' + [...Array(4)].map((_, i) => symbols.slice(i * 4, i * 4 + 4)).join('-');
}

export function generateLearnerCode(randomBytes = length => {
  if (!globalThis.crypto?.getRandomValues) fail('secure_random_unavailable');
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}) {
  if (typeof randomBytes !== 'function') fail('secure_random_unavailable');
  const bytes = randomBytes(SYMBOLS);
  if (!(bytes instanceof Uint8Array) || bytes.length !== SYMBOLS) fail('secure_random_invalid');
  // Uniform independent random bytes; masking 5 bits preserves uniform
  // distribution over 32 symbols. 16 symbols carry 80 bits of entropy.
  const symbols = [...bytes].map(byte => LEARNER_CODE_ALPHABET[byte & 31]).join('');
  return normalizeLearnerCode('ML' + symbols);
}

function verifyPersistedRow(row, authUserId) {
  if (row == null) return null;
  if (!row || typeof row !== 'object' || Array.isArray(row) ||
    !validAuthUserId(row.authUserId) || row.authUserId.toLowerCase() !== authUserId ||
    typeof row.learnerCode !== 'string') fail('learner_code_readback_invalid');
  const normalized = normalizeLearnerCode(row.learnerCode);
  if (normalized !== row.learnerCode) fail('learner_code_readback_noncanonical');
  return { authUserId, learnerCode: normalized };
}

/**
 * Server-internal candidate allocation contract, not a DB implementation.
 *
 * storage.readByAuthUserId(uuid): Promise<null|{authUserId,learnerCode}>
 * storage.tryInsert({authUserId,learnerCode}):
 *   Promise<{status:'inserted'|'existing'|'code_collision'}>
 *
 * The *future* DB adapter must enforce immutable UUID PRIMARY KEY and code
 * UNIQUE constraints transactionally. It must convert ONLY proven unique
 * constraint collisions into 'code_collision'/'existing'; permission errors,
 * timeouts and ambiguous writes must reject rather than retry as collisions.
 *
 * This helper never trusts tryInsert() as proof of persistence. Every outcome
 * requires a readback of the exact UUID row before returning a real code.
 */
export async function allocateLearnerCode({ authUserId, storage, randomBytes } = {}) {
  if (!validAuthUserId(authUserId)) fail('auth_user_id_invalid');
  if (!storage || typeof storage.readByAuthUserId !== 'function' ||
    typeof storage.tryInsert !== 'function') fail('learner_code_storage_invalid');
  const canonicalUserId = authUserId.toLowerCase();
  const read = async () => verifyPersistedRow(
    await storage.readByAuthUserId(canonicalUserId), canonicalUserId
  );

  const alreadyAssigned = await read();
  if (alreadyAssigned) return alreadyAssigned;

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
    const candidate = generateLearnerCode(randomBytes);
    const result = await storage.tryInsert({
      authUserId: canonicalUserId, learnerCode: candidate
    });
    if (!result || !['inserted', 'existing', 'code_collision'].includes(result.status))
      fail('learner_code_write_unconfirmed');

    const persisted = await read();
    if (persisted) {
      if (result.status === 'inserted' && persisted.learnerCode !== candidate)
        fail('learner_code_write_mismatch');
      return persisted;
    }
    if (result.status !== 'code_collision') fail('learner_code_readback_missing');
  }
  fail('learner_code_allocation_exhausted');
}
