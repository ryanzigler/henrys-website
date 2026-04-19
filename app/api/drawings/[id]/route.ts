import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import {
  requireOwnedDrawing,
  DrawingNotFoundError,
  NotOwnerError,
} from '@/lib/drawing/authorization';
import {
  updateDrawing,
  deleteDrawing,
  StaleWriteError,
} from '@/lib/drawing/storage';
import type { Stroke } from '@/lib/drawing/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const mapAuthError = (error: unknown) => {
  if (error instanceof DrawingNotFoundError)
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (error instanceof NotOwnerError)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  throw error;
};

export const GET = async (_request: Request, routeContext: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await routeContext.params;
  try {
    const drawing = await requireOwnedDrawing(id, session);
    return NextResponse.json({ drawing });
  } catch (error) {
    return mapAuthError(error);
  }
};

interface PatchBody {
  title?: string;
  strokes?: Stroke[];
  thumbnailPngBase64?: string;
  expectedUpdatedAt?: number;
}

const decodeBase64Png = (encoded: string): Uint8Array => {
  const binary = atob(encoded.replace(/^data:image\/png;base64,/, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
};

export const PATCH = async (request: Request, routeContext: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await routeContext.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  try {
    await requireOwnedDrawing(id, session);
  } catch (error) {
    return mapAuthError(error);
  }

  try {
    const drawing = await updateDrawing(id, {
      title: body.title,
      strokes: body.strokes,
      thumbnailPng:
        body.thumbnailPngBase64 ?
          decodeBase64Png(body.thumbnailPngBase64)
        : undefined,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    return NextResponse.json({ drawing });
  } catch (error) {
    if (error instanceof StaleWriteError)
      return NextResponse.json({ error: 'stale write' }, { status: 409 });
    throw error;
  }
};

export const DELETE = async (_request: Request, routeContext: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await routeContext.params;
  try {
    await requireOwnedDrawing(id, session);
  } catch (error) {
    return mapAuthError(error);
  }
  await deleteDrawing(id);
  return new Response(null, { status: 204 });
};
