// Pure gate logic for the automated accessibility audit (axe-core results).
// Kept free of browser and file-system access so it can be unit tested.

export const DEFAULT_FAIL_IMPACTS = Object.freeze(['critical', 'serious']);

export const AXE_WCAG_TAGS = Object.freeze([
  'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'
]);

function baselineKey(page, rule) {
  return `${page}::${rule}`;
}

export function validateBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) {
    throw new TypeError('Accessibility baseline must be an object');
  }
  if (baseline.version !== 1) throw new Error('Accessibility baseline version must be 1');
  if (!Array.isArray(baseline.entries)) throw new TypeError('Accessibility baseline entries must be an array');
  const seen = new Set();
  for (const entry of baseline.entries) {
    for (const field of ['page', 'rule', 'reason']) {
      if (typeof entry?.[field] !== 'string' || !entry[field].trim()) {
        throw new Error(`Accessibility baseline entry is missing ${field}`);
      }
    }
    const key = baselineKey(entry.page, entry.rule);
    if (seen.has(key)) throw new Error(`Duplicate accessibility baseline entry: ${key}`);
    seen.add(key);
  }
  return baseline;
}

// observations: [{ page, viewport, violations: axe violation objects }]
export function evaluateAccessibility(observations, baseline, failImpacts = DEFAULT_FAIL_IMPACTS) {
  validateBaseline(baseline);
  const blocking = new Set(failImpacts);
  const accepted = new Map(baseline.entries.map(entry => [baselineKey(entry.page, entry.rule), entry]));
  const usedBaseline = new Set();
  const failures = [];
  const knownDebt = [];
  const advisories = [];

  for (const { page, viewport, violations } of observations) {
    for (const violation of violations ?? []) {
      const row = {
        page,
        viewport,
        rule: violation.id,
        impact: violation.impact ?? 'unknown',
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: (violation.nodes ?? []).length,
        targets: (violation.nodes ?? []).slice(0, 5).map(node => (node.target ?? []).join(' '))
      };
      const key = baselineKey(page, violation.id);
      if (!blocking.has(row.impact)) advisories.push(row);
      else if (accepted.has(key)) {
        usedBaseline.add(key);
        knownDebt.push(row);
      } else failures.push(row);
    }
  }

  const staleBaseline = baseline.entries
    .filter(entry => !usedBaseline.has(baselineKey(entry.page, entry.rule)))
    .map(entry => ({ page: entry.page, rule: entry.rule }));

  return Object.freeze({
    passed: failures.length === 0,
    failures,
    knownDebt,
    advisories,
    staleBaseline
  });
}
