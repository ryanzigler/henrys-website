import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { kv } from '@/lib/kv';

export interface Credential {
  id: string;
  userId: string;
  publicKey: Uint8Array<ArrayBuffer>;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  createdAt: number;
}

interface StoredCredential extends Omit<Credential, 'publicKey'> {
  publicKeyBase64: string;
}

const credentialKey = (id: string) => `credential:${id}`;
const userCredentialsKey = (userId: string) => `user:${userId}:credentials`;

const encodePublicKey = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString('base64');

const decodePublicKey = (base64: string) =>
  Uint8Array.from(Buffer.from(base64, 'base64'));

const fromStored = ({
  publicKeyBase64,
  ...rest
}: StoredCredential): Credential => ({
  ...rest,
  publicKey: decodePublicKey(publicKeyBase64),
});

export const saveCredential = async (input: {
  id: string;
  userId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
}) => {
  const stored: StoredCredential = {
    id: input.id,
    userId: input.userId,
    publicKeyBase64: encodePublicKey(input.publicKey),
    counter: input.counter,
    transports: input.transports,
    createdAt: Date.now(),
  };
  await Promise.all([
    kv.set(credentialKey(input.id), stored),
    kv.sadd(userCredentialsKey(input.userId), input.id),
  ]);
};

export const getCredential = async (id: string) => {
  const stored = await kv.get<StoredCredential>(credentialKey(id));
  return stored ? fromStored(stored) : null;
};

export const listCredentialsForUser = async (userId: string) => {
  const ids = await kv.smembers(userCredentialsKey(userId));
  if (ids.length === 0) return [];

  const stored = await kv.mget<(StoredCredential | null)[]>(
    ...ids.map(credentialKey),
  );

  return stored.flatMap((entry) => (entry ? [fromStored(entry)] : []));
};

export const countCredentialsForUser = (userId: string) =>
  kv.scard(userCredentialsKey(userId));

export const updateCredentialCounter = async (
  id: string,
  newCounter: number,
) => {
  const stored = await kv.get<StoredCredential>(credentialKey(id));
  if (!stored) {
    throw new Error(`credential ${id} missing during counter update`);
  }
  await kv.set(credentialKey(id), { ...stored, counter: newCounter });
};
