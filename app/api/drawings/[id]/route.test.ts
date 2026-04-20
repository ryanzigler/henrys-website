import { DELETE, GET, PATCH } from '@/app/api/drawings/[id]/route';
import { createDrawing } from '@/lib/drawing/storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv, fakeBlob, reset, session } = await vi.hoisted(() =>
  import('@/lib/drawing/harness.fake').then((mod) =>
    mod.makeDrawingHarness({ userId: 'u_owner' }),
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

const makeRouteContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe('/api/drawings/[id]', () => {
  beforeEach(() => reset());

  it('GET 401 without session', async () => {
    session.current = null;

    const response = await GET(
      new Request('http://t/'),
      makeRouteContext('d_x'),
    );

    expect(response.status).toBe(401);
  });

  it('GET 404 for unknown id', async () => {
    const response = await GET(
      new Request('http://t/'),
      makeRouteContext('d_missing'),
    );

    expect(response.status).toBe(404);
  });

  it('GET 403 for non-owner', async () => {
    const drawing = await createDrawing('u_owner');
    session.current = { userId: 'u_other' };

    const response = await GET(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );
    expect(response.status).toBe(403);
  });

  it('GET returns the drawing for its owner', async () => {
    const drawing = await createDrawing('u_owner');
    const response = await GET(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).drawing.id).toBe(drawing.id);
  });

  it('PATCH updates title + strokes', async () => {
    const drawing = await createDrawing('u_owner');
    const response = await PATCH(
      new Request('http://t/', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Cool',
          strokes: [
            {
              brush: 'pen',
              size: 8,
              opacity: 1,
              color: '#000',
              points: [[0, 0, 0.5]],
            },
          ],
        }),
      }),

      makeRouteContext(drawing.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.drawing.title).toBe('Cool');
    expect(body.drawing.strokes).toHaveLength(1);
  });

  it('PATCH 403 for non-owner', async () => {
    const drawing = await createDrawing('u_owner');
    session.current = { userId: 'u_other' };

    const response = await PATCH(
      new Request('http://t/', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'x' }),
      }),

      makeRouteContext(drawing.id),
    );

    expect(response.status).toBe(403);
  });

  it('DELETE removes the drawing', async () => {
    const drawing = await createDrawing('u_owner');
    const deleteResponse = await DELETE(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );

    expect(deleteResponse.status).toBe(204);

    const refetch = await GET(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );

    expect(refetch.status).toBe(404);
  });

  it('DELETE 403 for non-owner', async () => {
    const drawing = await createDrawing('u_owner');
    session.current = { userId: 'u_other' };

    const response = await DELETE(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );

    expect(response.status).toBe(403);
  });
});
