import { kv } from '../kv';

export type Credential = {
  id: string; // base64url credential ID
  userId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: string[];
  createdAt: number;
};

type StoredCredential = Omit<Credential, 'publicKey'> & {
  publicKeyBase64: string;
};

const credentialKey = (id: string) => `credential:${id}`;
const userCredentialsKey = (userId: string) => `user:${userId}:credentials`;

function encodePublicKey(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function decodePublicKey(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function saveCredential(input: {
  id: string;
  userId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: string[];
}): Promise<void> {
  const stored: StoredCredential = {
    id: input.id,
    userId: input.userId,
    publicKeyBase64: encodePublicKey(input.publicKey),
    counter: input.counter,
    transports: input.transports,
    createdAt: Date.now(),
  };
  await kv.set(credentialKey(input.id), stored);
  await kv.sadd(userCredentialsKey(input.userId), input.id);
}

export async function getCredential(id: string): Promise<Credential | null> {
  const stored = await kv.get<StoredCredential>(credentialKey(id));
  if (!stored) return null;
  return {
    id: stored.id,
    userId: stored.userId,
    publicKey: decodePublicKey(stored.publicKeyBase64),
    counter: stored.counter,
    transports: stored.transports,
    createdAt: stored.createdAt,
  };
}

export async function listCredentialsForUser(
  userId: string,
): Promise<Credential[]> {
  const ids = await kv.smembers(userCredentialsKey(userId));
  const creds = await Promise.all(ids.map((id) => getCredential(id)));
  return creds.filter((c): c is Credential => c !== null);
}

export async function updateCredentialCounter(
  id: string,
  newCounter: number,
): Promise<void> {
  const stored = await kv.get<StoredCredential>(credentialKey(id));
  if (!stored) return;
  stored.counter = newCounter;
  await kv.set(credentialKey(id), stored);
}
