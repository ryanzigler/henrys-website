'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Menu } from '@/components/ui/Menu';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  displayName: string;
  initials: string;
  emoji?: string;
}

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
        <Menu.Item tone="danger" icon={<LogOut size={14} />} onClick={signOut}>
          Sign out
        </Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  );
};
