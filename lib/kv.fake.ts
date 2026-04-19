interface Entry {
  value: unknown;
  expiresAt: number | null;
}

export class FakeKV {
  private store = new Map<string, Entry>();
  private sets = new Map<string, Set<string>>();
  private now = Date.now();

  advanceTime(ms: number) {
    this.now += ms;
  }

  reset() {
    this.store.clear();
    this.sets.clear();
  }

  private clock() {
    return this.now;
  }

  private alive(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= this.clock()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async get<T = unknown>(key: string) {
    const entry = this.alive(key);
    return entry ? (entry.value as T) : null;
  }

  async mget<TData extends unknown[]>(...keys: string[]) {
    return keys.map((key) => {
      const entry = this.alive(key);
      return entry ? entry.value : null;
    }) as TData;
  }

  async getdel<T = unknown>(key: string) {
    const entry = this.alive(key);
    if (!entry) return null;
    this.store.delete(key);
    return entry.value as T;
  }

  async set(key: string, value: unknown, opts?: { ex?: number; nx?: boolean }) {
    if (opts?.nx && this.alive(key)) return null;
    const expiresAt =
      opts?.ex !== undefined ? this.clock() + opts.ex * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK' as const;
  }

  async del(...keys: string[]) {
    let deletedCount = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deletedCount++;
      if (this.sets.delete(key)) deletedCount++;
    }
    return deletedCount;
  }

  async expire(key: string, seconds: number) {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = this.clock() + seconds * 1000;
    return 1;
  }

  async scard(key: string) {
    return this.sets.get(key)?.size ?? 0;
  }

  async sadd(key: string, ...members: string[]) {
    let set = this.sets.get(key);
    if (!set) {
      set = new Set();
      this.sets.set(key, set);
    }
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]) {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) removed++;
    }
    return removed;
  }

  async smembers(key: string) {
    const set = this.sets.get(key);
    return set ? [...set] : [];
  }
}
