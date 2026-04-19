import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveChallenge,
  consumeChallenge,
  CHALLENGE_TTL_SECONDS,
} from '@/lib/auth/challenges';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv');
  return { ...actual, kv: fakeKv };
});

describe('challenges', () => {
  beforeEach(() => fakeKv.reset());

  it('save + consume round-trips the challenge', async () => {
    const { challengeId } = await saveChallenge({
      challenge: 'abc',
      userId: 'u1',
      kind: 'login',
    });
    const got = await consumeChallenge(challengeId);
    expect(got).toEqual({ challenge: 'abc', userId: 'u1', kind: 'login' });
  });

  it('consume returns null on second read (single-use)', async () => {
    const { challengeId } = await saveChallenge({
      challenge: 'abc',
      userId: 'u1',
      kind: 'login',
    });
    await consumeChallenge(challengeId);
    expect(await consumeChallenge(challengeId)).toBeNull();
  });

  it('TTL is 5 minutes', () => {
    expect(CHALLENGE_TTL_SECONDS).toBe(5 * 60);
  });
});
