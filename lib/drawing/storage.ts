import { kv } from '@/lib/kv';
import { blobStore } from '@/lib/blob';
import { newDrawingId } from '@/lib/drawing/ids';
import type { Drawing, DrawingMeta, Stroke } from '@/lib/drawing/types';

const drawingKey = (id: string) => `drawing:${id}`;
const userDrawingsKey = (userId: string) => `user:${userId}:drawings`;
const jsonPath = (userId: string, id: string) =>
  `drawings/${userId}/${id}.json`;
const pngPath = (userId: string, id: string) => `drawings/${userId}/${id}.png`;

export const listUserDrawings = async (userId: string) =>
  kv.smembers(userDrawingsKey(userId));

export const createDrawing = async (userId: string): Promise<Drawing> => {
  const id = newDrawingId();
  const now = Date.now();
  const strokes: Stroke[] = [];

  const { url: blobJsonUrl } = await blobStore.put(
    jsonPath(userId, id),
    JSON.stringify(strokes),
    { contentType: 'application/json' },
  );

  const meta: DrawingMeta = {
    id,
    userId,
    title: 'Untitled',
    createdAt: now,
    updatedAt: now,
    blobJsonUrl,
    blobPngUrl: null,
  };

  await kv.set(drawingKey(id), meta);
  await kv.sadd(userDrawingsKey(userId), id);

  return { ...meta, strokes };
};

export const getDrawing = async (id: string): Promise<Drawing | null> => {
  const meta = await kv.get<DrawingMeta>(drawingKey(id));
  if (!meta) return null;
  const strokes = await fetchStrokes(meta.blobJsonUrl);
  return { ...meta, strokes };
};

const fetchStrokes = async (url: string): Promise<Stroke[]> => {
  if (url.startsWith('https://fake-blob.local/')) {
    // Test double path — avoid network fetch so tests stay hermetic.
    const fakeBlobLike = blobStore as unknown as {
      getText?: (fakeUrl: string) => Promise<string>;
    };
    if (fakeBlobLike.getText)
      return JSON.parse(await fakeBlobLike.getText(url)) as Stroke[];
  }
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`blob fetch failed (${response.status})`);
  return (await response.json()) as Stroke[];
};

export class StaleWriteError extends Error {
  constructor() {
    super('drawing was updated since you last read it');
    this.name = 'StaleWriteError';
  }
}

interface UpdateInput {
  title?: string;
  strokes?: Stroke[];
  thumbnailPng?: Uint8Array;
  expectedUpdatedAt?: number;
}

export const updateDrawing = async (
  id: string,
  patch: UpdateInput,
): Promise<Drawing> => {
  const meta = await kv.get<DrawingMeta>(drawingKey(id));
  if (!meta) throw new Error(`drawing ${id} not found`);
  if (
    patch.expectedUpdatedAt !== undefined
    && patch.expectedUpdatedAt !== meta.updatedAt
  ) {
    throw new StaleWriteError();
  }

  let blobJsonUrl = meta.blobJsonUrl;
  let strokes: Stroke[] | undefined;
  if (patch.strokes) {
    strokes = patch.strokes;
    const jsonPutResult = await blobStore.put(
      jsonPath(meta.userId, id),
      JSON.stringify(strokes),
      { contentType: 'application/json' },
    );
    blobJsonUrl = jsonPutResult.url;
  }

  let blobPngUrl = meta.blobPngUrl;
  if (patch.thumbnailPng) {
    const pngPutResult = await blobStore.put(
      pngPath(meta.userId, id),
      patch.thumbnailPng,
      { contentType: 'image/png' },
    );
    blobPngUrl = pngPutResult.url;
  }

  const updated: DrawingMeta = {
    ...meta,
    title: patch.title ?? meta.title,
    updatedAt: Math.max(Date.now(), meta.updatedAt + 1),
    blobJsonUrl,
    blobPngUrl,
  };
  await kv.set(drawingKey(id), updated);

  const finalStrokes = strokes ?? (await fetchStrokes(blobJsonUrl));
  return { ...updated, strokes: finalStrokes };
};

export const deleteDrawing = async (id: string): Promise<void> => {
  const meta = await kv.get<DrawingMeta>(drawingKey(id));
  if (!meta) return;
  await blobStore.del(meta.blobJsonUrl).catch(() => {});
  if (meta.blobPngUrl) await blobStore.del(meta.blobPngUrl).catch(() => {});
  await kv.del(drawingKey(id));
  await kv.srem(userDrawingsKey(meta.userId), id);
};

export const listDrawings = async (userId: string): Promise<DrawingMeta[]> => {
  const ids = await kv.smembers(userDrawingsKey(userId));
  if (ids.length === 0) return [];
  const metas = await Promise.all(
    ids.map((id) => kv.get<DrawingMeta>(drawingKey(id))),
  );
  return metas
    .filter((meta): meta is DrawingMeta => meta !== null)
    .sort((first, second) => second.updatedAt - first.updatedAt);
};
