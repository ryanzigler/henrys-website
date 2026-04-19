'use client';

import { Button } from '@base-ui/react';

export const SignOutButton = () => {
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <Button className="text-sm text-gray-500" onClick={signOut} type="button">
      Sign out
    </Button>
  );
};
