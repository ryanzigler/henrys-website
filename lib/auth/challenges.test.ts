import { describe, it, expect, beforeEach, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } = await vi.importActual<typeof import('../kv')>('../kv');
  return { fakeKv: new FakeKV() };
});
vi.mock('../kv', async () => {
  const actual = await vi.importActual<typeof import('../kv')>('../kv');
  return { ...actual, kv: fakeKv };
});

import {
  saveChallenge,
  consumeChallenge,
  CHALLENGE_TTL_SECONDS,
} from './challenges';

function resetKv() {
  (
    fakeKv as unknown as {
      store: Map<string, unknown>;
      sets: Map<string, Set<string>>;
    }
  ).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
}

describe('challenges', () => {
  beforeEach(() => resetKv());

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
