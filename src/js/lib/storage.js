/** In-memory Storage-like object, used in tests and when real storage is blocked. */
export function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

/**
 * Wrap a Storage getter so a throwing or missing storage (private mode,
 * blocked cookies, in-app browsers) degrades to memory instead of crashing.
 */
export function safeStorage(getStorage) {
  let storage;
  try {
    storage = getStorage();
    const probe = "__cp_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
  } catch {
    return memoryStorage();
  }
  const fallback = memoryStorage();
  return {
    getItem(k) {
      try {
        return storage.getItem(k);
      } catch {
        return fallback.getItem(k);
      }
    },
    setItem(k, v) {
      try {
        storage.setItem(k, v);
      } catch {
        fallback.setItem(k, v);
      }
    },
    removeItem(k) {
      try {
        storage.removeItem(k);
      } catch {
        fallback.removeItem(k);
      }
    },
  };
}
