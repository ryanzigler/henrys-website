import { UserMenu } from '@/components/auth/UserMenu';
import { initialsOf } from '@/lib/auth/identity';
import { getSessionFromCookie } from '@/lib/auth/sessions';

export const UserPill = async () => {
  const session = await getSessionFromCookie();
  if (!session) return null;

  return (
    <UserMenu
      displayName={session.displayName}
      initials={initialsOf(session.displayName)}
      emoji={session.emoji}
    />
  );
};
