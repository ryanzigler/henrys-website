import { GET, POST } from '@/app/api/drawings/route';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv, fakeBlob, reset, session } = await vi.hoisted(() =>
  import('@/lib/drawing/harness.fake').then((mod) =>
    mod.makeDrawingHarness({ userId: 'u_1' }),
  ),
);

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));

vi.mock('@/lib/blob', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/blob')>('@/lib/blob');
  return { ...actual, blobStore: fakeBlob };
});

vi.mock('@/lib/auth/sessions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/sessions')>(
    '@/lib/auth/sessions',
  );
  return { ...actual, getSessionFromCookie: async () => session.current };
});

describe('GET /api/drawings', () => {
  beforeEach(() => reset());

  it('401 without a session', async () => {
    session.current = null;
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
  beforeEach(() => reset());

  it('401 without a session', async () => {
    session.current = null;

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
