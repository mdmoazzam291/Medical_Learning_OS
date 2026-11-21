import test from 'node:test';
import assert from 'node:assert/strict';
import { areaMenuModel, yourPages, conceptShortcuts, searchSuggestions, resumeRecordFor, nextResumeRecord, PHONE_AREAS } from '../src/domain/phone-navigation.js';
import { navigationFor } from '../src/domain/app-navigation.js';

test('every learner section of each phone area appears exactly once in its menu groups', () => {
  for (const area of PHONE_AREAS) {
    const model = areaMenuModel(area);
    const ids = model.groups.flatMap(g => g.rows.map(r => r.id));
    assert.deepEqual([...ids].sort(), navigationFor(area).map(r => r.id).sort(), area);
    assert.equal(model.count, ids.length);
    assert.ok(model.start?.href.startsWith('/'));
  }
  assert.equal(areaMenuModel('admin'), null);
});

test('library menu groups match the design: Browse, Visual, Tools, Yours', () => {
  assert.deepEqual(areaMenuModel('library').groups.map(g => g.name), ['Browse', 'Visual', 'Tools', 'Yours']);
});

test('your pages: frequently visited first, topped up from defaults, at most four, no duplicates', () => {
  const pages = yourPages('library', { 'library:atlas': 9, 'library:compare': 3, 'library:graph': 1 });
  assert.deepEqual(pages.map(p => p.id), ['atlas', 'compare', 'notes', 'questions']);
  assert.deepEqual(yourPages('exams', {}).map(p => p.id), ['simulator', 'past', 'dna']);
});

test('current page, pins and pinned rows from other areas are marked', () => {
  const m = areaMenuModel('library', { current: { master: 'library', section: 'notes' }, pins: ['study:mistakes', 'library:graph', 'bogus:x'] });
  assert.ok(m.yours.find(r => r.id === 'notes').current);
  assert.deepEqual(m.pinned.map(r => r.key), ['study:mistakes', 'library:graph']);
  assert.equal(m.pinned[0].areaLabel, 'Study');
  assert.ok(m.groups.flatMap(g => g.rows).find(r => r.id === 'graph').pinned);
});

test('concept shortcuts keep the same canonical concept across views and are escaped', () => {
  const links = conceptShortcuts('a b&c', { master: 'library', section: 'questions' });
  assert.equal(links.length, 6);
  assert.ok(links.every(l => l.href.includes('concept=a%20b%26c')));
  assert.deepEqual(links.filter(l => l.current).map(l => l.label), ['Questions']);
  assert.deepEqual(conceptShortcuts(''), []);
  assert.equal(areaMenuModel('study', { conceptId: 'x', conceptLabel: 'X' }).concept.links.length, 6);
  assert.equal(areaMenuModel('study').concept, null);
});

test('search suggestions offer actions and pages, and need a real query', () => {
  const r = searchSuggestions('mistake');
  assert.equal(r.actions[0].label, 'Start mistake review');
  assert.ok(r.pages.some(p => p.label === 'Mistake Review'));
  assert.deepEqual(searchSuggestions(' a '), { actions: [], pages: [] });
  assert.ok(searchSuggestions('graph').pages.some(p => p.label === 'Knowledge Graph'));
});

test('resume record: kept per learner, expires, cleared when the session finishes', () => {
  const now = 1_800_000_000_000;
  const session = { sessionId: 's1', position: 4, total: 10 };
  const rec = nextResumeRecord(null, { userId: 'u1', session }, now);
  assert.deepEqual(resumeRecordFor(rec, 'u1', now + 1000), { sessionId: 's1', position: 4, total: 10, href: '/web/medical.html?resume=s1' });
  assert.equal(resumeRecordFor(rec, 'u2', now), null, 'another learner on the same device');
  assert.equal(resumeRecordFor(rec, 'u1', now + 8 * 24 * 3600 * 1000), null, 'expired');
  assert.equal(nextResumeRecord(rec, { userId: 'u1', session: { ...session, closed: true } }, now), null);
  assert.equal(nextResumeRecord(rec, { userId: 'u1', session, summaryShown: true }, now), null);
  assert.equal(nextResumeRecord(rec, { userId: 'u1', session: { sessionId: 's2', closed: true } }, now), rec, 'finishing another session keeps this one');
  assert.equal(nextResumeRecord(rec, { userId: 'u1', session: { sessionId: 's1', resumePending: true } }, now), rec);
});
