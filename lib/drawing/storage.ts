import { blobStore } from '@/lib/blob';
import { newDrawingId } from '@/lib/drawing/ids';
import { kv } from '@/lib/kv';
import type { Drawing, DrawingMeta, Stroke } from '@/types/drawing';

const drawingKey = (id: string) => `drawing:${id}`;
const userDrawingsKey = (userId: string) => `user:${userId}:drawings`;
const jsonPath = (userId: string, id: string) =>
  `drawings/${userId}/${id}.json`;
const pngPath = (userId: string, id: string) => `drawings/${userId}/${id}.png`;

export const DEFAULT_LIST_LIMIT = 100;

export const listUserDrawings = async (userId: string) =>
  kv.zrange(userDrawingsKey(userId), 0, -1);

export const createDrawing = async (userId: string) => {
  const id = newDrawingId();
  const now = Date.now();
  const strokes: Stroke[] = [];

  const { url: blobJsonUrl } = await blobStore.put(
    jsonPath(userId, id),
    JSON.stringify(strokes),
    { contentType: 'application/json' },
  );

  const meta: DrawingMeta = {
    blobJsonUrl,
    blobPngUrl: null,
    createdAt: now,
    id,
    title: 'Untitled',
    updatedAt: now,
    userId,
  };

  await kv.set(drawingKey(id), meta);
  await kv.zadd(userDrawingsKey(userId), { score: now, member: id });

  return { ...meta, strokes } as Drawing;
};

export const getDrawing = async (id: string) => {
  const meta = await kv.get<DrawingMeta>(drawingKey(id));
  if (!meta) {
    return null;
  }

  const strokes = await fetchStrokes(meta.blobJsonUrl);
  return { ...meta, strokes } as Drawing;
};

const fetchStrokes = async (url: string) =>
  JSON.parse(await blobStore.getText(url)) as Stroke[];

const STALE_WRITE = 'StaleWriteError' as const;

export interface StaleWriteError extends Error {
  name: typeof STALE_WRITE;
}

export const staleWriteError = (): StaleWriteError =>
  Object.assign(new Error('drawing was updated since you last read it'), {
    name: STALE_WRITE,
  });

export const isStaleWriteError = (error: unknown): error is StaleWriteError =>
  error instanceof Error && error.name === STALE_WRITE;

interface UpdateInput {
  expectedUpdatedAt?: number;
  strokes?: Stroke[];
  thumbnailPng?: Uint8Array;
  title?: string;
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
    throw staleWriteError();
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
  await kv.zadd(userDrawingsKey(meta.userId), {
    score: updated.updatedAt,
    member: id,
  });

  const finalStrokes = strokes ?? (await fetchStrokes(blobJsonUrl));
  return { ...updated, strokes: finalStrokes };
};

export const deleteDrawing = async (id: string): Promise<void> => {
  const meta = await kv.get<DrawingMeta>(drawingKey(id));
  if (!meta) {
    return;
  }

  await blobStore.del(meta.blobJsonUrl).catch(() => {});

  if (meta.blobPngUrl) {
    await blobStore.del(meta.blobPngUrl).catch(() => {});
  }

  await kv.del(drawingKey(id));
  await kv.zrem(userDrawingsKey(meta.userId), id);
};

export const listDrawings = async (
  userId: string,
  opts: { limit?: number } = {},
): Promise<DrawingMeta[]> => {
  const limit = opts.limit ?? DEFAULT_LIST_LIMIT;
  const ids = (await kv.zrange(userDrawingsKey(userId), 0, limit - 1, {
    rev: true,
  })) as string[];

  if (ids.length === 0) {
    return [];
  }

  const metas = await Promise.all(
    ids.map((id) => kv.get<DrawingMeta>(drawingKey(id))),
  );

  return metas.filter((meta): meta is DrawingMeta => meta !== null);
};
