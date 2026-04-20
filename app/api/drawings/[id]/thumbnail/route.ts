import { unauthenticated } from '@/lib/auth/responses';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import { blobStore } from '@/lib/blob';
import {
  isDrawingNotFoundError,
  isNotOwnerError,
  requireOwnedDrawing,
} from '@/lib/drawing/authorization';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = async (_request: Request, { params }: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session) return unauthenticated();

  const { id } = await params;

  try {
    const drawing = await requireOwnedDrawing(id, session);

    if (!drawing.blobPngUrl) {
      return new Response(null, { status: 404 });
    }

    const bytes = await blobStore.getBytes(drawing.blobPngUrl);

    return new Response(bytes as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=60, must-revalidate',
      },
    });
  } catch (error) {
    if (isDrawingNotFoundError(error)) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    if (isNotOwnerError(error)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    throw error;
  }
};
