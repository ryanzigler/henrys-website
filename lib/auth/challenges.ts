import { kv } from '@/lib/kv';
import { randomToken } from '@/lib/random';

export const CHALLENGE_TTL_SECONDS = 5 * 60;

export type ChallengeKind = 'login' | 'register';

export interface ChallengeRecord {
  challenge: string;
  userId: string;
  kind: ChallengeKind;
}

const challengeKey = (id: string) => `challenge:${id}`;

export const saveChallenge = async (record: ChallengeRecord) => {
  const challengeId = randomToken(16);
  await kv.set(challengeKey(challengeId), record, {
    ex: CHALLENGE_TTL_SECONDS,
  });

  return { challengeId };
};

export const consumeChallenge = async (challengeId: string) =>
  (await kv.getdel<ChallengeRecord>(challengeKey(challengeId))) ?? null;
