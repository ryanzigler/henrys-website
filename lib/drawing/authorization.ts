import { getDrawing } from '@/lib/drawing/storage';
import type { Drawing } from '@/lib/drawing/types';

export class DrawingNotFoundError extends Error {
  constructor(public id: string) {
    super(`drawing ${id} not found`);
    this.name = 'DrawingNotFoundError';
  }
}

export class NotOwnerError extends Error {
  constructor() {
    super('not the owner of this drawing');
    this.name = 'NotOwnerError';
  }
}

// Narrow contract — only the field this helper actually uses. The real
// session returned by `getSessionFromCookie` (`SessionRecord` in
// `@/lib/auth/sessions`) structurally satisfies this interface.
export interface SessionLike {
  userId: string;
}

export const requireOwnedDrawing = async (
  id: string,
  session: SessionLike,
): Promise<Drawing> => {
  const drawing = await getDrawing(id);
  if (!drawing) throw new DrawingNotFoundError(id);
  if (drawing.userId !== session.userId) throw new NotOwnerError();
  return drawing;
};
