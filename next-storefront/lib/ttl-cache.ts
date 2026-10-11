interface Entry<T> {
  at: number;
  value: Promise<T>;
}

export function ttlCache<T>(ttlMs: number) {
  const entries = new Map<string, Entry<T>>();
  return (key: string, build: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    const value = build().catch((error: unknown) => {
      entries.delete(key);
      throw error;
    });
    entries.set(key, { at: Date.now(), value });
    return value;
  };
}
