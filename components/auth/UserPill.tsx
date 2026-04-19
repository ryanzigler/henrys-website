import { getSessionFromCookie } from '@/lib/auth/sessions';
import { getUser } from '@/lib/auth/users';
import { SignOutButton } from './SignOutButton';

export async function UserPill() {
  const session = await getSessionFromCookie();
  if (!session) return null;
  const user = await getUser(session.userId);
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow">
      <span className="text-xl">{user.emoji}</span>
      <span className="font-semibold">{user.displayName}</span>
      <SignOutButton />
    </div>
  );
}
