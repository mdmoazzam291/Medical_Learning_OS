// ADR-143: invisible per-learner mark in served question text, to trace leaked copies.
// A 24-bit code (from SHA-256 of salt + learner id) is written as zero-width characters
// right after the first space of the text. Visible text, layout and screen-reader output
// are unchanged. It survives copy-paste into most editors but NOT retyping, OCR of
// screenshots, or tools that strip invisible characters, so finding none proves nothing.
const START = '⁠';
const ZERO = '​';
const ONE = '‌';
const BITS = 24;
const MARK = new RegExp(START + '([' + ZERO + ONE + ']{' + BITS + '})', 'g');

export async function watermarkCode(learnerId, salt) {
  const bytes = new TextEncoder().encode(String(salt || '') + ':' + String(learnerId || ''));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return ((digest[0] << 16) | (digest[1] << 8) | digest[2]).toString(16).padStart(6, '0');
}

export function embedWatermark(text, code) {
  if (typeof text !== 'string' || !/^[0-9a-f]{6}$/.test(String(code))) return text;
  if (text.includes(START)) return text;
  const bits = parseInt(code, 16).toString(2).padStart(BITS, '0');
  const mark = START + [...bits].map(b => (b === '1' ? ONE : ZERO)).join('');
  const at = text.indexOf(' ');
  return at < 0 ? text + mark : text.slice(0, at + 1) + mark + text.slice(at + 1);
}

export function extractWatermarks(text) {
  const out = new Set();
  for (const match of String(text || '').matchAll(MARK)) {
    out.add(parseInt([...match[1]].map(c => (c === ONE ? '1' : '0')).join(''), 2).toString(16).padStart(6, '0'));
  }
  return [...out];
}

export function stripWatermarks(text) {
  return String(text ?? '').replace(MARK, '');
}
