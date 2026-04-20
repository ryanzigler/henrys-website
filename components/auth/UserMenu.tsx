'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Menu } from '@/components/ui/Menu';

interface UserMenuProps {
  displayName: string;
  initials: string;
  emoji?: string;
}

const SignOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path
      d="M8 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 13l4-3-4-3M17 10H8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const UserMenu = ({ displayName, initials, emoji }: UserMenuProps) => {
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Account menu for ${displayName}`}
        className="rounded-full border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Avatar initials={initials} interactive />
      </Menu.Trigger>
      <Menu.Popup width="w-56" align="end" sideOffset={8}>
        <Menu.Header>Signed in as</Menu.Header>
        <Menu.Label className="flex items-center gap-2 pt-0 pb-2 font-medium">
          {emoji && (
            <span aria-hidden className="text-base">
              {emoji}
            </span>
          )}
          <span className="truncate">{displayName}</span>
        </Menu.Label>
        <Menu.Separator />
        <Menu.Item tone="danger" icon={<SignOutIcon />} onClick={signOut}>
          Sign out
        </Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  );
};
