import { NextResponse } from 'next/server';
import { getPublicUsers } from '@/lib/auth/users';

export async function GET() {
  const users = await getPublicUsers();
  return NextResponse.json({ users });
}
