import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import { createDrawing, listDrawings } from '@/lib/drawing/storage';

export const GET = async () => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const drawings = await listDrawings(session.userId);
  return NextResponse.json({ drawings });
};

export const POST = async () => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const drawing = await createDrawing(session.userId);
  return NextResponse.json({ drawing }, { status: 201 });
};
