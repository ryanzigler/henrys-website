import { kv } from '@/lib/kv';
import { blobStore } from '@/lib/blob';
import { newDrawingId } from '@/lib/drawing/ids';
import type { Drawing, DrawingMeta, Stroke } from '@/lib/drawing/types';

const drawingKey = (id: string) => `drawing:${id}`;
const userDrawingsKey = (userId: string) => `user:${userId}:drawings`;
const jsonPath = (userId: string, id: string) =>
  `drawings/${userId}/${id}.json`;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in updateDrawing (Task 6)
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
