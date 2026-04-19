import { SignOutButton } from '@/components/auth/SignOutButton';
import { getSessionFromCookie } from '@/lib/auth/sessions';

export const UserPill = async () => {
  const session = await getSessionFromCookie();
  if (!session) return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">
      <span className="text-xl">{session.emoji}</span>
      <SignOutButton />
    </div>
  );
};
