import { initialState, transition, validateState } from '../domain/demo-study.js';
export const databaseName = 'medical-learning-os-local-v1';
export function openStore(indexedDB) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other app tabs, then reload'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      // One read-modify-write transaction serializes concurrent tabs and commits
      // the event ledger and session cursor together. UI changes only after commit.
      function transact(action) {
        return new Promise((done, fail) => {
          const tx = db.transaction('state', 'readwrite');
          const objectStore = tx.objectStore('state');
          let result, caught;
          const get = objectStore.get('learner');
          get.onsuccess = () => {
            try {
              const state = get.result === undefined ? initialState(crypto.randomUUID()) : validateState(get.result);
              result = action ? transition(state, action) : state;
              objectStore.put(result, 'learner');
            } catch (error) { caught = error; tx.abort(); }
          };
          tx.oncomplete = () => done(result);
          tx.onabort = () => fail(caught || tx.error || new Error('Progress could not be saved'));
          tx.onerror = () => {};
        });
      }
      resolve({ load: () => transact(), dispatch: transact, close: () => db.close() });
    };
  });
}
