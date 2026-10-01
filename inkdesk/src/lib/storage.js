/**
 * Storage shim that survives sandboxed iframes / private mode.
 * If localStorage is unavailable (SecurityError), we fall back to an
 * in-memory Map — the app still works for the session.
 */

function memoryShim() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function probe(store) {
  try {
    const t = '__inkdesk_probe__';
    store.setItem(t, '1');
    store.removeItem(t);
    return store;
  } catch {
    return memoryShim();
  }
}

export const persistentStore = probe(globalThis.localStorage);
