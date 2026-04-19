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

import {
  createDrawing,
  getDrawing,
  listUserDrawings,
} from '@/lib/drawing/storage';

const resetStores = () => {
  fakeKv.reset();
  fakeBlob.reset();
};

describe('drawing storage — create + get', () => {
  beforeEach(() => resetStores());

  it('createDrawing persists meta + empty strokes JSON, adds to user index', async () => {
    const drawing = await createDrawing('u_1');
    expect(drawing.id).toMatch(/^d_[0-9a-f]{32}$/);
    expect(drawing.userId).toBe('u_1');
    expect(drawing.title).toBe('Untitled');
    expect(drawing.strokes).toEqual([]);
    expect(drawing.blobJsonUrl).toContain(`drawings/u_1/${drawing.id}.json`);

    const ids = await listUserDrawings('u_1');
    expect(ids).toContain(drawing.id);

    const loaded = await getDrawing(drawing.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.strokes).toEqual([]);
  });

  it('getDrawing returns null for an unknown id', async () => {
    expect(await getDrawing('d_missing')).toBeNull();
  });
});
