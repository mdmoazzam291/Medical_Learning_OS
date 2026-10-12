import { changePreference } from '../src/domain/app-navigation.js';
export function mutatePreference(store, action, notify) {
  const prefs = store.write(changePreference(store.read(), action));
  notify(prefs);
  return prefs;
}
