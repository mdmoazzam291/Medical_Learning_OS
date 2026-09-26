(function () {
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

  function sanitize(value, depth) {
    const level = depth || 0;
    if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'string') return scrubString(value);
    if (level >= 4) return '[truncated]';
    if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitize(item, level + 1));
    if (typeof value !== 'object') return scrubString(value);

    const out = {};
    for (const [key, item] of Object.entries(value).slice(0, 30)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitize(item, level + 1);
    }
    return out;
  }

  function stripUrl(value) {
    try {
      const url = new URL(String(value), location.origin);
      return url.origin === location.origin ? url.origin + url.pathname : url.origin;
    } catch {
      return '[redacted-url]';
    }
  }

  window.sentryOnLoad = function () {
    window.Sentry.init({
      environment: location.hostname.endsWith('.onrender.com') ? 'preview' : 'development',
      sendDefaultPii: false,
      maxBreadcrumbs: 0,
      tracesSampleRate: 0,
      beforeBreadcrumb: function () { return null; },
      beforeSendTransaction: function () { return null; },
      beforeSend: function (event) {
        const clean = { ...event };
        delete clean.user;
        clean.breadcrumbs = [];

        if (clean.request) clean.request = { url: stripUrl(clean.request.url || location.href) };
        if (clean.extra) clean.extra = sanitize(clean.extra);
        if (clean.contexts) clean.contexts = sanitize(clean.contexts);
        if (clean.tags) clean.tags = sanitize(clean.tags);
        if (clean.message) clean.message = sanitize(clean.message);

        if (clean.exception && Array.isArray(clean.exception.values)) {
          clean.exception = {
            ...clean.exception,
            values: clean.exception.values.map(value => ({
              ...value,
              value: value && value.value ? sanitize(value.value) : value && value.value
            }))
          };
        }

        return clean;
      }
    });
    window.__MLOS_SENTRY_READY__ = true;
  };
})();
