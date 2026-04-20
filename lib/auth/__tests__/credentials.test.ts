import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveCredential,
  getCredential,
  listCredentialsForUser,
  updateCredentialCounter,
} from '@/lib/auth/credentials';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv');
  return { ...actual, kv: fakeKv };
});

describe('credentials', () => {
  beforeEach(() => fakeKv.reset());

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
