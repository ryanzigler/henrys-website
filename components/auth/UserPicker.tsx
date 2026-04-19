'use client';

import type { PublicUser } from '@/lib/auth/users';
import { Button } from '@base-ui/react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useEffect, useState } from 'react';

export const UserPicker = () => {
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      const res = await fetch('/api/users');
      const body = (await res.json()) as { users: PublicUser[] };
      setUsers(body.users);
    };
    loadUsers();
  }, []);

  const signIn = async (user: PublicUser) => {
    if (!user.hasPasskey) return;

    setError(null);
    setLoadingUserId(user.id);

    try {
      const optsRes = await fetch('/api/auth/login/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!optsRes.ok) {
        throw new Error(`options failed (${optsRes.status})`);
      }

      const { challengeId, options } = await optsRes.json();

      const response = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId, response }),
      });

      if (!verifyRes.ok) {
        const { error: errMsg } = await verifyRes
          .json()
          .catch(() => ({ error: 'verify failed' }));

        throw new Error(errMsg ?? 'verify failed');
      }

      window.location.assign('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingUserId(null);
    }
  };

  if (!users) {
    return <p className="text-center text-lg">Loading…</p>;
  }

  if (users.length === 0) {
    return (
      <p className="text-center text-lg">
        No one is registered yet. Ask the admin to create a user.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <h1 className="text-4xl font-bold">Who&apos;s drawing?</h1>
      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {users.map((user) => (
          <li key={user.id}>
            <Button
              className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-3xl bg-white shadow-lg transition active:scale-95 disabled:opacity-50"
              disabled={!user.hasPasskey || loadingUserId !== null}
              onClick={() => signIn(user)}
            >
              <span className="text-6xl">{user.emoji}</span>
              <span className="text-lg font-semibold">{user.displayName}</span>
              {!user.hasPasskey && (
                <span className="text-xs">ask dad to set this up</span>
              )}
              {loadingUserId === user.id && (
                <span className="text-xs">waiting for Touch ID…</span>
              )}
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="text-red-600">Something went wrong: {error}</p>}
    </div>
  );
};
