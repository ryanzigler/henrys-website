import { Redis } from '@upstash/redis';

export const kv = Redis.fromEnv();

type Entry = { value: unknown; expiresAt: number | null };

export class FakeKV {
  private store = new Map<string, Entry>();
  private sets = new Map<string, Set<string>>();
  private now = Date.now();

  advanceTime(ms: number) {
    this.now += ms;
  }

  private clock() {
    return this.now;
  }

  private alive(key: string): Entry | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt !== null && e.expiresAt <= this.clock()) {
      this.store.delete(key);
      return null;
    }
    return e;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const e = this.alive(key);
    return e ? (e.value as T) : null;
  }

  async getdel<T = unknown>(key: string): Promise<T | null> {
    const e = this.alive(key);
    if (!e) return null;
    this.store.delete(key);
    return e.value as T;
  }

  async set(
    key: string,
    value: unknown,
    opts?: { ex?: number; nx?: boolean },
  ): Promise<'OK' | null> {
    if (opts?.nx && this.alive(key)) return null;
    const expiresAt =
      opts?.ex !== undefined ? this.clock() + opts.ex * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) {
      if (this.store.delete(k)) n++;
      if (this.sets.delete(k)) n++;
    }
    return n;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const e = this.store.get(key);
    if (!e) return 0;
    e.expiresAt = this.clock() + seconds * 1000;
    return 1;
  }

  async scard(key: string): Promise<number> {
    const s = this.sets.get(key);
    return s ? s.size : 0;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    let s = this.sets.get(key);
    if (!s) {
      s = new Set();
      this.sets.set(key, s);
    }
    let added = 0;
    for (const m of members) {
      if (!s.has(m)) {
        s.add(m);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const s = this.sets.get(key);
    if (!s) return 0;
    let removed = 0;
    for (const m of members) {
      if (s.delete(m)) removed++;
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const s = this.sets.get(key);
    return s ? [...s] : [];
  }
}
