import { getSessionFromCookie } from '@/lib/auth/sessions';
import { SignOutButton } from './SignOutButton';

export const UserPill = async () => {
  const session = await getSessionFromCookie();
  if (!session) return null;
  return (
    <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow">
      <span className="text-xl">{session.emoji}</span>
      <span className="font-semibold">{session.displayName}</span>
      <SignOutButton />
    </div>
  );
};
