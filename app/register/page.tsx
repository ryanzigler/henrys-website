'use client';

import { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

type PublicUser = {
  id: string;
  displayName: string;
  emoji: string;
  hasPasskey: boolean;
};

export default function RegisterPage() {
  const [secret] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URL(window.location.href).searchParams.get('secret');
  });
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [emoji, setEmoji] = useState('🦖');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/users');
      const body = (await res.json()) as { users: PublicUser[] };
      setUsers(body.users);
      if (body.users.length > 0) setSelectedUserId(body.users[0].id);
    })();
  }, []);

  async function register() {
    if (!secret) {
      setError('Missing ?secret=…');
      return;
    }
    setError(null);
    setStatus('requesting options…');

    const body =
      mode === 'existing' ?
        { userId: selectedUserId }
      : { username, displayName, emoji };

    const optsRes = await fetch(
      `/api/auth/register/options?secret=${encodeURIComponent(secret)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!optsRes.ok) {
      const { error: msg } = await optsRes
        .json()
        .catch(() => ({ error: 'options failed' }));
      setError(msg ?? 'options failed');
      setStatus(null);
      return;
    }
    const { challengeId, options } = await optsRes.json();

    setStatus('waiting for Touch ID…');
    try {
      const response = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch(
        `/api/auth/register/verify?secret=${encodeURIComponent(secret)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ challengeId, response }),
        },
      );
      if (!verifyRes.ok) {
        const { error: msg } = await verifyRes
          .json()
          .catch(() => ({ error: 'verify failed' }));
        throw new Error(msg ?? 'verify failed');
      }
      setStatus('registered! reload this page to add another.');
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold">Admin: register passkey</h1>
      {!secret && (
        <p className="mt-4 rounded bg-red-100 p-4">
          Add <code>?secret=…</code> to the URL.
        </p>
      )}

      <fieldset className="mt-6 flex gap-4">
        <label>
          <input
            type="radio"
            checked={mode === 'existing'}
            onChange={() => setMode('existing')}
          />{' '}
          Existing user (add device)
        </label>
        <label>
          <input
            type="radio"
            checked={mode === 'new'}
            onChange={() => setMode('new')}
          />{' '}
          New user
        </label>
      </fieldset>

      {mode === 'existing' ?
        <label className="mt-6 block">
          User
          <select
            className="mt-1 block w-full rounded border p-2"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.emoji} {u.displayName}
              </option>
            ))}
          </select>
        </label>
      : <div className="mt-6 space-y-4">
          <label className="block">
            Username (lowercase, unique)
            <input
              className="mt-1 block w-full rounded border p-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="block">
            Display name
            <input
              className="mt-1 block w-full rounded border p-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block">
            Emoji
            <input
              className="mt-1 block w-full rounded border p-2"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
            />
          </label>
        </div>
      }

      <button
        type="button"
        onClick={register}
        disabled={!secret}
        className="mt-6 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        Register passkey
      </button>

      {status && <p className="mt-4">{status}</p>}
      {error && <p className="mt-4 text-red-600">Error: {error}</p>}
    </main>
  );
}
