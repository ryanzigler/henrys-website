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

import { createDrawing } from '@/lib/drawing/storage';
import {
  requireOwnedDrawing,
  DrawingNotFoundError,
  NotOwnerError,
} from '@/lib/drawing/authorization';

const resetStores = () => {
  fakeKv.reset();
  fakeBlob.reset();
};

describe('requireOwnedDrawing', () => {
  beforeEach(() => resetStores());

  it('returns the drawing for its owner', async () => {
    const drawing = await createDrawing('u_owner');
    const got = await requireOwnedDrawing(drawing.id, {
      userId: 'u_owner',
    });
    expect(got.id).toBe(drawing.id);
  });

  it('throws NotOwnerError for a non-owner', async () => {
    const drawing = await createDrawing('u_owner');
    await expect(
      requireOwnedDrawing(drawing.id, { userId: 'u_intruder' }),
    ).rejects.toBeInstanceOf(NotOwnerError);
  });

  it('throws DrawingNotFoundError for an unknown id', async () => {
    await expect(
      requireOwnedDrawing('d_missing', { userId: 'u_owner' }),
    ).rejects.toBeInstanceOf(DrawingNotFoundError);
  });
});
