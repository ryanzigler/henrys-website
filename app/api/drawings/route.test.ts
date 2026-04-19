import { describe, it, expect, beforeEach, vi } from 'vitest';

const { fakeKv, fakeBlob } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  const { FakeBlob } =
    await vi.importActual<typeof import('@/lib/blob')>('@/lib/blob');
  return { fakeKv: new FakeKV(), fakeBlob: new FakeBlob() };
});

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));
vi.mock('@/lib/blob', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/blob')>('@/lib/blob');
  return { ...actual, blobStore: fakeBlob };
});

const defaultSession = { userId: 'u_1' };
let currentSession: { userId: string } | null = defaultSession;

vi.mock('@/lib/auth/sessions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/sessions')>(
    '@/lib/auth/sessions',
  );
  return {
    ...actual,
    getSessionFromCookie: async () => currentSession,
  };
});

import { GET, POST } from '@/app/api/drawings/route';

const resetStores = () => {
  fakeKv.reset();
  fakeBlob.reset();
  currentSession = defaultSession;
};

describe('GET /api/drawings', () => {
  beforeEach(() => resetStores());

  it('401 without a session', async () => {
    currentSession = null;
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns an empty list for a fresh user', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ drawings: [] });
  });
});

describe('POST /api/drawings', () => {
  beforeEach(() => resetStores());

  it('401 without a session', async () => {
    currentSession = null;
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it('creates a drawing and returns it', async () => {
    const response = await POST();
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.drawing.id).toMatch(/^d_[0-9a-f]{32}$/);
    expect(body.drawing.userId).toBe('u_1');
  });
});
