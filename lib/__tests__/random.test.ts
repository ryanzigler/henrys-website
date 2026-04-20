import { describe, it, expect } from 'vitest';
import { randomToken } from '@/lib/random';

describe('randomToken', () => {
  it('returns a hex string of the expected length', () => {
    const t = randomToken(32);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns different values on successive calls', () => {
    const a = randomToken(16);
    const b = randomToken(16);
    expect(a).not.toBe(b);
  });
});
