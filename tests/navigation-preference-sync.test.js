import test from 'node:test';
import assert from 'node:assert/strict';
import { preferenceStore } from '../src/domain/app-navigation.js';
const sync = await import('../web/navigation-preferences.js').catch(() => null);
test('rail, group and pin changes reach the preference editor before an appearance edit', () => {
  assert.ok(sync, 'every navigation mutation broadcasts validated preferences');
  const navigation = preferenceStore(() => { throw new Error('blocked'); });
  const editor = preferenceStore(() => { throw new Error('blocked'); });
  const notify = prefs => editor.write(prefs);
  sync.mutatePreference(navigation, { type: 'expanded', open: true }, notify);
  sync.mutatePreference(navigation, { type: 'pin', id: 'account:data' }, notify);
  sync.mutatePreference(navigation, { type: 'group', id: 'library:subjects', open: true }, notify);
  const edited = editor.write({ ...editor.read(), theme: 'dark' });
  assert.equal(edited.expanded, true);
  assert.deepEqual(edited.pins, ['account:data']);
  assert.deepEqual(edited.groups, ['library:subjects']);
  assert.equal(edited.theme, 'dark');
});
