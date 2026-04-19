import { NextResponse } from 'next/server';
import { getPublicUsers } from '@/lib/auth/users';

export const GET = async () => {
  const users = await getPublicUsers();
  return NextResponse.json({ users });
};
