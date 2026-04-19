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

import {
  updateDrawing,
  deleteDrawing,
  listDrawings,
  StaleWriteError,
} from '@/lib/drawing/storage';

describe('drawing storage — update/delete/list', () => {
  beforeEach(() => resetStores());

  it('updateDrawing patches title + strokes and bumps updatedAt', async () => {
    const drawing = await createDrawing('u_1');
    const beforeUpdatedAt = drawing.updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 2));

    const updated = await updateDrawing(drawing.id, {
      title: 'My Picture',
      strokes: [
        {
          brush: 'pen',
          size: 8,
          opacity: 1,
          color: '#000',
          points: [[0, 0, 0.5]],
        },
      ],
    });

    expect(updated.title).toBe('My Picture');
    expect(updated.strokes).toHaveLength(1);
    expect(updated.updatedAt).toBeGreaterThan(beforeUpdatedAt);
  });

  it('updateDrawing stores a thumbnail PNG when provided', async () => {
    const drawing = await createDrawing('u_1');
    const pngBytes = new Uint8Array([137, 80, 78, 71]); // fake png header bytes
    const updated = await updateDrawing(drawing.id, {
      thumbnailPng: pngBytes,
    });
    expect(updated.blobPngUrl).toContain(`drawings/u_1/${drawing.id}.png`);
  });

  it('updateDrawing rejects stale writes', async () => {
    const drawing = await createDrawing('u_1');
    await updateDrawing(drawing.id, { title: 'v2' });
    await expect(
      updateDrawing(drawing.id, {
        title: 'v3',
        expectedUpdatedAt: drawing.updatedAt,
      }),
    ).rejects.toBeInstanceOf(StaleWriteError);
  });

  it('deleteDrawing removes meta, blobs, and user index entry', async () => {
    const drawing = await createDrawing('u_1');
    await deleteDrawing(drawing.id);
    expect(await getDrawing(drawing.id)).toBeNull();
    expect(await listUserDrawings('u_1')).not.toContain(drawing.id);
  });

  it('listDrawings returns metas sorted by updatedAt desc', async () => {
    const firstDrawing = await createDrawing('u_1');
    await new Promise((resolve) => setTimeout(resolve, 2));
    const secondDrawing = await createDrawing('u_1');
    await new Promise((resolve) => setTimeout(resolve, 2));
    await updateDrawing(firstDrawing.id, { title: 'newer' });

    const list = await listDrawings('u_1');
    expect(list.map((meta) => meta.id)).toEqual([
      firstDrawing.id,
      secondDrawing.id,
    ]);
  });
});
