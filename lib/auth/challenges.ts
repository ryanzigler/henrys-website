import { kv } from '@/lib/kv';
import { randomToken } from '@/lib/random';

export const CHALLENGE_TTL_SECONDS = 5 * 60;

export type ChallengeKind = 'login' | 'register';

export type ChallengeRecord = {
  challenge: string;
  userId: string;
  kind: ChallengeKind;
};

const challengeKey = (id: string) => `challenge:${id}`;

export async function saveChallenge(
  record: ChallengeRecord,
): Promise<{ challengeId: string }> {
  const challengeId = randomToken(16);
  await kv.set(challengeKey(challengeId), record, {
    ex: CHALLENGE_TTL_SECONDS,
  });
  return { challengeId };
}

export const consumeChallenge = async (challengeId: string) =>
  (await kv.getdel<ChallengeRecord>(challengeKey(challengeId))) ?? null;
