'use client';

import { useEffect, useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicUser } from '@/lib/auth/users';

export function UserPicker() {
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/users');
      const body = (await res.json()) as { users: PublicUser[] };
      setUsers(body.users);
    })();
  }, []);

  async function signIn(user: PublicUser) {
    if (!user.hasPasskey) return;
    setError(null);
    setLoadingUserId(user.id);
    try {
      const optsRes = await fetch('/api/auth/login/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!optsRes.ok) throw new Error(`options failed (${optsRes.status})`);
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
  }

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
        {users.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => signIn(u)}
              disabled={!u.hasPasskey || loadingUserId !== null}
              className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-3xl bg-white shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <span className="text-6xl">{u.emoji}</span>
              <span className="text-lg font-semibold">{u.displayName}</span>
              {!u.hasPasskey && (
                <span className="text-xs">ask dad to set this up</span>
              )}
              {loadingUserId === u.id && (
                <span className="text-xs">waiting for Touch ID…</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-red-600">Something went wrong: {error}</p>}
    </div>
  );
}
