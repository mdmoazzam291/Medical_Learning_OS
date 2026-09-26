const SENSITIVE_KEY = /(authorization|password|passcode|secret|token|cookie|email|dsn|connection|database|db_url|answer[_-]?option|answer[_-]?key|patient|clinical|prompt|request[_-]?body)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER = /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const SECRET_KEY = /\bsb_(?:secret|service_role)_[A-Za-z0-9_-]+\b/g;
const POSTGRES_CREDENTIAL = /(postgres(?:ql)?:\/\/)([^@\s/]+)@/gi;

function scrubString(value) {
  return String(value)
    .replace(EMAIL, '[redacted-email]')
    .replace(BEARER, 'Bearer [redacted]')
    .replace(JWT, '[redacted-jwt]')
    .replace(SECRET_KEY, '[redacted-supabase-secret]')
    .replace(POSTGRES_CREDENTIAL, '$1[redacted]@')
    .slice(0, 4000);
}

export function sanitizeTelemetry(value, depth = 0) {
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return scrubString(value);
  if (depth >= 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitizeTelemetry(item, depth + 1));
  if (typeof value !== 'object') return scrubString(value);

  const out = {};
  for (const [key, item] of Object.entries(value).slice(0, 30)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizeTelemetry(item, depth + 1);
  }
  return out;
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      name: scrubString(error.name || 'Error'),
      message: scrubString(error.message || 'Unknown error'),
      stack: error.stack ? scrubString(error.stack) : null
    };
  }
  return { name: 'Error', message: scrubString(error || 'Unknown error'), stack: null };
}

export function createErrorMonitor({
  sink = () => {},
  environment = 'unknown',
  runtime = 'unknown'
} = {}) {
  if (typeof sink !== 'function') throw new Error('invalid_error_sink');

  return {
    capture(error, context = {}) {
      const event = {
        level: 'error',
        error: normalizeError(error),
        tags: sanitizeTelemetry({
          environment,
          runtime,
          component: context.component || 'unknown',
          operation: context.operation || 'unknown',
          code: context.code || null,
          status: context.status || null
        }),
        context: sanitizeTelemetry(context)
      };
      try { sink(event); } catch {}
      return event;
    }
  };
}
