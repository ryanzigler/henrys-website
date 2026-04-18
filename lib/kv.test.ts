import { describe, it, expect, beforeEach } from 'vitest';
import { FakeKV } from './kv';

describe('FakeKV', () => {
  let kv: FakeKV;
  beforeEach(() => {
    kv = new FakeKV();
  });

  it('round-trips string values', async () => {
    await kv.set('foo', 'bar');
    expect(await kv.get('foo')).toBe('bar');
  });

  it('round-trips JSON values', async () => {
    await kv.set('obj', { a: 1 });
    expect(await kv.get('obj')).toEqual({ a: 1 });
  });

  it('supports ex (TTL) — a zero/negative TTL expires immediately', async () => {
    await kv.set('gone', 'x', { ex: -1 });
    expect(await kv.get('gone')).toBeNull();
  });

  it('del removes a key', async () => {
    await kv.set('x', '1');
    await kv.del('x');
    expect(await kv.get('x')).toBeNull();
  });

  it('sadd/smembers/srem manage a set', async () => {
    await kv.sadd('s', 'a', 'b');
    expect((await kv.smembers('s')).sort()).toEqual(['a', 'b']);
    await kv.srem('s', 'a');
    expect(await kv.smembers('s')).toEqual(['b']);
  });

  it('expire sets TTL retroactively; advanceTime past it clears the value', async () => {
    await kv.set('t', 'v');
    await kv.expire('t', 1);
    kv.advanceTime(2000);
    expect(await kv.get('t')).toBeNull();
  });
});
