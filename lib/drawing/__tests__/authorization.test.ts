import {
  isDrawingNotFoundError,
  isNotOwnerError,
  requireOwnedDrawing,
} from '@/lib/drawing/authorization';
import { createDrawing } from '@/lib/drawing/storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv, fakeBlob, reset } = await vi.hoisted(() =>
  import('@/lib/drawing/harness.fake').then((mod) => mod.makeDrawingHarness()),
);

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));
vi.mock('@/lib/blob', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/blob')>('@/lib/blob');
  return { ...actual, blobStore: fakeBlob };
});

describe('requireOwnedDrawing', () => {
  beforeEach(() => reset());

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
    ).rejects.toSatisfy(isNotOwnerError);
  });

  it('throws DrawingNotFoundError for an unknown id', async () => {
    await expect(
      requireOwnedDrawing('d_missing', { userId: 'u_owner' }),
    ).rejects.toSatisfy(isDrawingNotFoundError);
  });
});
