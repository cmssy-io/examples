interface Entry<T> {
  settledAt: number | null;
  value: Promise<T>;
}

const MAX_ENTRIES = 200;

export function ttlCache<T>(ttlMs: number) {
  const entries = new Map<string, Entry<T>>();
  const fresh = (entry: Entry<T>, now: number) =>
    entry.settledAt === null || now - entry.settledAt < ttlMs;

  function prune(now: number) {
    for (const [key, entry] of entries) {
      if (!fresh(entry, now)) entries.delete(key);
    }
    for (const key of entries.keys()) {
      if (entries.size < MAX_ENTRIES) break;
      entries.delete(key);
    }
  }

  return (key: string, build: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    const hit = entries.get(key);
    if (hit && fresh(hit, now)) return hit.value;
    prune(now);
    const value: Promise<T> = build().then(
      (result) => {
        const current = entries.get(key);
        if (current?.value === value) current.settledAt = Date.now();
        return result;
      },
      (error: unknown) => {
        if (entries.get(key)?.value === value) entries.delete(key);
        throw error;
      },
    );
    entries.set(key, { settledAt: null, value });
    return value;
  };
}
