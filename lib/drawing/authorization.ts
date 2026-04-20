import { getDrawing } from '@/lib/drawing/storage';
import type { Drawing } from '@/types/drawing';

const DRAWING_NOT_FOUND = 'DrawingNotFoundError' as const;
const NOT_OWNER = 'NotOwnerError' as const;

export interface DrawingNotFoundError extends Error {
  name: typeof DRAWING_NOT_FOUND;
  id: string;
}

export interface NotOwnerError extends Error {
  name: typeof NOT_OWNER;
}

export const drawingNotFoundError = (id: string): DrawingNotFoundError =>
  Object.assign(new Error(`drawing ${id} not found`), {
    name: DRAWING_NOT_FOUND,
    id,
  });

export const notOwnerError = (): NotOwnerError =>
  Object.assign(new Error('not the owner of this drawing'), {
    name: NOT_OWNER,
  });

export const isDrawingNotFoundError = (
  error: unknown,
): error is DrawingNotFoundError =>
  error instanceof Error && error.name === DRAWING_NOT_FOUND;

export const isNotOwnerError = (error: unknown): error is NotOwnerError =>
  error instanceof Error && error.name === NOT_OWNER;

// Narrowed to the one field used, so tests don't need to construct a full SessionRecord.
export interface SessionLike {
  userId: string;
}

export const requireOwnedDrawing = async (
  id: string,
  session: SessionLike,
): Promise<Drawing> => {
  const drawing = await getDrawing(id);
  if (!drawing) throw drawingNotFoundError(id);
  if (drawing.userId !== session.userId) throw notOwnerError();
  return drawing;
};
