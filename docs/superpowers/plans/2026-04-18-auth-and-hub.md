# Auth + Hub Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the authentication system and hub landing page for Henry's Website. Per-kid accounts with WebAuthn (Touch ID) login, a "Who's drawing?" picker, admin-only register flow, and a hub shaped to host future features. Ships as a testable, deployable v0.

**Architecture:** WebAuthn passkeys via `@simplewebauthn` v13. Session cookies backed by Upstash Redis (provisioned via the Vercel Marketplace Upstash Redis integration). Single `proxy.ts` (Next 16's renamed middleware) checks the session cookie on every request outside a public allowlist. Admin registration is gated by an `ADMIN_SECRET` query parameter. Hub is a Next App Router page with a reusable `FeatureTile` component; drawing tile shows a "coming soon" state and is replaced in Plan B.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4. `@simplewebauthn/server` + `@simplewebauthn/browser` v13, `@upstash/redis` v1 (via Vercel Marketplace Upstash integration — `@vercel/kv` is deprecated). Vitest + `@testing-library/react` + jsdom for tests. pnpm.

**Spec reference:** `docs/superpowers/specs/2026-04-18-henrys-website-v1-design.md`

**What this plan does NOT build (deferred to Plan B — Drawing Tool):**

- `/draw` gallery and editor routes
- Drawing API (`/api/drawings/*`)
- `@vercel/blob`, `perfect-freehand` integrations
- `lib/drawing/*`, `lib/blob.ts`

---

## File Structure

**Created by this plan:**

| Path                                     | Responsibility                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `vitest.config.ts`                       | Test runner config (jsdom env, `.test.ts` globs, path aliases).                                                                      |
| `vitest.setup.ts`                        | Global test setup (resets fake KV before each test).                                                                                 |
| `.prettierignore`                        | Keeps prettier off `node_modules`, `.next`, and the lockfile.                                                                        |
| `.env.example`                           | Documented env-var template.                                                                                                         |
| `lib/random.ts`                          | `randomToken(bytes)` — hex-encoded cryptographically random strings.                                                                 |
| `lib/kv.ts`                              | Exports a shared `@upstash/redis` client (`Redis.fromEnv()`) plus a `FakeKV` test double.                                            |
| `lib/auth/webauthn-config.ts`            | Reads RP env vars (`WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN`).                                                         |
| `lib/auth/users.ts`                      | User CRUD (`listUsers`, `getUser`, `createUser`, `getPublicUsers`).                                                                  |
| `lib/auth/credentials.ts`                | Credential CRUD (`saveCredential`, `getCredential`, `listCredentialsForUser`, `updateCounter`).                                      |
| `lib/auth/challenges.ts`                 | Short-lived WebAuthn challenge storage (`saveChallenge`, `consumeChallenge`).                                                        |
| `lib/auth/sessions.ts`                   | Session CRUD + cookie helpers (`createSession`, `getSessionFromCookie`, `destroySession`, `setSessionCookie`, `clearSessionCookie`). |
| `lib/auth/admin.ts`                      | `isAdminRequest(req)` — compares `?secret=` query param to `ADMIN_SECRET`.                                                           |
| `proxy.ts`                               | Auth gate at the project root.                                                                                                       |
| `app/api/users/route.ts`                 | Public `GET /api/users` — returns `{id, displayName, emoji, hasPasskey}` for the login picker.                                       |
| `app/api/auth/login/options/route.ts`    | `POST` — returns WebAuthn authentication options.                                                                                    |
| `app/api/auth/login/verify/route.ts`     | `POST` — verifies the WebAuthn assertion and creates a session.                                                                      |
| `app/api/auth/register/options/route.ts` | `POST` — admin-gated; returns WebAuthn registration options (and creates user if new).                                               |
| `app/api/auth/register/verify/route.ts`  | `POST` — admin-gated; verifies the registration response and saves the credential.                                                   |
| `app/api/auth/logout/route.ts`           | `POST` — destroys the session and clears the cookie.                                                                                 |
| `app/login/page.tsx`                     | User picker UI.                                                                                                                      |
| `app/register/page.tsx`                  | Admin-only register UI.                                                                                                              |
| `app/page.tsx`                           | Hub (replaces default scaffolding).                                                                                                  |
| `app/layout.tsx`                         | Root layout — updated with top nav + user pill (server-rendered from session).                                                       |
| `components/auth/UserPill.tsx`           | Displays current user + sign-out button.                                                                                             |
| `components/hub/FeatureTile.tsx`         | Reusable hub tile (name, emoji, href, disabled state).                                                                               |

**Removed by this plan:**

| Path                                                                                               | Reason                                |
| -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `app/page.tsx` default content                                                                     | Replaced with hub.                    |
| `public/next.svg`, `public/vercel.svg`, `public/globe.svg`, `public/window.svg`, `public/file.svg` | Default scaffolding assets, not used. |

**Already done outside this plan (do not redo):**

- `@excalidraw/excalidraw` was removed in commit `9d886e1` before the plan was written. The plan assumes `package.json` no longer lists it.
- Prettier (`prettier`, `prettier-plugin-tailwindcss`) and `.prettierrc` are present in the working tree at plan-start. The plan integrates prettier into the verification loop (see Conventions and Task 4) but does not re-install it. Commit the prettier setup before starting Task 1 if it is still uncommitted.

---

## Conventions for every task

- Before every commit, run:
  1. `pnpm format` — apply prettier (uses `.prettierrc` with single quotes + tailwind-class sorting).
  2. `pnpm typecheck` — `tsc --noEmit`.
  3. `pnpm lint` — eslint.
  4. `pnpm test:run` for any files this task touched.
     Fix everything before moving on. Code samples in the plan are written without strict regard for quote style; prettier will normalize them.
- Test files live next to the code they test: `lib/foo.ts` ↔ `lib/foo.test.ts`.
- Use `pnpm test` (interactive) and `pnpm test:run` (CI-style, single pass) — both configured in Task 4.
- All commits on `main` for now; branching is a future concern.
- Commit messages: short imperative first line, no period, body optional.

---

## Task 1: Remove default scaffolding SVG assets

Excalidraw was removed in an earlier commit (`9d886e1`); this task only removes the unused SVGs that the default `app/page.tsx` still references. After deletion, `app/page.tsx` will fail tsc because of missing imports — we stub it to an empty page here and rewrite it properly in Task 25.

**Files:**

- Delete: `public/next.svg`, `public/vercel.svg`, `public/globe.svg`, `public/window.svg`, `public/file.svg`.
- Replace: `app/page.tsx` with a minimal placeholder (final content lands in Task 25).

- [x] **Step 1: Delete default SVG assets**

```bash
rm public/next.svg public/vercel.svg public/globe.svg public/window.svg public/file.svg
```

- [x] **Step 2: Replace `app/page.tsx` with a minimal placeholder**

```tsx
export default function Page() {
  return null;
}
```

- [x] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: exit code 0.

- [x] **Step 4: Commit**

```bash
git add public app/page.tsx
git commit -m "Remove default scaffolding SVGs and stub home page"
```

---

## Task 2: Install production dependencies

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`.

- [x] **Step 1: Install runtime deps**

```bash
pnpm add @simplewebauthn/server@^13.3.0 @simplewebauthn/browser@^13.3.0 @upstash/redis@^1.37.0
```

Note: `@vercel/kv` is deprecated; the Vercel Marketplace Upstash Redis integration is the supported path, and the client is `@upstash/redis` directly. `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL`/`TOKEN` with a fallback to the legacy `KV_REST_API_URL`/`TOKEN`, so either naming works.

- [x] **Step 2: Verify versions in package.json**

Expected `dependencies` section contains:

```
"@simplewebauthn/browser": "^13.3.0",
"@simplewebauthn/server": "^13.3.0",
"@upstash/redis": "^1.37.0",
```

- [x] **Step 3: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: exit code 0.

- [x] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Add auth dependencies (@simplewebauthn, @upstash/redis)"
```

---

## Task 3: Install dev dependencies for testing

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`.

- [x] **Step 1: Install test deps**

```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [x] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Add vitest and testing-library dev deps"
```

---

## Task 4: Configure Vitest

**Files:**

- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (add scripts)
- Modify: `tsconfig.json` (add vitest types)

- [x] **Step 1: Write a smoke test that must pass**

Create `lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
});
```

- [x] **Step 3: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [x] **Step 4: Update `tsconfig.json` types**

Add `"vitest/globals"` to compilerOptions.types, and include the config files:

Locate the existing `tsconfig.json`. Ensure `compilerOptions.types` includes `"vitest/globals"` and that `include` contains `vitest.config.ts` and `vitest.setup.ts`. Example resulting `compilerOptions.types` fragment:

```jsonc
"types": ["vitest/globals"],
```

And `include`:

```jsonc
"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "vitest.config.ts", "vitest.setup.ts"],
```

- [x] **Step 5: Add npm scripts**

In `package.json`, replace the `scripts` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "vitest",
  "test:run": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

While here, also create `.prettierignore` at the project root so prettier skips generated + dependency files:

```
node_modules
.next
pnpm-lock.yaml
```

- [x] **Step 6: Run the smoke test**

```bash
pnpm test:run
```

Expected: 1 passing test, exits 0.

- [x] **Step 7: Format, typecheck, commit**

```bash
pnpm format
pnpm typecheck
git add vitest.config.ts vitest.setup.ts tsconfig.json package.json .prettierignore lib/smoke.test.ts
git commit -m "Configure Vitest with jsdom and testing-library"
```

---

## Task 5: Document environment variables

**Files:**

- Create: `.env.example`

- [x] **Step 1: Create `.env.example`**

```sh
# Upstash Redis (auto-provisioned when you install the Upstash Redis integration from the Vercel Marketplace).
# The legacy KV_REST_API_* names also work as a fallback — @upstash/redis's Redis.fromEnv()
# accepts either.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# WebAuthn relying-party config
#   RP_ID is the domain of the site (no protocol). Use "localhost" for local dev.
#   ORIGIN is the full URL of the site, including protocol and port if any. Use "http://localhost:3000" for local dev.
#   RP_NAME is the human-readable name shown by the OS during the Touch ID prompt.
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
WEBAUTHN_RP_NAME=Henry's Website

# Admin secret — gate for /register and /api/auth/register/*
# Generate with: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
ADMIN_SECRET=change-me
```

- [x] **Step 2: Commit**

```bash
git add .env.example
git commit -m "Add .env.example"
```

---

## Task 6: Random token helper

**Files:**

- Create: `lib/random.ts`
- Create: `lib/random.test.ts`

- [x] **Step 1: Write the failing test**

Create `lib/random.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { randomToken } from './random';

describe('randomToken', () => {
  it('returns a hex string of the expected length', () => {
    const t = randomToken(32);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns different values on successive calls', () => {
    const a = randomToken(16);
    const b = randomToken(16);
    expect(a).not.toBe(b);
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/random
```

Expected: FAIL — `randomToken` not defined.

- [x] **Step 3: Implement**

Create `lib/random.ts`:

```ts
export function randomToken(bytes: number = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [x] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/random
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/random.ts lib/random.test.ts
git commit -m "Add randomToken helper"
```

---

## Task 7: KV client and in-memory fake

**Files:**

- Create: `lib/kv.ts`
- Create: `lib/kv.test.ts`

We instantiate a shared `@upstash/redis` client with `Redis.fromEnv()` for runtime use. For tests, we ship a `FakeKV` class that implements the subset of Redis commands we actually use (`get`, `set` with `ex`, `del`, `sadd`, `smembers`, `srem`, `expire`). Tests replace the exported `kv` via `vi.mock`.

- [x] **Step 1: Write the failing test**

Create `lib/kv.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeKV } from './kv';

describe('FakeKV', () => {
  let kv: FakeKV;
  beforeEach(() => {
    kv = new FakeKV();
  });

  it('round-trips string values', async () => {
    await kv.set('foo', 'bar');
    expect(await kv.get('foo')).toBe('bar');
  });

  it('round-trips JSON values', async () => {
    await kv.set('obj', { a: 1 });
    expect(await kv.get('obj')).toEqual({ a: 1 });
  });

  it('supports ex (TTL) — a zero/negative TTL expires immediately', async () => {
    await kv.set('gone', 'x', { ex: -1 });
    expect(await kv.get('gone')).toBeNull();
  });

  it('del removes a key', async () => {
    await kv.set('x', '1');
    await kv.del('x');
    expect(await kv.get('x')).toBeNull();
  });

  it('sadd/smembers/srem manage a set', async () => {
    await kv.sadd('s', 'a', 'b');
    expect((await kv.smembers('s')).sort()).toEqual(['a', 'b']);
    await kv.srem('s', 'a');
    expect(await kv.smembers('s')).toEqual(['b']);
  });

  it('expire sets TTL retroactively; advanceTime past it clears the value', async () => {
    await kv.set('t', 'v');
    await kv.expire('t', 1);
    kv.advanceTime(2000);
    expect(await kv.get('t')).toBeNull();
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/kv
```

Expected: FAIL — module not found.

- [x] **Step 3: Implement**

Create `lib/kv.ts`:

```ts
import { Redis } from '@upstash/redis';

export const kv = Redis.fromEnv();

type Entry = { value: unknown; expiresAt: number | null };

export class FakeKV {
  private store = new Map<string, Entry>();
  private sets = new Map<string, Set<string>>();
  private now = Date.now();

  advanceTime(ms: number) {
    this.now += ms;
  }

  private clock() {
    return this.now;
  }

  private alive(key: string): Entry | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt !== null && e.expiresAt <= this.clock()) {
      this.store.delete(key);
      return null;
    }
    return e;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const e = this.alive(key);
    return e ? (e.value as T) : null;
  }

  async set(
    key: string,
    value: unknown,
    opts?: { ex?: number },
  ): Promise<'OK'> {
    const expiresAt =
      opts?.ex !== undefined ? this.clock() + opts.ex * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) {
      if (this.store.delete(k)) n++;
      if (this.sets.delete(k)) n++;
    }
    return n;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const e = this.store.get(key);
    if (!e) return 0;
    e.expiresAt = this.clock() + seconds * 1000;
    return 1;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    let s = this.sets.get(key);
    if (!s) {
      s = new Set();
      this.sets.set(key, s);
    }
    let added = 0;
    for (const m of members) {
      if (!s.has(m)) {
        s.add(m);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const s = this.sets.get(key);
    if (!s) return 0;
    let removed = 0;
    for (const m of members) {
      if (s.delete(m)) removed++;
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const s = this.sets.get(key);
    return s ? [...s] : [];
  }
}
```

- [x] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/kv
```

Expected: PASS (6 tests).

- [x] **Step 5: Commit**

```bash
git add lib/kv.ts lib/kv.test.ts
git commit -m "Add Upstash Redis client and FakeKV test double"
```

---

## Task 8: Sessions (create, read, destroy)

**Files:**

- Create: `lib/auth/sessions.ts`
- Create: `lib/auth/sessions.test.ts`

Session record is stored at `session:<sessionId>` with value `{ userId, expiresAt }` and TTL = 30 days. Cookie is `session=<sessionId>` with matching Max-Age, HttpOnly, Secure, SameSite=Lax.

- [x] **Step 1: Write the failing test**

Create `lib/auth/sessions.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '../kv';

const fakeKv = new FakeKV();
vi.mock('../kv', async () => {
  const actual = await vi.importActual<typeof import('../kv')>('../kv');
  return { ...actual, kv: fakeKv };
});

import {
  createSession,
  getSession,
  destroySession,
  SESSION_TTL_SECONDS,
} from './sessions';

describe('sessions', () => {
  beforeEach(async () => {
    await fakeKv.del(...['session:dummy']);
    // clear everything in-memory by creating a new store
    (fakeKv as unknown as { store: Map<string, unknown> }).store.clear();
  });

  it('createSession stores a record and returns an ID', async () => {
    const { sessionId, userId } = await createSession('user-1');
    expect(sessionId).toMatch(/^[0-9a-f]{64}$/);
    expect(userId).toBe('user-1');

    const rec = await getSession(sessionId);
    expect(rec).toEqual({ userId: 'user-1', expiresAt: expect.any(Number) });
  });

  it('getSession returns null for an unknown id', async () => {
    expect(await getSession('nope')).toBeNull();
  });

  it('destroySession removes the record', async () => {
    const { sessionId } = await createSession('user-1');
    await destroySession(sessionId);
    expect(await getSession(sessionId)).toBeNull();
  });

  it('session TTL is 30 days', () => {
    expect(SESSION_TTL_SECONDS).toBe(60 * 60 * 24 * 30);
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/auth/sessions
```

Expected: FAIL — module not found.

- [x] **Step 3: Implement core session helpers**

Create `lib/auth/sessions.ts`:

```ts
import { kv } from '../kv';
import { randomToken } from '../random';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_COOKIE_NAME = 'session';

export type SessionRecord = {
  userId: string;
  expiresAt: number;
};

function sessionKey(id: string): string {
  return `session:${id}`;
}

export async function createSession(
  userId: string,
): Promise<{ sessionId: string; userId: string }> {
  const sessionId = randomToken(32);
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await kv.set(
    sessionKey(sessionId),
    { userId, expiresAt } satisfies SessionRecord,
    {
      ex: SESSION_TTL_SECONDS,
    },
  );
  return { sessionId, userId };
}

export async function getSession(
  sessionId: string,
): Promise<SessionRecord | null> {
  if (!sessionId) return null;
  return (await kv.get<SessionRecord>(sessionKey(sessionId))) ?? null;
}

export async function destroySession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await kv.del(sessionKey(sessionId));
}

export async function extendSession(sessionId: string): Promise<void> {
  const rec = await getSession(sessionId);
  if (!rec) return;
  rec.expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await kv.set(sessionKey(sessionId), rec, { ex: SESSION_TTL_SECONDS });
}
```

- [x] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/auth/sessions
```

Expected: PASS (4 tests).

- [x] **Step 5: Commit**

```bash
git add lib/auth/sessions.ts lib/auth/sessions.test.ts
git commit -m "Add session helpers (create, get, destroy, extend)"
```

---

## Task 9: Cookie helpers for sessions

**Files:**

- Modify: `lib/auth/sessions.ts` — add `setSessionCookie`, `clearSessionCookie`, `getSessionFromCookie`.
- Modify: `lib/auth/sessions.test.ts` — add cookie helper tests.

- [x] **Step 1: Extend the test**

Append to `lib/auth/sessions.test.ts`:

```ts
import { cookies } from 'next/headers';

vi.mock('next/headers', () => {
  const store = new Map<string, string>();
  return {
    cookies: async () => ({
      get: (name: string) => {
        const v = store.get(name);
        return v ? { name, value: v } : undefined;
      },
      set: (
        nameOrObj: string | { name: string; value: string },
        value?: string,
      ) => {
        if (typeof nameOrObj === 'string') store.set(nameOrObj, value ?? '');
        else store.set(nameOrObj.name, nameOrObj.value);
      },
      delete: (name: string) => store.delete(name),
      _store: store,
    }),
  };
});

describe('session cookie helpers', () => {
  it('setSessionCookie writes the session id', async () => {
    const { setSessionCookie, getSessionFromCookie, createSession } =
      await import('./sessions');
    const { sessionId } = await createSession('user-2');
    await setSessionCookie(sessionId);
    const record = await getSessionFromCookie();
    expect(record?.userId).toBe('user-2');
  });

  it('clearSessionCookie removes it', async () => {
    const { clearSessionCookie, getSessionFromCookie } =
      await import('./sessions');
    await clearSessionCookie();
    expect(await getSessionFromCookie()).toBeNull();
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/auth/sessions
```

Expected: FAIL — helpers not defined.

- [x] **Step 3: Implement**

Append to `lib/auth/sessions.ts`:

```ts
import { cookies } from 'next/headers';

export async function setSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromCookie(): Promise<SessionRecord | null> {
  const jar = await cookies();
  const c = jar.get(SESSION_COOKIE_NAME);
  if (!c?.value) return null;
  return getSession(c.value);
}
```

- [x] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/auth/sessions
```

Expected: PASS (6 tests total).

- [x] **Step 5: Commit**

```bash
git add lib/auth/sessions.ts lib/auth/sessions.test.ts
git commit -m "Add session cookie helpers"
```

---

## Task 10: User CRUD

**Files:**

- Create: `lib/auth/users.ts`
- Create: `lib/auth/users.test.ts`

User record at `user:<userId>` with shape `{ id, username, displayName, emoji, createdAt }`. The set of all user IDs lives at `users`.

- [x] **Step 1: Write the failing test**

Create `lib/auth/users.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '../kv';

const fakeKv = new FakeKV();
vi.mock('../kv', async () => {
  const actual = await vi.importActual<typeof import('../kv')>('../kv');
  return { ...actual, kv: fakeKv };
});

import { createUser, getUser, listUsers, getPublicUsers, User } from './users';

function resetKv() {
  (
    fakeKv as unknown as {
      store: Map<string, unknown>;
      sets: Map<string, Set<string>>;
    }
  ).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
}

describe('users', () => {
  beforeEach(() => resetKv());

  it('createUser persists and can be read back', async () => {
    const u = await createUser({
      username: 'henry',
      displayName: 'Henry',
      emoji: '🦖',
    });
    expect(u.id).toMatch(/^u_[0-9a-f]{16}$/);
    expect(u.username).toBe('henry');
    const got = await getUser(u.id);
    expect(got).toEqual(u);
  });

  it('listUsers returns every created user', async () => {
    await createUser({ username: 'a', displayName: 'A', emoji: '🅰️' });
    await createUser({ username: 'b', displayName: 'B', emoji: '🅱️' });
    const list = await listUsers();
    expect(list).toHaveLength(2);
  });

  it('getPublicUsers omits sensitive fields', async () => {
    const u = await createUser({
      username: 'henry',
      displayName: 'Henry',
      emoji: '🦖',
    });
    const pub = await getPublicUsers();
    expect(pub).toEqual([
      { id: u.id, displayName: 'Henry', emoji: '🦖', hasPasskey: false },
    ]);
  });

  it('createUser rejects duplicate usernames', async () => {
    await createUser({ username: 'henry', displayName: 'Henry', emoji: '🦖' });
    await expect(
      createUser({ username: 'henry', displayName: 'H2', emoji: '🐲' }),
    ).rejects.toThrow(/already exists/);
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/auth/users
```

Expected: FAIL.

- [x] **Step 3: Implement**

Create `lib/auth/users.ts`:

```ts
import { kv } from '../kv';
import { randomToken } from '../random';
import { listCredentialsForUser } from './credentials';

export type User = {
  id: string;
  username: string;
  displayName: string;
  emoji: string;
  createdAt: number;
};

export type PublicUser = {
  id: string;
  displayName: string;
  emoji: string;
  hasPasskey: boolean;
};

const USERS_SET = 'users';
const userKey = (id: string) => `user:${id}`;
const usernameIndexKey = (name: string) => `username:${name.toLowerCase()}`;

export async function createUser(input: {
  username: string;
  displayName: string;
  emoji: string;
}): Promise<User> {
  const existing = await kv.get<string>(usernameIndexKey(input.username));
  if (existing) throw new Error(`user "${input.username}" already exists`);

  const id = `u_${randomToken(8)}`;
  const user: User = {
    id,
    username: input.username.toLowerCase(),
    displayName: input.displayName,
    emoji: input.emoji,
    createdAt: Date.now(),
  };
  await kv.set(userKey(id), user);
  await kv.set(usernameIndexKey(user.username), id);
  await kv.sadd(USERS_SET, id);
  return user;
}

export async function getUser(id: string): Promise<User | null> {
  return (await kv.get<User>(userKey(id))) ?? null;
}

export async function listUsers(): Promise<User[]> {
  const ids = await kv.smembers(USERS_SET);
  if (ids.length === 0) return [];
  const users = await Promise.all(ids.map((id) => getUser(id)));
  return users.filter((u): u is User => u !== null);
}

export async function getPublicUsers(): Promise<PublicUser[]> {
  const users = await listUsers();
  const withPasskeys = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      displayName: u.displayName,
      emoji: u.emoji,
      hasPasskey: (await listCredentialsForUser(u.id)).length > 0,
    })),
  );
  return withPasskeys;
}
```

- [x] **Step 4: Run — expect failure (credentials module missing)**

```bash
pnpm test:run lib/auth/users
```

Expected: FAIL because `./credentials` does not exist yet. This is intentional — Task 11 adds it.

- [x] **Step 5: Commit (pause here; test will pass after Task 11)**

```bash
git add lib/auth/users.ts lib/auth/users.test.ts
git commit -m "Add user CRUD (tests will pass after credentials lib)"
```

---

## Task 11: Credential CRUD

**Files:**

- Create: `lib/auth/credentials.ts`
- Create: `lib/auth/credentials.test.ts`

Credential record at `credential:<credentialId>` with shape `{ userId, publicKey (base64), counter, transports, createdAt }`. The set of a user's credential IDs lives at `user:<userId>:credentials`.

We base64-encode `publicKey` for KV storage because Redis only stores strings; `@simplewebauthn/server` returns `publicKey` as a `Uint8Array`.

- [x] **Step 1: Write the failing test**

Create `lib/auth/credentials.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '../kv';

const fakeKv = new FakeKV();
vi.mock('../kv', async () => {
  const actual = await vi.importActual<typeof import('../kv')>('../kv');
  return { ...actual, kv: fakeKv };
});

import {
  saveCredential,
  getCredential,
  listCredentialsForUser,
  updateCredentialCounter,
} from './credentials';

function resetKv() {
  (
    fakeKv as unknown as {
      store: Map<string, unknown>;
      sets: Map<string, Set<string>>;
    }
  ).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
}

describe('credentials', () => {
  beforeEach(() => resetKv());

  it('save + getCredential round-trips', async () => {
    const pk = new Uint8Array([1, 2, 3, 4]);
    await saveCredential({
      userId: 'u_1',
      id: 'cred-1',
      publicKey: pk,
      counter: 0,
      transports: ['internal'],
    });
    const got = await getCredential('cred-1');
    expect(got).not.toBeNull();
    expect(got!.userId).toBe('u_1');
    expect(got!.counter).toBe(0);
    expect(Array.from(got!.publicKey)).toEqual([1, 2, 3, 4]);
    expect(got!.transports).toEqual(['internal']);
  });

  it('listCredentialsForUser returns all credentials for a user', async () => {
    const pk = new Uint8Array([0]);
    await saveCredential({
      userId: 'u_1',
      id: 'c1',
      publicKey: pk,
      counter: 0,
    });
    await saveCredential({
      userId: 'u_1',
      id: 'c2',
      publicKey: pk,
      counter: 0,
    });
    await saveCredential({
      userId: 'u_2',
      id: 'c3',
      publicKey: pk,
      counter: 0,
    });

    const list = await listCredentialsForUser('u_1');
    const ids = list.map((c) => c.id).sort();
    expect(ids).toEqual(['c1', 'c2']);
  });

  it('updateCredentialCounter bumps the counter', async () => {
    const pk = new Uint8Array([0]);
    await saveCredential({
      userId: 'u_1',
      id: 'c1',
      publicKey: pk,
      counter: 0,
    });
    await updateCredentialCounter('c1', 5);
    const got = await getCredential('c1');
    expect(got!.counter).toBe(5);
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/auth/credentials
```

Expected: FAIL.

- [x] **Step 3: Implement**

Create `lib/auth/credentials.ts`:

```ts
import { kv } from '../kv';

export type Credential = {
  id: string; // base64url credential ID
  userId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: string[];
  createdAt: number;
};

type StoredCredential = Omit<Credential, 'publicKey'> & {
  publicKeyBase64: string;
};

const credentialKey = (id: string) => `credential:${id}`;
const userCredentialsKey = (userId: string) => `user:${userId}:credentials`;

function encodePublicKey(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function decodePublicKey(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function saveCredential(input: {
  id: string;
  userId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: string[];
}): Promise<void> {
  const stored: StoredCredential = {
    id: input.id,
    userId: input.userId,
    publicKeyBase64: encodePublicKey(input.publicKey),
    counter: input.counter,
    transports: input.transports,
    createdAt: Date.now(),
  };
  await kv.set(credentialKey(input.id), stored);
  await kv.sadd(userCredentialsKey(input.userId), input.id);
}

export async function getCredential(id: string): Promise<Credential | null> {
  const stored = await kv.get<StoredCredential>(credentialKey(id));
  if (!stored) return null;
  return {
    id: stored.id,
    userId: stored.userId,
    publicKey: decodePublicKey(stored.publicKeyBase64),
    counter: stored.counter,
    transports: stored.transports,
    createdAt: stored.createdAt,
  };
}

export async function listCredentialsForUser(
  userId: string,
): Promise<Credential[]> {
  const ids = await kv.smembers(userCredentialsKey(userId));
  const creds = await Promise.all(ids.map((id) => getCredential(id)));
  return creds.filter((c): c is Credential => c !== null);
}

export async function updateCredentialCounter(
  id: string,
  newCounter: number,
): Promise<void> {
  const stored = await kv.get<StoredCredential>(credentialKey(id));
  if (!stored) return;
  stored.counter = newCounter;
  await kv.set(credentialKey(id), stored);
}
```

- [x] **Step 4: Run — expect both users and credentials test suites pass**

```bash
pnpm test:run lib/auth
```

Expected: PASS (users + credentials tests all green).

- [x] **Step 5: Commit**

```bash
git add lib/auth/credentials.ts lib/auth/credentials.test.ts
git commit -m "Add credential CRUD"
```

---

## Task 12: WebAuthn challenge storage

**Files:**

- Create: `lib/auth/challenges.ts`
- Create: `lib/auth/challenges.test.ts`

Short-lived (5-minute TTL) WebAuthn challenges keyed by a random token that the client echoes back. We issue a `challengeId` to the client alongside the options; on verify, the client sends the `challengeId`, we look up the stored challenge, and consume (delete) it.

- [x] **Step 1: Write the failing test**

Create `lib/auth/challenges.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '../kv';

const fakeKv = new FakeKV();
vi.mock('../kv', async () => {
  const actual = await vi.importActual<typeof import('../kv')>('../kv');
  return { ...actual, kv: fakeKv };
});

import {
  saveChallenge,
  consumeChallenge,
  CHALLENGE_TTL_SECONDS,
} from './challenges';

function resetKv() {
  (
    fakeKv as unknown as {
      store: Map<string, unknown>;
      sets: Map<string, Set<string>>;
    }
  ).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
}

describe('challenges', () => {
  beforeEach(() => resetKv());

  it('save + consume round-trips the challenge', async () => {
    const { challengeId } = await saveChallenge({
      challenge: 'abc',
      userId: 'u1',
      kind: 'login',
    });
    const got = await consumeChallenge(challengeId);
    expect(got).toEqual({ challenge: 'abc', userId: 'u1', kind: 'login' });
  });

  it('consume returns null on second read (single-use)', async () => {
    const { challengeId } = await saveChallenge({
      challenge: 'abc',
      userId: 'u1',
      kind: 'login',
    });
    await consumeChallenge(challengeId);
    expect(await consumeChallenge(challengeId)).toBeNull();
  });

  it('TTL is 5 minutes', () => {
    expect(CHALLENGE_TTL_SECONDS).toBe(5 * 60);
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/auth/challenges
```

Expected: FAIL.

- [x] **Step 3: Implement**

Create `lib/auth/challenges.ts`:

```ts
import { kv } from '../kv';
import { randomToken } from '../random';

export const CHALLENGE_TTL_SECONDS = 5 * 60;

export type ChallengeKind = 'login' | 'register';

export type ChallengeRecord = {
  challenge: string;
  userId: string;
  kind: ChallengeKind;
};

const challengeKey = (id: string) => `challenge:${id}`;

export async function saveChallenge(
  record: ChallengeRecord,
): Promise<{ challengeId: string }> {
  const challengeId = randomToken(16);
  await kv.set(challengeKey(challengeId), record, {
    ex: CHALLENGE_TTL_SECONDS,
  });
  return { challengeId };
}

export async function consumeChallenge(
  challengeId: string,
): Promise<ChallengeRecord | null> {
  const record = await kv.get<ChallengeRecord>(challengeKey(challengeId));
  if (!record) return null;
  await kv.del(challengeKey(challengeId));
  return record;
}
```

- [x] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/auth/challenges
```

Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add lib/auth/challenges.ts lib/auth/challenges.test.ts
git commit -m "Add WebAuthn challenge storage"
```

---

## Task 13: WebAuthn relying-party config

**Files:**

- Create: `lib/auth/webauthn-config.ts`
- Create: `lib/auth/webauthn-config.test.ts`

- [x] **Step 1: Write the failing test**

Create `lib/auth/webauthn-config.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { getWebAuthnConfig } from './webauthn-config';

describe('webauthn-config', () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns config read from environment variables', () => {
    process.env.WEBAUTHN_RP_ID = 'henrys.example.com';
    process.env.WEBAUTHN_ORIGIN = 'https://henrys.example.com';
    process.env.WEBAUTHN_RP_NAME = "Henry's Site";
    expect(getWebAuthnConfig()).toEqual({
      rpID: 'henrys.example.com',
      origin: 'https://henrys.example.com',
      rpName: "Henry's Site",
    });
  });

  it('throws when required vars are missing', () => {
    delete process.env.WEBAUTHN_RP_ID;
    delete process.env.WEBAUTHN_ORIGIN;
    delete process.env.WEBAUTHN_RP_NAME;
    expect(() => getWebAuthnConfig()).toThrow(/WEBAUTHN_RP_ID/);
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/auth/webauthn-config
```

Expected: FAIL.

- [x] **Step 3: Implement**

Create `lib/auth/webauthn-config.ts`:

```ts
export type WebAuthnConfig = {
  rpID: string;
  origin: string;
  rpName: string;
};

export function getWebAuthnConfig(): WebAuthnConfig {
  const rpID = process.env.WEBAUTHN_RP_ID;
  const origin = process.env.WEBAUTHN_ORIGIN;
  const rpName = process.env.WEBAUTHN_RP_NAME;
  if (!rpID) throw new Error('WEBAUTHN_RP_ID is not set');
  if (!origin) throw new Error('WEBAUTHN_ORIGIN is not set');
  if (!rpName) throw new Error('WEBAUTHN_RP_NAME is not set');
  return { rpID, origin, rpName };
}
```

- [x] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/auth/webauthn-config
```

Expected: PASS (2 tests).

- [x] **Step 5: Commit**

```bash
git add lib/auth/webauthn-config.ts lib/auth/webauthn-config.test.ts
git commit -m "Add WebAuthn RP config from env"
```

---

## Task 14: Admin-gate helper

**Files:**

- Create: `lib/auth/admin.ts`
- Create: `lib/auth/admin.test.ts`

- [x] **Step 1: Write the failing test**

Create `lib/auth/admin.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { isAdminRequest } from './admin';

describe('isAdminRequest', () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns true when ?secret= matches ADMIN_SECRET', () => {
    process.env.ADMIN_SECRET = 'hunter2';
    expect(
      isAdminRequest(new URL('http://localhost/register?secret=hunter2')),
    ).toBe(true);
  });

  it('returns false when secrets differ', () => {
    process.env.ADMIN_SECRET = 'hunter2';
    expect(
      isAdminRequest(new URL('http://localhost/register?secret=wrong')),
    ).toBe(false);
  });

  it('returns false when ADMIN_SECRET is unset', () => {
    delete process.env.ADMIN_SECRET;
    expect(
      isAdminRequest(new URL('http://localhost/register?secret=anything')),
    ).toBe(false);
  });

  it('returns false when no secret query param is present', () => {
    process.env.ADMIN_SECRET = 'hunter2';
    expect(isAdminRequest(new URL('http://localhost/register'))).toBe(false);
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/auth/admin
```

Expected: FAIL.

- [x] **Step 3: Implement**

Create `lib/auth/admin.ts`:

```ts
export function isAdminRequest(url: URL): boolean {
  const provided = url.searchParams.get('secret');
  const expected = process.env.ADMIN_SECRET;
  if (!provided || !expected) return false;
  return timingSafeEqual(provided, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

- [x] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/auth/admin
```

Expected: PASS (4 tests).

- [x] **Step 5: Commit**

```bash
git add lib/auth/admin.ts lib/auth/admin.test.ts
git commit -m "Add admin-gate helper"
```

---

## Task 15: Public users API

**Files:**

- Create: `app/api/users/route.ts`
- Create: `app/api/users/route.test.ts`

`GET /api/users` returns `PublicUser[]` for the login picker. Public (unauthenticated). We add the path to the proxy allowlist in Task 21.

- [x] **Step 1: Write the failing test**

Create `app/api/users/route.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '@/lib/kv';

const fakeKv = new FakeKV();
vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv');
  return { ...actual, kv: fakeKv };
});

import { createUser } from '@/lib/auth/users';
import { GET } from './route';

function resetKv() {
  (
    fakeKv as unknown as {
      store: Map<string, unknown>;
      sets: Map<string, Set<string>>;
    }
  ).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
}

describe('GET /api/users', () => {
  beforeEach(() => resetKv());

  it('returns empty array when no users exist', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users: [] });
  });

  it('returns all users with hasPasskey=false initially', async () => {
    await createUser({ username: 'henry', displayName: 'Henry', emoji: '🦖' });
    const res = await GET();
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    expect(body.users[0]).toMatchObject({
      displayName: 'Henry',
      emoji: '🦖',
      hasPasskey: false,
    });
  });
});
```

- [x] **Step 2: Run — expect failure**

```bash
pnpm test:run app/api/users
```

Expected: FAIL.

- [x] **Step 3: Implement**

Create `app/api/users/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getPublicUsers } from '@/lib/auth/users';

export async function GET() {
  const users = await getPublicUsers();
  return NextResponse.json({ users });
}
```

- [x] **Step 4: Run — expect pass**

```bash
pnpm test:run app/api/users
```

Expected: PASS (2 tests).

- [x] **Step 5: Commit**

```bash
git add app/api/users/route.ts app/api/users/route.test.ts
git commit -m "Add public users API"
```

---

## Task 16: Login options API

**Files:**

- Create: `app/api/auth/login/options/route.ts`

`POST /api/auth/login/options` body: `{ userId: string }`.
Response: `{ challengeId: string, options: PublicKeyCredentialRequestOptionsJSON }`.

- [x] **Step 1: Implement**

Create `app/api/auth/login/options/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getUser } from '@/lib/auth/users';
import { listCredentialsForUser } from '@/lib/auth/credentials';
import { saveChallenge } from '@/lib/auth/challenges';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId: string | undefined = body?.userId;
  if (!userId)
    return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const user = await getUser(userId);
  if (!user)
    return NextResponse.json({ error: 'unknown user' }, { status: 404 });

  const creds = await listCredentialsForUser(userId);
  if (creds.length === 0) {
    return NextResponse.json(
      { error: 'no passkeys registered for this user' },
      { status: 409 },
    );
  }

  const { rpID } = getWebAuthnConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    allowCredentials: creds.map((c) => ({
      id: c.id,
      transports: c.transports as never,
    })),
  });

  const { challengeId } = await saveChallenge({
    challenge: options.challenge,
    userId,
    kind: 'login',
  });

  return NextResponse.json({ challengeId, options });
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add app/api/auth/login/options/route.ts
git commit -m "Add /api/auth/login/options"
```

---

## Task 17: Login verify API

**Files:**

- Create: `app/api/auth/login/verify/route.ts`

`POST /api/auth/login/verify` body: `{ challengeId, response }` where `response` is the `AuthenticationResponseJSON` from `startAuthentication`.
Response: `{ ok: true }` with `Set-Cookie: session=…`.

- [x] **Step 1: Implement**

Create `app/api/auth/login/verify/route.ts`:

```ts
import { NextResponse } from 'next/server';
import {
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import { consumeChallenge } from '@/lib/auth/challenges';
import { getCredential, updateCredentialCounter } from '@/lib/auth/credentials';
import { createSession, setSessionCookie } from '@/lib/auth/sessions';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

type Body = {
  challengeId?: string;
  response?: AuthenticationResponseJSON;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.challengeId || !body.response) {
    return NextResponse.json(
      { error: 'challengeId and response required' },
      { status: 400 },
    );
  }

  const challenge = await consumeChallenge(body.challengeId);
  if (!challenge || challenge.kind !== 'login') {
    return NextResponse.json(
      { error: 'challenge not found or expired' },
      { status: 400 },
    );
  }

  const credential = await getCredential(body.response.id);
  if (!credential || credential.userId !== challenge.userId) {
    return NextResponse.json({ error: 'unknown credential' }, { status: 400 });
  }

  const { rpID, origin } = getWebAuthnConfig();

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports as never,
      },
      requireUserVerification: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'not verified' }, { status: 400 });
  }

  await updateCredentialCounter(
    credential.id,
    verification.authenticationInfo.newCounter,
  );

  const { sessionId } = await createSession(challenge.userId);
  await setSessionCookie(sessionId);

  return NextResponse.json({ ok: true });
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add app/api/auth/login/verify/route.ts
git commit -m "Add /api/auth/login/verify"
```

---

## Task 18: Register options API

**Files:**

- Create: `app/api/auth/register/options/route.ts`

`POST /api/auth/register/options?secret=<ADMIN_SECRET>` body: either `{ userId }` (add device to existing user) or `{ username, displayName, emoji }` (new user — creates and issues options).

- [x] **Step 1: Implement**

Create `app/api/auth/register/options/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isAdminRequest } from '@/lib/auth/admin';
import { createUser, getUser } from '@/lib/auth/users';
import { listCredentialsForUser } from '@/lib/auth/credentials';
import { saveChallenge } from '@/lib/auth/challenges';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

type Body =
  | { userId: string }
  | { username: string; displayName: string; emoji: string };

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminRequest(url)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Body>;

  let userId: string;
  if ('userId' in body && body.userId) {
    const existing = await getUser(body.userId);
    if (!existing)
      return NextResponse.json({ error: 'unknown user' }, { status: 404 });
    userId = existing.id;
  } else if (
    'username' in body
    && body.username
    && body.displayName
    && body.emoji
  ) {
    const user = await createUser({
      username: body.username,
      displayName: body.displayName,
      emoji: body.emoji,
    });
    userId = user.id;
  } else {
    return NextResponse.json(
      { error: 'must include { userId } or { username, displayName, emoji }' },
      { status: 400 },
    );
  }

  const user = await getUser(userId);
  if (!user)
    return NextResponse.json(
      { error: 'user not found after create' },
      { status: 500 },
    );

  const { rpID, rpName } = getWebAuthnConfig();
  const existingCreds = await listCredentialsForUser(userId);

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userName: user.username,
    userDisplayName: user.displayName,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: existingCreds.map((c) => ({
      id: c.id,
      transports: c.transports as never,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });

  const { challengeId } = await saveChallenge({
    challenge: options.challenge,
    userId,
    kind: 'register',
  });

  return NextResponse.json({ challengeId, userId, options });
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add app/api/auth/register/options/route.ts
git commit -m "Add /api/auth/register/options (admin gated)"
```

---

## Task 19: Register verify API

**Files:**

- Create: `app/api/auth/register/verify/route.ts`

- [x] **Step 1: Implement**

Create `app/api/auth/register/verify/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/browser';
import { isAdminRequest } from '@/lib/auth/admin';
import { consumeChallenge } from '@/lib/auth/challenges';
import { saveCredential } from '@/lib/auth/credentials';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

type Body = { challengeId?: string; response?: RegistrationResponseJSON };

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminRequest(url)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.challengeId || !body.response) {
    return NextResponse.json(
      { error: 'challengeId and response required' },
      { status: 400 },
    );
  }

  const challenge = await consumeChallenge(body.challengeId);
  if (!challenge || challenge.kind !== 'register') {
    return NextResponse.json(
      { error: 'challenge not found or expired' },
      { status: 400 },
    );
  }

  const { rpID, origin } = getWebAuthnConfig();

  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json(
      { error: 'registration not verified' },
      { status: 400 },
    );
  }

  const { credential } = verification.registrationInfo;
  await saveCredential({
    id: credential.id,
    userId: challenge.userId,
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports as string[] | undefined,
  });

  return NextResponse.json({ ok: true, userId: challenge.userId });
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add app/api/auth/register/verify/route.ts
git commit -m "Add /api/auth/register/verify (admin gated)"
```

---

## Task 20: Logout API

**Files:**

- Create: `app/api/auth/logout/route.ts`

- [x] **Step 1: Implement**

Create `app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  destroySession,
} from '@/lib/auth/sessions';

export async function POST() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) await destroySession(sessionId);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
```

- [x] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add app/api/auth/logout/route.ts
git commit -m "Add /api/auth/logout"
```

---

## Task 21: Proxy (auth gate)

**Files:**

- Create: `proxy.ts` (project root, same level as `app/`)

The proxy lets the following through without a session:

- `/login`, `/register`
- `/api/users`, `/api/auth/*`
- Next internals: `/_next/*`, `/favicon.ico`

Everything else requires a valid session cookie; otherwise redirect to `/login`.

- [x] **Step 1: Implement**

Create `proxy.ts` at project root:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSession, SESSION_COOKIE_NAME } from '@/lib/auth/sessions';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/users',
  '/api/auth/login/options',
  '/api/auth/login/verify',
  '/api/auth/register/options',
  '/api/auth/register/verify',
  '/api/auth/logout',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const record = sessionId ? await getSession(sessionId) : null;

  if (!record) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    // Run on everything except Next static assets and the favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

Notes:

- `runtime: "nodejs"` is required because `@simplewebauthn/server` uses Node-ish crypto. Even though we don't call it from the proxy, using the Node runtime avoids surprises as this file grows. Next.js 15.5+ supports Node runtime in proxy/middleware.
- `@upstash/redis` works in both the Node and Edge runtimes (it's HTTP-based via the REST endpoint), so the proxy's session lookup is safe either way. We pick Node for this project so the same runtime is in force everywhere, eliminating a category of import-compatibility surprises as the codebase grows.

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "Add auth proxy (renamed from middleware in Next 16)"
```

---

## Task 22: Login page (user picker)

**Files:**

- Create: `app/login/page.tsx`
- Create: `components/auth/UserPicker.tsx`

- [x] **Step 1: Implement the client component**

Create `components/auth/UserPicker.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

type PublicUser = {
  id: string;
  displayName: string;
  emoji: string;
  hasPasskey: boolean;
};

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

      window.location.href = '/';
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
      <h1 className="text-4xl font-bold">Who's drawing?</h1>
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
```

- [x] **Step 2: Implement the route**

Create `app/login/page.tsx`:

```tsx
import { UserPicker } from '@/components/auth/UserPicker';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50 p-8">
      <UserPicker />
    </main>
  );
}
```

- [x] **Step 3: Typecheck + commit**

```bash
pnpm typecheck
git add app/login/page.tsx components/auth/UserPicker.tsx
git commit -m "Add login page with user picker"
```

---

## Task 23: Register page (admin)

**Files:**

- Create: `app/register/page.tsx`

This is a single client page that:

1. Reads `?secret=` from the URL.
2. Lets the admin either pick an existing user (to add a device) or enter `{ username, displayName, emoji }` for a new user.
3. Calls the register options endpoint, triggers `startRegistration`, calls the verify endpoint.

- [x] **Step 1: Implement**

Create `app/register/page.tsx`:

```tsx
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
  const [secret, setSecret] = useState<string | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [emoji, setEmoji] = useState('🦖');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    setSecret(url.searchParams.get('secret'));
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
```

- [x] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add app/register/page.tsx
git commit -m "Add admin-gated register page"
```

---

## Task 24: Root layout with user pill

**Files:**

- Modify: `app/layout.tsx`
- Create: `components/auth/UserPill.tsx`

- [x] **Step 1: Implement the pill**

Create `components/auth/UserPill.tsx`:

```tsx
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
```

Create `components/auth/SignOutButton.tsx`:

```tsx
'use client';

export function SignOutButton() {
  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className="text-sm text-gray-500 underline"
    >
      sign out
    </button>
  );
}
```

- [x] **Step 2: Update root layout**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { UserPill } from '@/components/auth/UserPill';
import './globals.css';

export const metadata: Metadata = {
  title: "Henry's Website",
  description: 'Stuff Henry made',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sky-50">
        <header className="flex items-center justify-end p-4">
          <UserPill />
        </header>
        {children}
      </body>
    </html>
  );
}
```

- [x] **Step 3: Typecheck + commit**

```bash
pnpm typecheck
git add app/layout.tsx components/auth/UserPill.tsx components/auth/SignOutButton.tsx
git commit -m "Add root layout with user pill"
```

---

## Task 25: Hub page

**Files:**

- Replace: `app/page.tsx`
- Create: `components/hub/FeatureTile.tsx`

- [x] **Step 1: Implement FeatureTile**

Create `components/hub/FeatureTile.tsx`:

```tsx
import Link from 'next/link';

type Props = {
  title: string;
  emoji: string;
  href: string;
  disabled?: boolean;
  comingSoonLabel?: string;
};

export function FeatureTile({
  title,
  emoji,
  href,
  disabled,
  comingSoonLabel,
}: Props) {
  const base =
    'flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-3xl bg-white shadow-lg transition';
  if (disabled) {
    return (
      <div className={`${base} opacity-60`} aria-disabled="true">
        <span className="text-6xl">{emoji}</span>
        <span className="text-lg font-semibold">{title}</span>
        {comingSoonLabel && <span className="text-xs">{comingSoonLabel}</span>}
      </div>
    );
  }
  return (
    <Link href={href} className={`${base} active:scale-95`}>
      <span className="text-6xl">{emoji}</span>
      <span className="text-lg font-semibold">{title}</span>
    </Link>
  );
}
```

- [x] **Step 2: Replace `app/page.tsx`**

```tsx
import { FeatureTile } from '@/components/hub/FeatureTile';

export default function HubPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center p-8">
      <h1 className="text-4xl font-bold">Henry's Website</h1>
      <div className="mt-12 flex flex-wrap justify-center gap-6">
        <FeatureTile
          title="Draw"
          emoji="🎨"
          href="/draw"
          disabled
          comingSoonLabel="coming soon"
        />
      </div>
    </main>
  );
}
```

- [x] **Step 3: Typecheck + commit**

```bash
pnpm typecheck
git add app/page.tsx components/hub/FeatureTile.tsx
git commit -m "Add hub page with coming-soon draw tile"
```

---

## Task 26: Run the full test suite

**Files:** none (just verification).

- [x] **Step 1: Run format check + tests + lint + typecheck in one pass**

```bash
pnpm format:check && pnpm test:run && pnpm typecheck && pnpm lint
```

Expected: every command exits 0. If format:check fails, run `pnpm format` and commit the formatting fixes separately. If anything else fails, fix it in place rather than skipping.

- [x] **Step 2: Commit any fixes**

If fixes were needed, commit them with `git commit -m "Fix issues found by full-suite run"`.

---

## Task 27: Manual acceptance checklist

**Files:** none (human verification).

This is done against the deployed preview (or locally with a tunnel such as `vercel dev` on an https dev URL — WebAuthn requires either HTTPS or `localhost`).

- [x] **Step 1: Deploy to a Vercel preview environment**

```bash
vercel deploy
```

Set env vars via the Vercel dashboard or CLI: `WEBAUTHN_RP_ID` (the preview domain), `WEBAUTHN_ORIGIN` (full URL including https), `WEBAUTHN_RP_NAME`, `ADMIN_SECRET`. Install the **Upstash Redis** integration from the Vercel Marketplace (Storage → Marketplace → Upstash Redis); it auto-provisions `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

- [x] **Step 2: Register the admin (dad) first on a desktop**

Visit `https://<preview>/register?secret=<ADMIN_SECRET>`. Pick "New user", enter `{ username: "dad", displayName: "Dad", emoji: "👨‍💻" }`. Confirm the OS biometric prompt completes. Expect "registered!" status.

- [x] **Step 3: Register Henry on the iPad**

On Henry's iPad, visit `https://<preview>/register?secret=<ADMIN_SECRET>`. Pick "New user", enter `{ username: "henry", displayName: "Henry", emoji: "🦖" }`. Touch ID prompt appears; approve. Expect "registered!".

- [x] **Step 4: Sign Henry in**

On Henry's iPad, visit `https://<preview>/login`. Henry's tile should be enabled (hasPasskey=true). Tap it. Touch ID prompts. On success, redirected to `/`, with "🦖 Henry" pill in the top-right and a "Draw — coming soon" tile in the main area.

- [x] **Step 5: Sign out**

Tap "sign out" in the pill. Expect redirect to `/login`.

- [x] **Step 6: Verify the auth gate holds**

With no cookie (fresh incognito tab), visit `https://<preview>/`. Expect redirect to `/login`.

- [x] **Step 7: Verify the admin gate holds**

Visit `https://<preview>/register` with no `?secret=` — the UI renders, but clicking the register button returns 403 with "forbidden". Visit with a wrong secret — same result.

- [x] **Step 8: Verify cross-device passkey works**

On dad's laptop, visit `https://<preview>/register?secret=<ADMIN_SECRET>`. Pick "Existing user" → Henry, trigger the registration ceremony (a new passkey will be added for Henry on the laptop). Sign out and sign back in as Henry on the laptop — expect success.

If all eight steps pass, Plan A is done. Otherwise log the failure (what you tried, what happened, what you expected) and fix in a follow-up commit.

---

## Post-plan: what's ready for Plan B

After this plan lands:

- Every route except the public allowlist is gated by a valid session.
- The hub is in place with one "coming soon" drawing tile.
- `lib/kv.ts`, `FakeKV`, `lib/random.ts`, and the auth helpers are reusable.
- `@vercel/blob`, `perfect-freehand`, and `lib/drawing/*` have not been added — Plan B will introduce them alongside the drawing routes.
