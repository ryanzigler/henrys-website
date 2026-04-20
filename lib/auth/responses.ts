import { NextResponse } from 'next/server';

export const unauthenticated = () =>
  NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
