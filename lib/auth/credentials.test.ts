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
  saveCredential,
  getCredential,
  listCredentialsForUser,
  updateCredentialCounter,
} from './credentials';

function resetKv() {
  (
    fakeKv as unknown as {
      store: Map<string, unknown>;
      sets: Map<string, Set<string>>;
    }
  ).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
}

describe('credentials', () => {
  beforeEach(() => resetKv());

  it('save + getCredential round-trips', async () => {
    const pk = new Uint8Array([1, 2, 3, 4]);
    await saveCredential({
      userId: 'u_1',
      id: 'cred-1',
      publicKey: pk,
      counter: 0,
      transports: ['internal'],
    });
    const got = await getCredential('cred-1');
    expect(got).not.toBeNull();
    expect(got!.userId).toBe('u_1');
    expect(got!.counter).toBe(0);
    expect(Array.from(got!.publicKey)).toEqual([1, 2, 3, 4]);
    expect(got!.transports).toEqual(['internal']);
  });

  it('listCredentialsForUser returns all credentials for a user', async () => {
    const pk = new Uint8Array([0]);
    await saveCredential({
      userId: 'u_1',
      id: 'c1',
      publicKey: pk,
      counter: 0,
    });
    await saveCredential({
      userId: 'u_1',
      id: 'c2',
      publicKey: pk,
      counter: 0,
    });
    await saveCredential({
      userId: 'u_2',
      id: 'c3',
      publicKey: pk,
      counter: 0,
    });

    const list = await listCredentialsForUser('u_1');
    const ids = list.map((c) => c.id).sort();
    expect(ids).toEqual(['c1', 'c2']);
  });

  it('updateCredentialCounter bumps the counter', async () => {
    const pk = new Uint8Array([0]);
    await saveCredential({
      userId: 'u_1',
      id: 'c1',
      publicKey: pk,
      counter: 0,
    });
    await updateCredentialCounter('c1', 5);
    const got = await getCredential('c1');
    expect(got!.counter).toBe(5);
  });
});
