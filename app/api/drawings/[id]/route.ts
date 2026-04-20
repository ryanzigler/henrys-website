import { unauthenticated } from '@/lib/auth/responses';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import {
  isDrawingNotFoundError,
  isNotOwnerError,
  requireOwnedDrawing,
} from '@/lib/drawing/authorization';
import {
  deleteDrawing,
  isStaleWriteError,
  updateDrawing,
} from '@/lib/drawing/storage';
import type { Stroke } from '@/types/drawing';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const mapAuthError = (error: unknown) => {
  if (isDrawingNotFoundError(error)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (isNotOwnerError(error)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  throw error;
};

export const GET = async (_request: Request, { params }: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session) return unauthenticated();

  const { id } = await params;

  try {
    const drawing = await requireOwnedDrawing(id, session);
    return NextResponse.json({ drawing });
  } catch (error) {
    return mapAuthError(error);
  }
};

interface PatchBody {
  expectedUpdatedAt?: number;
  strokes?: Stroke[];
  thumbnailPngBase64?: string;
  title?: string;
}

const decodeBase64Png = (encoded: string) =>
  new Uint8Array(
    Buffer.from(encoded.replace(/^data:image\/png;base64,/, ''), 'base64'),
  );

export const PATCH = async (request: Request, { params }: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session) return unauthenticated();

  const { id } = await params;

  let body: PatchBody;

  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  try {
    await requireOwnedDrawing(id, session);
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
    if (isStaleWriteError(error)) {
      return NextResponse.json({ error: 'stale write' }, { status: 409 });
    }

    return mapAuthError(error);
  }
};

export const DELETE = async (_request: Request, { params }: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session) return unauthenticated();

  const { id } = await params;

  try {
    await requireOwnedDrawing(id, session);
  } catch (error) {
    return mapAuthError(error);
  }

  await deleteDrawing(id);
  return new Response(null, { status: 204 });
};
