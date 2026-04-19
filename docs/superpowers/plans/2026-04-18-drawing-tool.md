# Plan B — Drawing Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the drawing tool described in §8 of the v1 spec. Authenticated users get a gallery at `/draw`, an editor at `/draw/[id]`, and a JSON drawing API at `/api/drawings/*`. Freehand ink is rendered with `perfect-freehand`; strokes persist to Vercel Blob, metadata to Upstash Redis, thumbnails to Blob. "Save to Photos" exports a full-res PNG via `<a download>` with an iOS share-sheet fallback. Hub's "coming soon" drawing tile becomes an active link.

**Architecture:** Plan A already provides the session gate (`proxy.ts`), `kv` client (in `@/lib/kv`), `FakeKV` test double (in `@/lib/kv.fake`), random token helper, and `getSessionFromCookie`. Plan B layers the drawing domain on top:

- **Storage split:** Stroke data (potentially tens of KB per drawing) lives in Vercel Blob at `drawings/<userId>/<drawingId>.json`. Thumbnails live in Blob at `drawings/<userId>/<drawingId>.png`. A lightweight metadata record plus per-user drawing list lives in Upstash Redis.
- **Authorization:** Every `/api/drawings/*` handler loads the session from the cookie, loads the drawing metadata, and rejects with 403 when `session.userId !== drawing.userId`. No cross-user reads or writes, ever.
- **Rendering:** Client-only Canvas 2D with `perfect-freehand`. The server stores strokes verbatim but never rasterizes (keeping us off `node-canvas` and its native build pain). The client generates and uploads the PNG thumbnail alongside each autosave.
- **Autosave:** Client debounces 2 seconds after the last `pointerup`, POSTs `{ title, strokes, thumbnailDataUrl }` to `PATCH /api/drawings/[id]`. Title edits save on blur.
- **Testing:** `lib/drawing/*` is pure TS + unit-tested against `FakeKV` and a `FakeBlob` double. API route handlers are tested by calling `GET`/`POST`/`PATCH`/`DELETE` directly with a `Request` and asserting against the response. UI components get one smoke test each; the real acceptance gate is manual iPad testing.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4, `@base-ui/react` + `cva` (already installed by `227ff81`). New runtime deps: `@vercel/blob` v2, `perfect-freehand` v1. Test double for blob storage is in-repo (`FakeBlob`).

**Spec reference:** `docs/superpowers/specs/2026-04-18-henrys-website-v1-design.md` §8.

**Depends on:** Plan A (`docs/superpowers/plans/2026-04-18-auth-and-hub.md`) landed, plus the post-Plan-A review pass (`7047427`) which split `FakeKV` into `lib/kv.fake.ts`, and the Base-UI adoption commit (`227ff81`) which added `@base-ui/react` and `cva`. In particular: `@/lib/kv` (the `kv` singleton), `@/lib/kv.fake` (`FakeKV`), `@/lib/random`, `@/lib/auth/sessions` (`getSessionFromCookie`, `SessionRecord`), `proxy.ts` with the public allowlist, `@/components/hub/FeatureTile`.

**What this plan does NOT build:**

- Server-side rasterization of thumbnails. Thumbnails are produced by the client at save time.
- Multi-user collaboration, sharing, or public gallery.
- Real-time sync across devices (re-opening on another device fetches the latest saved strokes).
- Coloring-book templates or any imported-image feature.
- Any additional hub tiles. The Draw tile becomes active; the page otherwise stays as-is.

**Proxy allowlist:** Unchanged. `/draw`, `/draw/[id]`, and `/api/drawings/*` are all authenticated by the existing gate.

---

## File Structure

**Created by this plan:**

| Path                                      | Responsibility                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `lib/blob.ts`                             | `BlobStore` interface + `vercelBlob` implementation (put/get/delete via `@vercel/blob`) + `FakeBlob` in-memory test double.    |
| `lib/blob.test.ts`                        | Tests for `FakeBlob` round-trip and the `BlobStore` interface contract.                                                        |
| `lib/drawing/types.ts`                    | `Drawing`, `DrawingMeta`, `Stroke`, `Point`, `Brush` interfaces. Single source of truth shared by client and server.           |
| `lib/drawing/ids.ts`                      | `newDrawingId()` — `d_<hex16>`.                                                                                                |
| `lib/drawing/ids.test.ts`                 | Format + uniqueness tests.                                                                                                     |
| `lib/drawing/storage.ts`                  | CRUD against KV + Blob: `listDrawings`, `getDrawing`, `createDrawing`, `updateDrawing`, `deleteDrawing`, `listUserDrawings`.   |
| `lib/drawing/storage.test.ts`             | Tests using `FakeKV` + `FakeBlob`.                                                                                             |
| `lib/drawing/authorization.ts`            | `assertOwnership(session, drawing)` — throws `OwnershipError` on mismatch. `requireDrawing(id, session)` combines load + check. |
| `lib/drawing/authorization.test.ts`       | Owner/non-owner/missing-drawing cases.                                                                                         |
| `app/api/drawings/route.ts`               | `GET` (list mine), `POST` (create empty drawing).                                                                              |
| `app/api/drawings/route.test.ts`          | Auth + happy-path tests.                                                                                                       |
| `app/api/drawings/[id]/route.ts`          | `GET`, `PATCH`, `DELETE` — each gated by `assertOwnership`.                                                                    |
| `app/api/drawings/[id]/route.test.ts`     | Owner reads/writes/deletes; non-owner gets 403; unknown id gets 404.                                                           |
| `app/draw/page.tsx`                       | Gallery server component: reads session, lists drawings, renders `GalleryTile[]` + New button.                                 |
| `app/draw/[id]/page.tsx`                  | Editor shell server component: loads drawing, passes strokes to the client `Canvas`.                                           |
| `app/draw/[id]/not-found.tsx`             | Friendly 404 when a drawing id doesn't exist or isn't yours.                                                                   |
| `components/draw/GalleryTile.tsx`         | Server component rendering one drawing card (thumbnail, title, updated-at, rename/delete menu).                                |
| `components/draw/GalleryActions.tsx`      | Client component hosting the rename/delete actions (prompts + fetch calls).                                                    |
| `components/draw/NewDrawingButton.tsx`    | Client component that POSTs `/api/drawings` then router-navigates to the editor.                                               |
| `components/draw/Canvas.tsx`              | Client component: Canvas 2D + `perfect-freehand` renderer, pointer event wiring, undo/redo stack, autosave, thumbnail export.  |
| `components/draw/Toolbar.tsx`             | Client component: back button, editable title, undo, redo, clear, Save to Photos.                                              |
| `components/draw/BrushRail.tsx`           | Client component: brush preset selector (pen, marker, pencil, eraser).                                                         |
| `components/draw/StrokeControls.tsx`      | Client component: size, opacity, color palette + custom picker.                                                                |
| `components/draw/brushes.ts`              | Pure-TS brush preset table mapping `Brush` → `perfect-freehand` options + composite mode.                                      |
| `components/draw/brushes.test.ts`         | Smoke test that each preset is well-formed.                                                                                    |
| `components/draw/exportPng.ts`            | Client helper: rasterizes a stroke list to a `Blob`/`dataURL` at a given resolution.                                           |
| `components/draw/saveToPhotos.ts`         | Client helper: takes a PNG blob, triggers `<a download>`, falls back to `navigator.share` on iOS when available.               |

**Modified by this plan:**

| Path                  | Change                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `package.json`        | Adds `@vercel/blob` and `perfect-freehand` to dependencies.                                                            |
| `pnpm-lock.yaml`      | Lockfile updated by `pnpm add`.                                                                                        |
| `.env.example`        | Documents `BLOB_READ_WRITE_TOKEN`.                                                                                     |
| `app/page.tsx`        | Drawing tile becomes an active link (`disabled` + `comingSoonLabel` removed).                                          |

**Already in place (from Plan A + the post-Plan-A review/base-ui commits — do not redo):**

- `lib/kv.ts` — exports `kv = Redis.fromEnv()`.
- `lib/kv.fake.ts` — `FakeKV` with a public `reset()` method (call it between tests).
- `lib/random.ts` — `randomToken(bytes)`.
- `lib/auth/sessions.ts` — `getSessionFromCookie()` (no args; reads cookies internally), `SESSION_COOKIE_NAME`, and the `SessionRecord` interface (`{ userId, displayName, emoji }`).
- `proxy.ts` — its matcher and `PUBLIC_PATHS` already gate `/draw`, `/draw/*`, and `/api/drawings/*`. No change needed.
- `components/hub/FeatureTile.tsx` — reused as-is; props are `{ title, emoji, href, disabled?, comingSoonLabel? }`.
- `@base-ui/react` — provides `Button` et al. as low-level primitives; the repo consumes them directly with Tailwind `className` strings (see `components/auth/UserPicker.tsx`, `components/auth/SignOutButton.tsx`). There is no shared `components/ui/` layer yet.
- `cva.config.ts` — exports `cva`, `cx`, `compose` preconfigured with `tailwind-merge`. Use it when a component grows real variants; raw `className` is fine for one-off UI.

---

## Conventions for every task

- Before every commit, run:
  1. `pnpm format` — prettier + tailwind-class sort.
  2. `pnpm typecheck` — `tsc --noEmit`.
  3. `pnpm lint` — eslint with `--max-warnings=0`.
  4. `pnpm test:run` for any files this task touched.

  Fix everything before moving on. Code samples in the plan are written without strict regard for quote style; prettier normalizes them.
- Test files live next to the code they test: `lib/foo.ts` ↔ `lib/foo.test.ts`.
- Follow `AGENTS.md` code standards:
  - `interface` over `type` for object shapes.
  - Arrow functions with implicit returns where possible; otherwise explicit-return arrow; otherwise regular `function`.
  - No explicit return-type annotations (let TS infer).
  - Named exports unless a default is required (Next pages still use `default`).
  - **Path aliases, not relative imports.** Import from `@/lib/…`, `@/components/…`, `@/app/…`. Don't use `../kv`, `./storage`, etc. except inside test files referencing an adjacent helper file co-located with the code under test, and even then prefer `@/…`.
  - **Descriptive names.** Don't self-minify (`b`, `c`, `ctx`, `fmt`, `del`). Use `brush`, `color`, `routeContext`, `formatDate`, `onDelete`, etc.
  - **Component primitives:** prefer `@base-ui/react` primitives (follow the pattern in `components/auth/UserPicker.tsx` and `components/auth/SignOutButton.tsx` — `Button` from `@base-ui/react` with Tailwind `className`). If variant logic grows, use `cva` from `@/cva.config`. Don't invent a `components/ui/` layer unless the shape is shared by 3+ call sites; until then raw Base-UI + Tailwind is the idiom.
- Commit messages: short imperative first line, no period, body optional.

---

## Task 1: Install drawing dependencies

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`.

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add @vercel/blob@^2.0.0 perfect-freehand@^1.2.2
```

- [ ] **Step 2: Verify package.json**

Expected `dependencies` now contains:

```
"@vercel/blob": "^2.0.0",
"perfect-freehand": "^1.2.2",
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Add @vercel/blob and perfect-freehand deps"
```

---

## Task 2: Document Blob env var + Marketplace install

**Files:**

- Modify: `.env.example`
- Create: `docs/superpowers/plans/notes/vercel-blob-install.md` (one-paragraph setup note)

- [ ] **Step 1: Append to `.env.example`**

Append at the end:

```sh
# Vercel Blob (auto-provisioned when you install the Vercel Blob integration
# from the Vercel Marketplace: Storage → Marketplace → Vercel Blob → Install).
# Used to store drawing JSON and thumbnail PNGs under drawings/<userId>/<drawingId>.{json,png}.
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 2: Create install note**

Create `docs/superpowers/plans/notes/vercel-blob-install.md`:

```md
# Vercel Blob setup (one-time, per-environment)

From the Vercel dashboard:

1. Project → Storage → Marketplace → **Vercel Blob** → Install.
2. Attach it to the preview + production environments.
3. Confirm `BLOB_READ_WRITE_TOKEN` appears under Project → Settings → Environment Variables.

For local dev (`pnpm dev`), pull the token locally with `vercel env pull .env.local`.
`FakeBlob` in `lib/blob.ts` covers the test suite with no token.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/superpowers/plans/notes/vercel-blob-install.md
git commit -m "Document Vercel Blob setup + BLOB_READ_WRITE_TOKEN"
```

---

## Task 3: Blob wrapper + FakeBlob

**Files:**

- Create: `lib/blob.ts`
- Create: `lib/blob.test.ts`

We define a narrow `BlobStore` interface — exactly the ops the drawing storage layer uses — and ship two implementations: the real `vercelBlob` backed by `@vercel/blob`, and `FakeBlob` for tests. Consumers import `blobStore` (the singleton); tests replace it with `vi.mock`.

The real implementation accepts `{ access: 'public' }` blobs because Blob URLs need to be fetchable by `<img>` in the gallery. Public blobs still require knowing the randomized Blob URL, which only authenticated users see.

- [ ] **Step 1: Write the failing test**

Create `lib/blob.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeBlob } from '@/lib/blob';

describe('FakeBlob', () => {
  let blob: FakeBlob;
  beforeEach(() => {
    blob = new FakeBlob();
  });

  it('put returns a stable URL and stores the payload', async () => {
    const { url } = await blob.put('x.json', JSON.stringify({ hi: 1 }), {
      contentType: 'application/json',
    });
    expect(url).toContain('x.json');
    expect(await blob.getText(url)).toBe('{"hi":1}');
  });

  it('put overwrites when called twice with the same pathname', async () => {
    const firstPut = await blob.put('p.txt', 'one', {
      contentType: 'text/plain',
    });
    const secondPut = await blob.put('p.txt', 'two', {
      contentType: 'text/plain',
    });
    expect(firstPut.url).toBe(secondPut.url);
    expect(await blob.getText(secondPut.url)).toBe('two');
  });

  it('del removes a stored blob', async () => {
    const { url } = await blob.put('gone.txt', 'bye', {
      contentType: 'text/plain',
    });
    await blob.del(url);
    await expect(blob.getText(url)).rejects.toThrow(/not found/);
  });

  it('put accepts a Uint8Array payload', async () => {
    const { url } = await blob.put('bin.png', new Uint8Array([1, 2, 3]), {
      contentType: 'image/png',
    });
    const bytes = await blob.getBytes(url);
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/blob
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/blob.ts`:

```ts
import { put as vercelPut, del as vercelDel } from '@vercel/blob';

export interface BlobPutOptions {
  contentType: string;
}

export interface BlobPutResult {
  url: string;
  pathname: string;
}

export interface BlobStore {
  put: (
    pathname: string,
    body: string | Uint8Array | ArrayBuffer,
    opts: BlobPutOptions,
  ) => Promise<BlobPutResult>;
  del: (url: string) => Promise<void>;
}

const realBlob: BlobStore = {
  put: async (pathname, body, opts) => {
    const putResult = await vercelPut(pathname, body as Blob | string, {
      access: 'public',
      contentType: opts.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url: putResult.url, pathname: putResult.pathname };
  },
  del: async (url) => {
    await vercelDel(url);
  },
};

export const blobStore: BlobStore = realBlob;

// ---------- test double ----------

interface FakeBlobEntry {
  body: Uint8Array;
  contentType: string;
}

export class FakeBlob implements BlobStore {
  private store = new Map<string, FakeBlobEntry>();

  reset() {
    this.store.clear();
  }

  async put(
    pathname: string,
    body: string | Uint8Array | ArrayBuffer,
    opts: BlobPutOptions,
  ): Promise<BlobPutResult> {
    const bytes =
      typeof body === 'string' ? new TextEncoder().encode(body)
      : body instanceof ArrayBuffer ? new Uint8Array(body)
      : body;
    this.store.set(pathname, { body: bytes, contentType: opts.contentType });
    return { url: `https://fake-blob.local/${pathname}`, pathname };
  }

  async del(url: string): Promise<void> {
    const pathname = url.replace('https://fake-blob.local/', '');
    this.store.delete(pathname);
  }

  async getText(url: string): Promise<string> {
    const pathname = url.replace('https://fake-blob.local/', '');
    const entry = this.store.get(pathname);
    if (!entry) throw new Error(`not found: ${pathname}`);
    return new TextDecoder().decode(entry.body);
  }

  async getBytes(url: string): Promise<Uint8Array> {
    const pathname = url.replace('https://fake-blob.local/', '');
    const entry = this.store.get(pathname);
    if (!entry) throw new Error(`not found: ${pathname}`);
    return entry.body;
  }
}
```

Mirrors the `reset()` shape on `FakeKV` (see `@/lib/kv.fake`) so tests don't reach into private fields.

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/blob
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/blob.ts lib/blob.test.ts
git commit -m "Add Blob wrapper and FakeBlob test double"
```

---

## Task 4: Drawing types + id helper

**Files:**

- Create: `lib/drawing/types.ts`
- Create: `lib/drawing/ids.ts`
- Create: `lib/drawing/ids.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/drawing/ids.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newDrawingId } from '@/lib/drawing/ids';

describe('newDrawingId', () => {
  it('returns a d_<hex16> id', () => {
    expect(newDrawingId()).toMatch(/^d_[0-9a-f]{32}$/);
  });

  it('returns different values on successive calls', () => {
    expect(newDrawingId()).not.toBe(newDrawingId());
  });
});
```

Wait — `randomToken(16)` is 32 hex chars. Test regex is `^d_[0-9a-f]{32}$`. Keep as-is.

- [ ] **Step 2: Implement**

Create `lib/drawing/types.ts`:

```ts
export type Brush = 'pen' | 'marker' | 'pencil' | 'eraser';

export type Point = [x: number, y: number, pressure: number];

export interface Stroke {
  brush: Brush;
  size: number;
  opacity: number;
  color: string;
  points: Point[];
}

export interface DrawingMeta {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  blobJsonUrl: string;
  blobPngUrl: string | null;
}

export interface Drawing extends DrawingMeta {
  strokes: Stroke[];
}
```

Create `lib/drawing/ids.ts`:

```ts
import { randomToken } from '@/lib/random';

export const newDrawingId = () => `d_${randomToken(16)}`;
```

- [ ] **Step 3: Run — expect pass**

```bash
pnpm test:run lib/drawing/ids
```

Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add lib/drawing/types.ts lib/drawing/ids.ts lib/drawing/ids.test.ts
git commit -m "Add drawing types and id helper"
```

---

## Task 5: Drawing storage — create + get

**Files:**

- Create: `lib/drawing/storage.ts`
- Create: `lib/drawing/storage.test.ts`

KV layout (per spec §8.4):

- `drawing:<drawingId>` → `DrawingMeta` (without `strokes`).
- `user:<userId>:drawings` → Set of drawingIds owned by that user.

Strokes live in Blob at `drawings/<userId>/<drawingId>.json`. Thumbnail at `drawings/<userId>/<drawingId>.png`.

`createDrawing(userId)` writes an empty strokes-JSON to Blob, writes `DrawingMeta` to KV, and adds the id to the user's drawing set. Returns the full `Drawing`.

`getDrawing(id)` loads the meta from KV, fetches the strokes JSON from Blob, and returns a combined `Drawing`. Returns `null` when meta is missing.

- [ ] **Step 1: Write the failing test**

Create `lib/drawing/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '@/lib/kv.fake';
import { FakeBlob } from '@/lib/blob';

const fakeKv = new FakeKV();
const fakeBlob = new FakeBlob();

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));
vi.mock('@/lib/blob', async () => {
  const actual = await vi.importActual<typeof import('@/lib/blob')>('@/lib/blob');
  return { ...actual, blobStore: fakeBlob };
});

import {
  createDrawing,
  getDrawing,
  listUserDrawings,
} from '@/lib/drawing/storage';

const resetStores = () => {
  fakeKv.reset();
  fakeBlob.reset();
};

describe('drawing storage — create + get', () => {
  beforeEach(() => resetStores());

  it('createDrawing persists meta + empty strokes JSON, adds to user index', async () => {
    const drawing = await createDrawing('u_1');
    expect(drawing.id).toMatch(/^d_[0-9a-f]{32}$/);
    expect(drawing.userId).toBe('u_1');
    expect(drawing.title).toBe('Untitled');
    expect(drawing.strokes).toEqual([]);
    expect(drawing.blobJsonUrl).toContain(
      `drawings/u_1/${drawing.id}.json`,
    );

    const ids = await listUserDrawings('u_1');
    expect(ids).toContain(drawing.id);

    const loaded = await getDrawing(drawing.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.strokes).toEqual([]);
  });

  it('getDrawing returns null for an unknown id', async () => {
    expect(await getDrawing('d_missing')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/drawing/storage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement create + get + listUserDrawings**

Create `lib/drawing/storage.ts`:

```ts
import { kv } from '@/lib/kv';
import { blobStore } from '@/lib/blob';
import { newDrawingId } from '@/lib/drawing/ids';
import type { Drawing, DrawingMeta, Stroke } from '@/lib/drawing/types';

const drawingKey = (id: string) => `drawing:${id}`;
const userDrawingsKey = (userId: string) => `user:${userId}:drawings`;
const jsonPath = (userId: string, id: string) =>
  `drawings/${userId}/${id}.json`;
const pngPath = (userId: string, id: string) =>
  `drawings/${userId}/${id}.png`;

export const listUserDrawings = async (userId: string) =>
  kv.smembers(userDrawingsKey(userId));

export const createDrawing = async (userId: string): Promise<Drawing> => {
  const id = newDrawingId();
  const now = Date.now();
  const strokes: Stroke[] = [];

  const { url: blobJsonUrl } = await blobStore.put(
    jsonPath(userId, id),
    JSON.stringify(strokes),
    { contentType: 'application/json' },
  );

  const meta: DrawingMeta = {
    id,
    userId,
    title: 'Untitled',
    createdAt: now,
    updatedAt: now,
    blobJsonUrl,
    blobPngUrl: null,
  };

  await kv.set(drawingKey(id), meta);
  await kv.sadd(userDrawingsKey(userId), id);

  return { ...meta, strokes };
};

export const getDrawing = async (id: string): Promise<Drawing | null> => {
  const meta = await kv.get<DrawingMeta>(drawingKey(id));
  if (!meta) return null;
  const strokes = await fetchStrokes(meta.blobJsonUrl);
  return { ...meta, strokes };
};

const fetchStrokes = async (url: string): Promise<Stroke[]> => {
  if (url.startsWith('https://fake-blob.local/')) {
    // Test double path — avoid network fetch so tests stay hermetic.
    const fakeBlobLike = blobStore as unknown as {
      getText?: (fakeUrl: string) => Promise<string>;
    };
    if (fakeBlobLike.getText)
      return JSON.parse(await fakeBlobLike.getText(url)) as Stroke[];
  }
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`blob fetch failed (${response.status})`);
  return (await response.json()) as Stroke[];
};
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/drawing/storage
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/drawing/storage.ts lib/drawing/storage.test.ts
git commit -m "Add drawing storage — create + get"
```

---

## Task 6: Drawing storage — update + delete + list

**Files:**

- Modify: `lib/drawing/storage.ts`
- Modify: `lib/drawing/storage.test.ts`

Update semantics:

- `updateDrawing(id, { title?, strokes?, thumbnailPng? })` patches the meta, rewrites the strokes JSON blob when `strokes` present, uploads a new PNG blob when `thumbnailPng` present, bumps `updatedAt`.
- Autosave race guard: if the caller passes `expectedUpdatedAt` and it doesn't match the stored value, throw `StaleWriteError`.

Delete: remove both blobs, the meta, and the id from the user's set.

List: `listDrawings(userId)` → `DrawingMeta[]` sorted by `updatedAt` desc. (We fan out a `Promise.all` of `kv.get` — the count is bounded by the user's drawings count, which stays in the low hundreds for the foreseeable future. No sorted set needed.)

- [ ] **Step 1: Extend the test**

Append to `lib/drawing/storage.test.ts`:

```ts
import {
  updateDrawing,
  deleteDrawing,
  listDrawings,
  StaleWriteError,
} from '@/lib/drawing/storage';

describe('drawing storage — update/delete/list', () => {
  beforeEach(() => resetStores());

  it('updateDrawing patches title + strokes and bumps updatedAt', async () => {
    const drawing = await createDrawing('u_1');
    const beforeUpdatedAt = drawing.updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 2));

    const updated = await updateDrawing(drawing.id, {
      title: 'My Picture',
      strokes: [
        {
          brush: 'pen',
          size: 8,
          opacity: 1,
          color: '#000',
          points: [[0, 0, 0.5]],
        },
      ],
    });

    expect(updated.title).toBe('My Picture');
    expect(updated.strokes).toHaveLength(1);
    expect(updated.updatedAt).toBeGreaterThan(beforeUpdatedAt);
  });

  it('updateDrawing stores a thumbnail PNG when provided', async () => {
    const drawing = await createDrawing('u_1');
    const pngBytes = new Uint8Array([137, 80, 78, 71]); // fake png header bytes
    const updated = await updateDrawing(drawing.id, {
      thumbnailPng: pngBytes,
    });
    expect(updated.blobPngUrl).toContain(
      `drawings/u_1/${drawing.id}.png`,
    );
  });

  it('updateDrawing rejects stale writes', async () => {
    const drawing = await createDrawing('u_1');
    await updateDrawing(drawing.id, { title: 'v2' });
    await expect(
      updateDrawing(drawing.id, {
        title: 'v3',
        expectedUpdatedAt: drawing.updatedAt,
      }),
    ).rejects.toBeInstanceOf(StaleWriteError);
  });

  it('deleteDrawing removes meta, blobs, and user index entry', async () => {
    const drawing = await createDrawing('u_1');
    await deleteDrawing(drawing.id);
    expect(await getDrawing(drawing.id)).toBeNull();
    expect(await listUserDrawings('u_1')).not.toContain(drawing.id);
  });

  it('listDrawings returns metas sorted by updatedAt desc', async () => {
    const firstDrawing = await createDrawing('u_1');
    await new Promise((resolve) => setTimeout(resolve, 2));
    const secondDrawing = await createDrawing('u_1');
    await new Promise((resolve) => setTimeout(resolve, 2));
    await updateDrawing(firstDrawing.id, { title: 'newer' });

    const list = await listDrawings('u_1');
    expect(list.map((meta) => meta.id)).toEqual([
      firstDrawing.id,
      secondDrawing.id,
    ]);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm test:run lib/drawing/storage
```

Expected: FAIL — missing `updateDrawing`, `deleteDrawing`, `listDrawings`, `StaleWriteError`.

- [ ] **Step 3: Implement**

Append to `lib/drawing/storage.ts`:

```ts
export class StaleWriteError extends Error {
  constructor() {
    super('drawing was updated since you last read it');
    this.name = 'StaleWriteError';
  }
}

interface UpdateInput {
  title?: string;
  strokes?: Stroke[];
  thumbnailPng?: Uint8Array;
  expectedUpdatedAt?: number;
}

export const updateDrawing = async (
  id: string,
  patch: UpdateInput,
): Promise<Drawing> => {
  const meta = await kv.get<DrawingMeta>(drawingKey(id));
  if (!meta) throw new Error(`drawing ${id} not found`);
  if (
    patch.expectedUpdatedAt !== undefined
    && patch.expectedUpdatedAt !== meta.updatedAt
  ) {
    throw new StaleWriteError();
  }

  let blobJsonUrl = meta.blobJsonUrl;
  let strokes: Stroke[] | undefined;
  if (patch.strokes) {
    strokes = patch.strokes;
    const jsonPutResult = await blobStore.put(
      jsonPath(meta.userId, id),
      JSON.stringify(strokes),
      { contentType: 'application/json' },
    );
    blobJsonUrl = jsonPutResult.url;
  }

  let blobPngUrl = meta.blobPngUrl;
  if (patch.thumbnailPng) {
    const pngPutResult = await blobStore.put(
      pngPath(meta.userId, id),
      patch.thumbnailPng,
      { contentType: 'image/png' },
    );
    blobPngUrl = pngPutResult.url;
  }

  const updated: DrawingMeta = {
    ...meta,
    title: patch.title ?? meta.title,
    updatedAt: Date.now(),
    blobJsonUrl,
    blobPngUrl,
  };
  await kv.set(drawingKey(id), updated);

  const finalStrokes = strokes ?? (await fetchStrokes(blobJsonUrl));
  return { ...updated, strokes: finalStrokes };
};

export const deleteDrawing = async (id: string): Promise<void> => {
  const meta = await kv.get<DrawingMeta>(drawingKey(id));
  if (!meta) return;
  await blobStore.del(meta.blobJsonUrl).catch(() => {});
  if (meta.blobPngUrl) await blobStore.del(meta.blobPngUrl).catch(() => {});
  await kv.del(drawingKey(id));
  await kv.srem(userDrawingsKey(meta.userId), id);
};

export const listDrawings = async (
  userId: string,
): Promise<DrawingMeta[]> => {
  const ids = await kv.smembers(userDrawingsKey(userId));
  if (ids.length === 0) return [];
  const metas = await Promise.all(
    ids.map((id) => kv.get<DrawingMeta>(drawingKey(id))),
  );
  return metas
    .filter((meta): meta is DrawingMeta => meta !== null)
    .sort((first, second) => second.updatedAt - first.updatedAt);
};
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test:run lib/drawing/storage
```

Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/drawing/storage.ts lib/drawing/storage.test.ts
git commit -m "Add drawing storage — update, delete, list"
```

---

## Task 7: Ownership authorization helper

**Files:**

- Create: `lib/drawing/authorization.ts`
- Create: `lib/drawing/authorization.test.ts`

`requireOwnedDrawing(id, session)` is the single helper every route handler calls. It loads the drawing, checks ownership, and throws typed errors the route can map to HTTP status codes.

- [ ] **Step 1: Write the failing test**

Create `lib/drawing/authorization.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '@/lib/kv.fake';
import { FakeBlob } from '@/lib/blob';

const fakeKv = new FakeKV();
const fakeBlob = new FakeBlob();

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));
vi.mock('@/lib/blob', async () => {
  const actual = await vi.importActual<typeof import('@/lib/blob')>('@/lib/blob');
  return { ...actual, blobStore: fakeBlob };
});

import { createDrawing } from '@/lib/drawing/storage';
import {
  requireOwnedDrawing,
  DrawingNotFoundError,
  NotOwnerError,
} from '@/lib/drawing/authorization';

const resetStores = () => {
  fakeKv.reset();
  fakeBlob.reset();
};

describe('requireOwnedDrawing', () => {
  beforeEach(() => resetStores());

  it('returns the drawing for its owner', async () => {
    const drawing = await createDrawing('u_owner');
    const got = await requireOwnedDrawing(drawing.id, {
      userId: 'u_owner',
    });
    expect(got.id).toBe(drawing.id);
  });

  it('throws NotOwnerError for a non-owner', async () => {
    const drawing = await createDrawing('u_owner');
    await expect(
      requireOwnedDrawing(drawing.id, { userId: 'u_intruder' }),
    ).rejects.toBeInstanceOf(NotOwnerError);
  });

  it('throws DrawingNotFoundError for an unknown id', async () => {
    await expect(
      requireOwnedDrawing('d_missing', { userId: 'u_owner' }),
    ).rejects.toBeInstanceOf(DrawingNotFoundError);
  });
});
```

- [ ] **Step 2: Implement**

Create `lib/drawing/authorization.ts`:

```ts
import { getDrawing } from '@/lib/drawing/storage';
import type { Drawing } from '@/lib/drawing/types';

export class DrawingNotFoundError extends Error {
  constructor(public id: string) {
    super(`drawing ${id} not found`);
    this.name = 'DrawingNotFoundError';
  }
}

export class NotOwnerError extends Error {
  constructor() {
    super('not the owner of this drawing');
    this.name = 'NotOwnerError';
  }
}

// Narrow contract — only the field this helper actually uses. The real
// session returned by `getSessionFromCookie` (`SessionRecord` in
// `@/lib/auth/sessions`) structurally satisfies this interface.
export interface SessionLike {
  userId: string;
}

export const requireOwnedDrawing = async (
  id: string,
  session: SessionLike,
): Promise<Drawing> => {
  const drawing = await getDrawing(id);
  if (!drawing) throw new DrawingNotFoundError(id);
  if (drawing.userId !== session.userId) throw new NotOwnerError();
  return drawing;
};
```

- [ ] **Step 3: Run — expect pass**

```bash
pnpm test:run lib/drawing/authorization
```

Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add lib/drawing/authorization.ts lib/drawing/authorization.test.ts
git commit -m "Add drawing ownership guard"
```

---

## Task 8: API — `GET /api/drawings`, `POST /api/drawings`

**Files:**

- Create: `app/api/drawings/route.ts`
- Create: `app/api/drawings/route.test.ts`

- `GET /api/drawings` — returns `{ drawings: DrawingMeta[] }` for the signed-in user.
- `POST /api/drawings` — creates an empty drawing and returns `{ drawing: Drawing }`.

Both require an authenticated session. We mock `getSessionFromCookie` in tests.

- [ ] **Step 1: Write the failing test**

Create `app/api/drawings/route.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '@/lib/kv.fake';
import { FakeBlob } from '@/lib/blob';

const fakeKv = new FakeKV();
const fakeBlob = new FakeBlob();

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));
vi.mock('@/lib/blob', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/blob')>('@/lib/blob');
  return { ...actual, blobStore: fakeBlob };
});

const defaultSession = { userId: 'u_1' };
let currentSession: { userId: string } | null = defaultSession;

vi.mock('@/lib/auth/sessions', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/auth/sessions')>(
      '@/lib/auth/sessions',
    );
  return {
    ...actual,
    getSessionFromCookie: async () => currentSession,
  };
});

import { GET, POST } from '@/app/api/drawings/route';

const resetStores = () => {
  fakeKv.reset();
  fakeBlob.reset();
  currentSession = defaultSession;
};

describe('GET /api/drawings', () => {
  beforeEach(() => resetStores());

  it('401 without a session', async () => {
    currentSession = null;
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns an empty list for a fresh user', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ drawings: [] });
  });
});

describe('POST /api/drawings', () => {
  beforeEach(() => resetStores());

  it('401 without a session', async () => {
    currentSession = null;
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it('creates a drawing and returns it', async () => {
    const response = await POST();
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.drawing.id).toMatch(/^d_[0-9a-f]{32}$/);
    expect(body.drawing.userId).toBe('u_1');
  });
});
```

- [ ] **Step 2: Implement**

Create `app/api/drawings/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import { createDrawing, listDrawings } from '@/lib/drawing/storage';

export const GET = async () => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const drawings = await listDrawings(session.userId);
  return NextResponse.json({ drawings });
};

export const POST = async () => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const drawing = await createDrawing(session.userId);
  return NextResponse.json({ drawing }, { status: 201 });
};
```

- [ ] **Step 3: Run — expect pass**

```bash
pnpm test:run app/api/drawings/route
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/drawings/route.ts app/api/drawings/route.test.ts
git commit -m "Add /api/drawings GET + POST"
```

---

## Task 9: API — `GET/PATCH/DELETE /api/drawings/[id]`

**Files:**

- Create: `app/api/drawings/[id]/route.ts`
- Create: `app/api/drawings/[id]/route.test.ts`

Every handler:

1. Loads the session. No session → 401.
2. Calls `requireOwnedDrawing(id, session)`. Maps `DrawingNotFoundError` → 404 and `NotOwnerError` → 403.
3. Performs the operation.

`PATCH` body shape (all fields optional):

```ts
{
  title?: string;
  strokes?: Stroke[];
  thumbnailPngBase64?: string; // client-rasterized thumbnail as base64
  expectedUpdatedAt?: number;
}
```

Note: `params` is a `Promise<...>` in Next 15+ (`params: Promise<{ id: string }>`), and we `await` it.

- [ ] **Step 1: Write the failing test**

Create `app/api/drawings/[id]/route.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeKV } from '@/lib/kv.fake';
import { FakeBlob } from '@/lib/blob';

const fakeKv = new FakeKV();
const fakeBlob = new FakeBlob();

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));
vi.mock('@/lib/blob', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/blob')>('@/lib/blob');
  return { ...actual, blobStore: fakeBlob };
});

let currentSession: { userId: string } | null = { userId: 'u_owner' };
vi.mock('@/lib/auth/sessions', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/auth/sessions')>(
      '@/lib/auth/sessions',
    );
  return {
    ...actual,
    getSessionFromCookie: async () => currentSession,
  };
});

import { createDrawing } from '@/lib/drawing/storage';
import { GET, PATCH, DELETE } from '@/app/api/drawings/[id]/route';

const resetStores = () => {
  fakeKv.reset();
  fakeBlob.reset();
  currentSession = { userId: 'u_owner' };
};

const makeRouteContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe('/api/drawings/[id]', () => {
  beforeEach(() => resetStores());

  it('GET 401 without session', async () => {
    currentSession = null;
    const response = await GET(
      new Request('http://t/'),
      makeRouteContext('d_x'),
    );
    expect(response.status).toBe(401);
  });

  it('GET 404 for unknown id', async () => {
    const response = await GET(
      new Request('http://t/'),
      makeRouteContext('d_missing'),
    );
    expect(response.status).toBe(404);
  });

  it('GET 403 for non-owner', async () => {
    const drawing = await createDrawing('u_owner');
    currentSession = { userId: 'u_other' };
    const response = await GET(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );
    expect(response.status).toBe(403);
  });

  it('GET returns the drawing for its owner', async () => {
    const drawing = await createDrawing('u_owner');
    const response = await GET(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).drawing.id).toBe(drawing.id);
  });

  it('PATCH updates title + strokes', async () => {
    const drawing = await createDrawing('u_owner');
    const response = await PATCH(
      new Request('http://t/', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Cool',
          strokes: [
            {
              brush: 'pen',
              size: 8,
              opacity: 1,
              color: '#000',
              points: [[0, 0, 0.5]],
            },
          ],
        }),
      }),
      makeRouteContext(drawing.id),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.drawing.title).toBe('Cool');
    expect(body.drawing.strokes).toHaveLength(1);
  });

  it('PATCH 403 for non-owner', async () => {
    const drawing = await createDrawing('u_owner');
    currentSession = { userId: 'u_other' };
    const response = await PATCH(
      new Request('http://t/', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'x' }),
      }),
      makeRouteContext(drawing.id),
    );
    expect(response.status).toBe(403);
  });

  it('DELETE removes the drawing', async () => {
    const drawing = await createDrawing('u_owner');
    const deleteResponse = await DELETE(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );
    expect(deleteResponse.status).toBe(204);

    const refetch = await GET(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );
    expect(refetch.status).toBe(404);
  });

  it('DELETE 403 for non-owner', async () => {
    const drawing = await createDrawing('u_owner');
    currentSession = { userId: 'u_other' };
    const response = await DELETE(
      new Request('http://t/'),
      makeRouteContext(drawing.id),
    );
    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: Implement**

Create `app/api/drawings/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import {
  requireOwnedDrawing,
  DrawingNotFoundError,
  NotOwnerError,
} from '@/lib/drawing/authorization';
import { updateDrawing, deleteDrawing, StaleWriteError } from '@/lib/drawing/storage';
import type { Stroke } from '@/lib/drawing/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const mapAuthError = (error: unknown) => {
  if (error instanceof DrawingNotFoundError)
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (error instanceof NotOwnerError)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  throw error;
};

export const GET = async (_request: Request, routeContext: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await routeContext.params;
  try {
    const drawing = await requireOwnedDrawing(id, session);
    return NextResponse.json({ drawing });
  } catch (error) {
    return mapAuthError(error);
  }
};

interface PatchBody {
  title?: string;
  strokes?: Stroke[];
  thumbnailPngBase64?: string;
  expectedUpdatedAt?: number;
}

const decodeBase64Png = (encoded: string): Uint8Array => {
  const binary = atob(encoded.replace(/^data:image\/png;base64,/, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
};

export const PATCH = async (request: Request, routeContext: RouteContext) => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await routeContext.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  try {
    await requireOwnedDrawing(id, session);
  } catch (error) {
    return mapAuthError(error);
  }

  try {
    const drawing = await updateDrawing(id, {
      title: body.title,
      strokes: body.strokes,
      thumbnailPng:
        body.thumbnailPngBase64 ?
          decodeBase64Png(body.thumbnailPngBase64)
        : undefined,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    return NextResponse.json({ drawing });
  } catch (error) {
    if (error instanceof StaleWriteError)
      return NextResponse.json({ error: 'stale write' }, { status: 409 });
    throw error;
  }
};

export const DELETE = async (
  _request: Request,
  routeContext: RouteContext,
) => {
  const session = await getSessionFromCookie();
  if (!session)
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await routeContext.params;
  try {
    await requireOwnedDrawing(id, session);
  } catch (error) {
    return mapAuthError(error);
  }
  await deleteDrawing(id);
  return new Response(null, { status: 204 });
};
```

- [ ] **Step 3: Run — expect pass**

```bash
pnpm test:run app/api/drawings
```

Expected: PASS (all tests in both suites).

- [ ] **Step 4: Commit**

```bash
git add app/api/drawings/[id]/route.ts app/api/drawings/[id]/route.test.ts
git commit -m "Add /api/drawings/[id] GET, PATCH, DELETE"
```

---

## Task 10: Brush presets table

**Files:**

- Create: `components/draw/brushes.ts`
- Create: `components/draw/brushes.test.ts`

We separate the brush preset table so it stays pure TS and can be unit tested and reused in both editor wiring and the export rasterizer.

- [ ] **Step 1: Write the failing test**

Create `components/draw/brushes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BRUSHES, BRUSH_LIST } from '@/components/draw/brushes';

describe('brush presets', () => {
  it('defines all four brushes', () => {
    expect(BRUSH_LIST).toEqual(['pen', 'marker', 'pencil', 'eraser']);
  });

  it('each preset has well-formed options', () => {
    for (const brush of BRUSH_LIST) {
      const preset = BRUSHES[brush];
      expect(typeof preset.options.size).toBe('number');
      expect(typeof preset.options.thinning).toBe('number');
      expect(['source-over', 'destination-out']).toContain(preset.composite);
    }
  });

  it('eraser uses destination-out', () => {
    expect(BRUSHES.eraser.composite).toBe('destination-out');
  });
});
```

- [ ] **Step 2: Implement**

Create `components/draw/brushes.ts`:

```ts
import type { Brush } from '@/lib/drawing/types';

export interface BrushOptions {
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
  start: { taper: number; cap: boolean };
  end: { taper: number; cap: boolean };
}

export interface BrushPreset {
  options: BrushOptions;
  composite: 'source-over' | 'destination-out';
}

export const BRUSHES: Record<Brush, BrushPreset> = {
  pen: {
    options: {
      size: 8,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    },
    composite: 'source-over',
  },
  marker: {
    options: {
      size: 16,
      thinning: 0,
      smoothing: 0.25,
      streamline: 0.3,
      simulatePressure: false,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    },
    composite: 'source-over',
  },
  pencil: {
    options: {
      size: 4,
      thinning: 0.75,
      smoothing: 0.6,
      streamline: 0.5,
      simulatePressure: true,
      start: { taper: 2, cap: true },
      end: { taper: 2, cap: true },
    },
    composite: 'source-over',
  },
  eraser: {
    options: {
      size: 24,
      thinning: 0.2,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    },
    composite: 'destination-out',
  },
};

export const BRUSH_LIST: Brush[] = ['pen', 'marker', 'pencil', 'eraser'];
```

- [ ] **Step 3: Commit**

```bash
pnpm test:run components/draw/brushes
git add components/draw/brushes.ts components/draw/brushes.test.ts
git commit -m "Add brush preset table"
```

---

## Task 11: Stroke-to-canvas rasterizer (client helper)

**Files:**

- Create: `components/draw/exportPng.ts`

A single pure function `rasterizeStrokes(strokes, { width, height, background })` that draws a stroke list to an offscreen canvas and returns the `HTMLCanvasElement`. This is what both the thumbnail (called at autosave) and the full-res export (called by "Save to Photos") use.

- [ ] **Step 1: Implement**

Create `components/draw/exportPng.ts`:

```ts
import getStroke from 'perfect-freehand';
import { BRUSHES } from '@/components/draw/brushes';
import type { Stroke } from '@/lib/drawing/types';

const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 1600;

interface RasterizeOptions {
  width?: number;
  height?: number;
  background?: string;
}

export const rasterizeStrokes = (
  strokes: Stroke[],
  opts: RasterizeOptions = {},
): HTMLCanvasElement => {
  const width = opts.width ?? LOGICAL_WIDTH;
  const height = opts.height ?? LOGICAL_HEIGHT;
  const scaleX = width / LOGICAL_WIDTH;
  const scaleY = height / LOGICAL_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2d context');

  context.fillStyle = opts.background ?? '#ffffff';
  context.fillRect(0, 0, width, height);

  for (const stroke of strokes) {
    const preset = BRUSHES[stroke.brush];
    const scaledPoints = stroke.points.map(
      ([x, y, pressure]) =>
        [x * scaleX, y * scaleY, pressure] as [number, number, number],
    );
    const outline = getStroke(scaledPoints, {
      ...preset.options,
      size: stroke.size * Math.min(scaleX, scaleY),
    });
    if (outline.length === 0) continue;

    context.globalCompositeOperation = preset.composite;
    context.fillStyle = stroke.color;
    context.globalAlpha = stroke.opacity;
    context.beginPath();
    context.moveTo(outline[0][0], outline[0][1]);
    for (let index = 1; index < outline.length; index++) {
      context.lineTo(outline[index][0], outline[index][1]);
    }
    context.closePath();
    context.fill();
  }

  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  return canvas;
};

export const canvasToPngDataUrl = (canvas: HTMLCanvasElement) =>
  canvas.toDataURL('image/png');

export const canvasToPngBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('toBlob failed')),
      'image/png',
    );
  });
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/draw/exportPng.ts
git commit -m "Add stroke-to-canvas rasterizer helper"
```

---

## Task 12: Save-to-Photos client helper

**Files:**

- Create: `components/draw/saveToPhotos.ts`

- [ ] **Step 1: Implement**

Create `components/draw/saveToPhotos.ts`:

```ts
export const saveBlobToPhotos = async (blob: Blob, filename: string) => {
  const file = new File([blob], filename, { type: 'image/png' });

  // Prefer the share sheet on iOS when it can handle files — that's the path
  // that surfaces "Save to Photos" alongside AirDrop/Messages.
  const navigatorWithShare = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (
    navigatorWithShare.share
    && navigatorWithShare.canShare
    && navigatorWithShare.canShare({ files: [file] })
  ) {
    try {
      await navigatorWithShare.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      // fall through to download
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = objectUrl;
  downloadAnchor.download = filename;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const sanitizeFilename = (title: string, id: string) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'untitled';
  const short = id.replace(/^d_/, '').slice(0, 8);
  return `${slug}-${short}.png`;
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add components/draw/saveToPhotos.ts
git commit -m "Add Save-to-Photos client helper"
```

---

## Task 13: `Canvas` client component (perfect-freehand wiring, undo/redo, autosave)

**Files:**

- Create: `components/draw/Canvas.tsx`

This is the biggest file in the plan. Responsibilities:

- Keep an in-memory `strokes: Stroke[]` and a `redoStack: Stroke[]`.
- Receive pointer events and build one live stroke at a time; on `pointerup`, commit it to `strokes` and clear `redoStack`.
- Redraw the whole canvas from `strokes` every frame that changes. (Acceptable at spec scale — 1200×1600, a few hundred strokes per drawing. Optimize later if it lags on iPad.)
- Expose an imperative handle for the toolbar: `undo()`, `redo()`, `clear()`, `getStrokes()`, `exportFullRes()`.
- Autosave: debounce 2 s after the last `pointerup`, POST `PATCH /api/drawings/[id]` with `{ strokes, thumbnailPngBase64 }`. Thumbnail is `rasterizeStrokes(..., { width: 400, height: 533 })` as base64.

- [ ] **Step 1: Implement**

Create `components/draw/Canvas.tsx`:

```tsx
'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import getStroke from 'perfect-freehand';
import type { Brush, Stroke } from '@/lib/drawing/types';
import { BRUSHES } from '@/components/draw/brushes';
import {
  canvasToPngBlob,
  canvasToPngDataUrl,
  rasterizeStrokes,
} from '@/components/draw/exportPng';

export const LOGICAL_WIDTH = 1200;
export const LOGICAL_HEIGHT = 1600;
const AUTOSAVE_DEBOUNCE_MS = 2000;

export interface StrokeControls {
  brush: Brush;
  size: number;
  opacity: number;
  color: string;
}

export interface CanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  getStrokes: () => Stroke[];
  exportFullResBlob: () => Promise<Blob>;
}

interface Props {
  drawingId: string;
  initialStrokes: Stroke[];
  controls: StrokeControls;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveStateChange?: (state: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { drawingId, initialStrokes, controls, onDirtyChange, onSaveStateChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>(initialStrokes);
  const redoRef = useRef<Stroke[]>([]);
  const liveRef = useRef<Stroke | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRedraw] = useState(0);
  const redraw = useCallback(
    () => forceRedraw((tick) => tick + 1),
    [],
  );

  // --- drawing ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = LOGICAL_WIDTH * devicePixelRatio;
    canvas.height = LOGICAL_HEIGHT * devicePixelRatio;
    canvas.style.width = `${LOGICAL_WIDTH}px`;
    canvas.style.height = `${LOGICAL_HEIGHT}px`;
    const context = canvas.getContext('2d');
    if (context) context.scale(devicePixelRatio, devicePixelRatio);
    paintAll();
  }, []);

  const paintAll = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();

    const allStrokes =
      liveRef.current ?
        [...strokesRef.current, liveRef.current]
      : strokesRef.current;
    for (const stroke of allStrokes) paintStroke(context, stroke);
  }, []);

  useEffect(paintAll);

  const paintStroke = (
    context: CanvasRenderingContext2D,
    stroke: Stroke,
  ) => {
    const preset = BRUSHES[stroke.brush];
    const outline = getStroke(stroke.points, {
      ...preset.options,
      size: stroke.size,
    });
    if (outline.length === 0) return;
    context.globalCompositeOperation = preset.composite;
    context.fillStyle = stroke.color;
    context.globalAlpha = stroke.opacity;
    context.beginPath();
    context.moveTo(outline[0][0], outline[0][1]);
    for (let index = 1; index < outline.length; index++)
      context.lineTo(outline[index][0], outline[index][1]);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  };

  // --- pointer events ---

  const pointerPos = (
    event: React.PointerEvent,
  ): [number, number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    const pressure =
      event.pointerType === 'pen' ? event.pressure || 0.5 : 0.5;
    return [x, y, pressure];
  };

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    liveRef.current = {
      brush: controls.brush,
      size: controls.size,
      opacity: controls.opacity,
      color: controls.color,
      points: [pointerPos(event)],
    };
    redraw();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!liveRef.current) return;
    liveRef.current.points.push(pointerPos(event));
    redraw();
  };

  const onPointerUp = () => {
    if (!liveRef.current) return;
    strokesRef.current = [...strokesRef.current, liveRef.current];
    redoRef.current = [];
    liveRef.current = null;
    onDirtyChange?.(true);
    scheduleAutosave();
    redraw();
  };

  // --- autosave ---

  const scheduleAutosave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void runAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const runAutosave = async () => {
    onSaveStateChange?.('saving');
    try {
      const thumbCanvas = rasterizeStrokes(strokesRef.current, {
        width: 400,
        height: 533,
      });
      const response = await fetch(`/api/drawings/${drawingId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          strokes: strokesRef.current,
          thumbnailPngBase64: canvasToPngDataUrl(thumbCanvas),
        }),
      });
      if (!response.ok) throw new Error(`save failed: ${response.status}`);
      onDirtyChange?.(false);
      onSaveStateChange?.('saved');
    } catch {
      onSaveStateChange?.('error');
    }
  };

  // --- imperative handle ---

  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        const lastStroke = strokesRef.current[strokesRef.current.length - 1];
        if (!lastStroke) return;
        strokesRef.current = strokesRef.current.slice(0, -1);
        redoRef.current = [...redoRef.current, lastStroke];
        onDirtyChange?.(true);
        scheduleAutosave();
        redraw();
      },
      redo: () => {
        const nextStroke = redoRef.current[redoRef.current.length - 1];
        if (!nextStroke) return;
        redoRef.current = redoRef.current.slice(0, -1);
        strokesRef.current = [...strokesRef.current, nextStroke];
        onDirtyChange?.(true);
        scheduleAutosave();
        redraw();
      },
      clear: () => {
        if (strokesRef.current.length === 0) return;
        strokesRef.current = [];
        redoRef.current = [];
        onDirtyChange?.(true);
        scheduleAutosave();
        redraw();
      },
      getStrokes: () => strokesRef.current,
      exportFullResBlob: () =>
        canvasToPngBlob(
          rasterizeStrokes(strokesRef.current, {
            width: LOGICAL_WIDTH * 2,
            height: LOGICAL_HEIGHT * 2,
          }),
        ),
    }),
    [drawingId],
  );

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="touch-none rounded-lg bg-white shadow-lg"
      style={{ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT }}
    />
  );
});
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/draw/Canvas.tsx
git commit -m "Add Canvas with perfect-freehand + autosave"
```

---

## Task 14: `BrushRail` + `StrokeControls` components

**Files:**

- Create: `components/draw/BrushRail.tsx`
- Create: `components/draw/StrokeControls.tsx`

- [ ] **Step 1: Implement BrushRail**

Create `components/draw/BrushRail.tsx`:

```tsx
'use client';

import { Button } from '@base-ui/react';
import type { Brush } from '@/lib/drawing/types';
import { BRUSH_LIST } from '@/components/draw/brushes';

interface Props {
  value: Brush;
  onChange: (brush: Brush) => void;
}

const BRUSH_LABEL: Record<Brush, string> = {
  pen: 'Pen',
  marker: 'Marker',
  pencil: 'Pencil',
  eraser: 'Eraser',
};

const BRUSH_EMOJI: Record<Brush, string> = {
  pen: '🖊️',
  marker: '🖍️',
  pencil: '✏️',
  eraser: '🧽',
};

export const BrushRail = ({ value, onChange }: Props) => (
  <div className="flex flex-col gap-2">
    {BRUSH_LIST.map((brush) => (
      <Button
        key={brush}
        onClick={() => onChange(brush)}
        aria-pressed={value === brush}
        className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl transition ${
          value === brush ? 'bg-black text-white' : 'bg-white shadow'
        }`}
      >
        <span className="text-2xl">{BRUSH_EMOJI[brush]}</span>
        <span className="text-[10px]">{BRUSH_LABEL[brush]}</span>
      </Button>
    ))}
  </div>
);
```

Mirrors the Base-UI idiom in `components/auth/UserPicker.tsx` — `Button` from `@base-ui/react` with Tailwind `className` strings.

- [ ] **Step 2: Implement StrokeControls**

Create `components/draw/StrokeControls.tsx`:

```tsx
'use client';

import { Button } from '@base-ui/react';
import { useState } from 'react';

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#8e24aa',
  '#d81b60',
  '#6d4c41',
  '#00acc1',
  '#757575',
];

interface Props {
  size: number;
  opacity: number;
  color: string;
  onSizeChange: (size: number) => void;
  onOpacityChange: (opacity: number) => void;
  onColorChange: (color: string) => void;
}

export const StrokeControls = ({
  size,
  opacity,
  color,
  onSizeChange,
  onOpacityChange,
  onColorChange,
}: Props) => {
  const [recentColors, setRecentColors] = useState<string[]>([]);

  const pickColor = (chosen: string) => {
    onColorChange(chosen);
    setRecentColors((previous) =>
      [chosen, ...previous.filter((other) => other !== chosen)].slice(0, 6),
    );
  };

  return (
    <div className="flex w-52 flex-col gap-4 rounded-xl bg-white p-4 shadow">
      <label className="block">
        <span className="text-xs font-semibold">Size: {size}</span>
        <input
          type="range"
          min={1}
          max={60}
          value={size}
          onChange={(event) => onSizeChange(Number(event.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold">
          Opacity: {Math.round(opacity * 100)}%
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={opacity * 100}
          onChange={(event) =>
            onOpacityChange(Number(event.target.value) / 100)
          }
          className="mt-1 w-full"
        />
      </label>
      <div>
        <span className="text-xs font-semibold">Color</span>
        <div className="mt-1 grid grid-cols-6 gap-1">
          {PRESET_COLORS.map((presetColor) => (
            <Button
              key={presetColor}
              aria-label={presetColor}
              onClick={() => pickColor(presetColor)}
              className={`h-8 w-8 rounded-full border ${
                color === presetColor ? 'ring-2 ring-black' : ''
              }`}
              style={{ background: presetColor }}
            />
          ))}
        </div>
        <input
          type="color"
          value={color}
          onChange={(event) => pickColor(event.target.value)}
          className="mt-2 h-8 w-full"
          aria-label="custom color"
        />
        {recentColors.length > 0 && (
          <div className="mt-2 flex gap-1" aria-label="Recent colors">
            {recentColors.map((recentColor) => (
              <Button
                key={recentColor}
                onClick={() => pickColor(recentColor)}
                className="h-6 w-6 rounded-full border"
                style={{ background: recentColor }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm typecheck
git add components/draw/BrushRail.tsx components/draw/StrokeControls.tsx
git commit -m "Add BrushRail and StrokeControls"
```

---

## Task 15: `Toolbar` component

**Files:**

- Create: `components/draw/Toolbar.tsx`

- [ ] **Step 1: Implement**

Create `components/draw/Toolbar.tsx`:

```tsx
'use client';

import { Button } from '@base-ui/react';
import Link from 'next/link';
import { useState } from 'react';

interface Props {
  title: string;
  onTitleChange: (title: string) => void;
  onTitleCommit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSaveToPhotos: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
}

export const Toolbar = ({
  title,
  onTitleChange,
  onTitleCommit,
  onUndo,
  onRedo,
  onClear,
  onSaveToPhotos,
  saveState,
}: Props) => {
  const [draftTitle, setDraftTitle] = useState(title);

  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-white p-3 shadow">
      <Link
        href="/draw"
        className="rounded bg-gray-100 px-3 py-2 text-sm font-semibold"
      >
        ← Gallery
      </Link>
      <input
        className="flex-1 rounded border px-3 py-2 text-lg font-semibold"
        value={draftTitle}
        onChange={(event) => {
          setDraftTitle(event.target.value);
          onTitleChange(event.target.value);
        }}
        onBlur={onTitleCommit}
        aria-label="title"
      />
      <Button
        onClick={onUndo}
        className="rounded bg-gray-100 px-3 py-2 text-sm"
      >
        Undo
      </Button>
      <Button
        onClick={onRedo}
        className="rounded bg-gray-100 px-3 py-2 text-sm"
      >
        Redo
      </Button>
      <Button
        onClick={() => {
          if (confirm('Clear the whole drawing?')) onClear();
        }}
        className="rounded bg-gray-100 px-3 py-2 text-sm"
      >
        Clear
      </Button>
      <Button
        onClick={onSaveToPhotos}
        className="rounded bg-black px-4 py-2 text-sm font-semibold text-white"
      >
        Save to Photos
      </Button>
      <span className="w-20 text-right text-xs text-gray-500">
        {saveState === 'saving' && 'saving…'}
        {saveState === 'saved' && 'saved'}
        {saveState === 'error' && 'save failed'}
      </span>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add components/draw/Toolbar.tsx
git commit -m "Add drawing Toolbar"
```

---

## Task 16: Editor shell (`/draw/[id]`) + client `Editor`

**Files:**

- Create: `app/draw/[id]/page.tsx`
- Create: `app/draw/[id]/not-found.tsx`
- Create: `components/draw/Editor.tsx`

The page is a server component that loads the drawing and renders the client `Editor`, which composes `Toolbar`, `BrushRail`, `StrokeControls`, and `Canvas`.

- [ ] **Step 1: Implement Editor client component**

Create `components/draw/Editor.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import type { Drawing, Brush } from '@/lib/drawing/types';
import {
  Canvas,
  type CanvasHandle,
  type StrokeControls,
} from '@/components/draw/Canvas';
import { BrushRail } from '@/components/draw/BrushRail';
import { StrokeControls as StrokeControlsPanel } from '@/components/draw/StrokeControls';
import { Toolbar } from '@/components/draw/Toolbar';
import {
  sanitizeFilename,
  saveBlobToPhotos,
} from '@/components/draw/saveToPhotos';

interface Props {
  drawing: Drawing;
}

export const Editor = ({ drawing }: Props) => {
  const canvasRef = useRef<CanvasHandle>(null);
  const [title, setTitle] = useState(drawing.title);
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [controls, setControls] = useState<StrokeControls>({
    brush: 'pen' as Brush,
    size: 8,
    opacity: 1,
    color: '#000000',
  });

  const commitTitle = async () => {
    if (title === drawing.title) return;
    setSaveState('saving');
    const response = await fetch(`/api/drawings/${drawing.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSaveState(response.ok ? 'saved' : 'error');
  };

  const onSaveToPhotos = async () => {
    const blob = await canvasRef.current?.exportFullResBlob();
    if (!blob) return;
    await saveBlobToPhotos(blob, sanitizeFilename(title, drawing.id));
  };

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 p-4">
      <Toolbar
        title={title}
        onTitleChange={setTitle}
        onTitleCommit={commitTitle}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onClear={() => canvasRef.current?.clear()}
        onSaveToPhotos={onSaveToPhotos}
        saveState={saveState}
      />
      <div className="flex gap-4">
        <BrushRail
          value={controls.brush}
          onChange={(brush) =>
            setControls((current) => ({ ...current, brush }))
          }
        />
        <div className="flex-1 overflow-auto">
          <Canvas
            ref={canvasRef}
            drawingId={drawing.id}
            initialStrokes={drawing.strokes}
            controls={controls}
            onSaveStateChange={setSaveState}
          />
        </div>
        <StrokeControlsPanel
          size={controls.size}
          opacity={controls.opacity}
          color={controls.color}
          onSizeChange={(size) =>
            setControls((current) => ({ ...current, size }))
          }
          onOpacityChange={(opacity) =>
            setControls((current) => ({ ...current, opacity }))
          }
          onColorChange={(color) =>
            setControls((current) => ({ ...current, color }))
          }
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Implement the editor page (server component)**

Create `app/draw/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import {
  requireOwnedDrawing,
  NotOwnerError,
  DrawingNotFoundError,
} from '@/lib/drawing/authorization';
import { Editor } from '@/components/draw/Editor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DrawEditorPage({ params }: PageProps) {
  const session = await getSessionFromCookie();
  if (!session) notFound(); // proxy.ts should have redirected; belt-and-suspenders

  const { id } = await params;
  try {
    const drawing = await requireOwnedDrawing(id, session);
    return <Editor drawing={drawing} />;
  } catch (error) {
    if (
      error instanceof DrawingNotFoundError
      || error instanceof NotOwnerError
    ) {
      notFound();
    }
    throw error;
  }
}
```

- [ ] **Step 3: Implement the not-found**

Create `app/draw/[id]/not-found.tsx`:

```tsx
import Link from 'next/link';

const NotFound = () => (
  <main className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8">
    <h1 className="text-2xl font-bold">This drawing isn&apos;t here.</h1>
    <p>It might have been deleted, or it belongs to someone else.</p>
    <Link href="/draw" className="rounded bg-black px-4 py-2 text-white">
      Back to gallery
    </Link>
  </main>
);

export default NotFound;
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm typecheck
git add app/draw/[id]/page.tsx app/draw/[id]/not-found.tsx components/draw/Editor.tsx
git commit -m "Add editor page + Editor client shell"
```

---

## Task 17: Gallery page (`/draw`)

**Files:**

- Create: `app/draw/page.tsx`
- Create: `components/draw/GalleryTile.tsx`
- Create: `components/draw/GalleryActions.tsx`
- Create: `components/draw/NewDrawingButton.tsx`

`/draw` is a server component that reads the session, calls `listDrawings`, and renders a grid. Each tile is rendered server-side; its rename/delete actions are a small client component embedded in the tile.

The "New Drawing" button is a client component that POSTs `/api/drawings` and router-pushes to the editor.

- [ ] **Step 1: Implement NewDrawingButton**

Create `components/draw/NewDrawingButton.tsx`:

```tsx
'use client';

import { Button } from '@base-ui/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const NewDrawingButton = () => {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const createDrawing = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/drawings', { method: 'POST' });
      if (!response.ok)
        throw new Error(`create failed (${response.status})`);
      const { drawing } = await response.json();
      router.push(`/draw/${drawing.id}`);
    } catch (error) {
      alert((error as Error).message);
      setCreating(false);
    }
  };

  return (
    <Button
      onClick={createDrawing}
      disabled={creating}
      className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-3xl bg-white shadow-lg transition active:scale-95 disabled:opacity-50"
    >
      <span className="text-6xl">＋</span>
      <span className="text-lg font-semibold">
        {creating ? 'Creating…' : 'New Drawing'}
      </span>
    </Button>
  );
};
```

- [ ] **Step 2: Implement GalleryActions**

Create `components/draw/GalleryActions.tsx`:

```tsx
'use client';

import { Button } from '@base-ui/react';
import { useRouter } from 'next/navigation';

interface Props {
  id: string;
  title: string;
}

export const GalleryActions = ({ id, title }: Props) => {
  const router = useRouter();

  const renameDrawing = async () => {
    const nextTitle = prompt('New title:', title);
    if (
      nextTitle === null
      || nextTitle.trim() === ''
      || nextTitle === title
    )
      return;
    const response = await fetch(`/api/drawings/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: nextTitle }),
    });
    if (!response.ok) {
      alert('rename failed');
      return;
    }
    router.refresh();
  };

  const onDelete = async () => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const response = await fetch(`/api/drawings/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      alert('delete failed');
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-2 flex gap-2 text-xs">
      <Button onClick={renameDrawing} className="underline">
        Rename
      </Button>
      <Button onClick={onDelete} className="text-red-600 underline">
        Delete
      </Button>
    </div>
  );
};
```

- [ ] **Step 3: Implement GalleryTile**

Create `components/draw/GalleryTile.tsx`:

```tsx
import Link from 'next/link';
import type { DrawingMeta } from '@/lib/drawing/types';
import { GalleryActions } from '@/components/draw/GalleryActions';

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

export const GalleryTile = ({ meta }: { meta: DrawingMeta }) => (
  <div className="flex w-48 flex-col rounded-3xl bg-white p-3 shadow-lg">
    <Link
      href={`/draw/${meta.id}`}
      className="flex h-36 items-center justify-center rounded-xl bg-sky-50"
    >
      {meta.blobPngUrl ?
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.blobPngUrl}
          alt={meta.title}
          className="h-full w-full rounded-xl object-cover"
        />
      : <span className="text-4xl">🎨</span>}
    </Link>
    <div className="mt-2 truncate font-semibold">{meta.title}</div>
    <div className="text-xs text-gray-500">{formatDate(meta.updatedAt)}</div>
    <GalleryActions id={meta.id} title={meta.title} />
  </div>
);
```

Note: we use a raw `<img>` here because Blob URLs are off-domain and `next/image` requires a remote pattern config; the tradeoff isn't worth it for a 400×533 thumbnail.

- [ ] **Step 4: Implement /draw page**

Create `app/draw/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import { listDrawings } from '@/lib/drawing/storage';
import { NewDrawingButton } from '@/components/draw/NewDrawingButton';
import { GalleryTile } from '@/components/draw/GalleryTile';

export default async function DrawGalleryPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect('/login');

  const drawings = await listDrawings(session.userId);

  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center p-6">
      <h1 className="text-3xl font-bold">My Drawings</h1>
      <div className="mt-8 flex flex-wrap justify-center gap-6">
        <NewDrawingButton />
        {drawings.map((meta) => (
          <GalleryTile key={meta.id} meta={meta} />
        ))}
      </div>
      {drawings.length === 0 && (
        <p className="mt-8 text-center text-lg text-gray-600">
          Tap <strong>New Drawing</strong> to start your first one.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
pnpm typecheck
git add app/draw/page.tsx components/draw/GalleryTile.tsx components/draw/GalleryActions.tsx components/draw/NewDrawingButton.tsx
git commit -m "Add /draw gallery page with tiles and actions"
```

---

## Task 18: Activate hub tile

**Files:**

- Modify: `app/page.tsx`

- [ ] **Step 1: Update the hub**

Replace `app/page.tsx` with:

```tsx
import { FeatureTile } from '@/components/hub/FeatureTile';

const HubPage = () => (
  <main className="mx-auto flex max-w-4xl flex-col items-center p-8">
    <h1 className="text-4xl font-bold">Henry&apos;s Website</h1>
    <div className="mt-12 flex flex-wrap justify-center gap-6">
      <FeatureTile title="Draw" emoji="🎨" href="/draw" />
    </div>
  </main>
);

export default HubPage;
```

Matches the current arrow-function + `export default` idiom of `app/page.tsx` (see the pre-Plan-B snapshot) and keeps to the AGENTS.md preference for arrow functions with implicit returns.

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add app/page.tsx
git commit -m "Activate Draw tile on hub"
```

---

## Task 19: Run the full test suite

**Files:** none (verification only).

- [ ] **Step 1: Run every gate**

```bash
pnpm format:check && pnpm test:run && pnpm typecheck && pnpm lint
```

Expected: every command exits 0. If `format:check` fails, run `pnpm format` and commit the fixes separately. If anything else fails, fix it in place rather than skipping.

- [ ] **Step 2: Commit any fixes**

```bash
git commit -am "Fix issues found by full-suite run"
```

(Only if there were changes.)

---

## Task 20: Manual acceptance checklist (iPad)

**Files:** none (human verification).

Run this against a Vercel preview deployment with both the **Upstash Redis** and **Vercel Blob** integrations installed. Local testing works too provided `BLOB_READ_WRITE_TOKEN` is pulled via `vercel env pull`.

- [ ] **Step 1: Deploy the preview**

```bash
vercel deploy
```

Confirm the preview URL and env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN`, `ADMIN_SECRET`.

- [ ] **Step 2: Sign Henry in**

Visit `https://<preview>/login` on Henry's iPad. Tap Henry. Touch ID prompt. Redirect to `/` with "Draw" tile active.

- [ ] **Step 3: Create a drawing**

Tap Draw → tap "New Drawing". Editor opens with an empty canvas and a "Untitled" title.

- [ ] **Step 4: Draw with finger and Apple Pencil**

Make strokes with each brush (pen, marker, pencil, eraser). Pressure from the Pencil should vary pencil stroke width. Finger strokes should draw with the midline pressure.

- [ ] **Step 5: Rename**

Tap the title, change to "My Dino", tap outside. After ~1 s, toolbar shows "saved".

- [ ] **Step 6: Observe autosave**

Wait 2 s after the last stroke. Toolbar shows "saving…" → "saved". Refresh the page — strokes and title persist.

- [ ] **Step 7: Undo / redo / clear**

Undo/redo remove and replay the last strokes. Clear (with confirmation) empties the canvas.

- [ ] **Step 8: Save to Photos**

Tap "Save to Photos". On iOS Safari, the share sheet appears with "Save Image" / "Save to Photos" option. Confirm the image shows up in the Photos app.

- [ ] **Step 9: Gallery flow**

Tap "← Gallery". New tile appears at the top with the thumbnail. Tap it — reopen and continue drawing.

- [ ] **Step 10: Rename / delete from the gallery**

Use the tile's Rename action — the card updates. Use Delete on a test drawing — the card disappears; refresh confirms it's gone.

- [ ] **Step 11: Cross-user isolation**

Sign out. Register a second user (e.g., "Leo") via the admin flow. Sign in as Leo on a second browser/device. Confirm `/draw` shows an empty gallery and that hitting `/draw/<henry-drawing-id>` directly returns the 404 page.

- [ ] **Step 12: Gate unchanged**

Open an incognito tab and visit `https://<preview>/draw` — expect redirect to `/login`. Visit `https://<preview>/api/drawings` — expect 401.

If all twelve steps pass, Plan B is done. If any fail, log `what you tried / what happened / what you expected` and fix in a follow-up commit.

---

## Post-plan: what's ready for Plan C (games)

After this plan lands:

- `lib/blob.ts` + `FakeBlob` are reusable for any future binary artifact storage.
- `lib/drawing/*` is contained under `lib/drawing/` and doesn't leak drawing-specific assumptions into `lib/auth` or `lib/kv`.
- The hub pattern (`FeatureTile` + `app/page.tsx`) accepts new tiles with one line.
- The ownership pattern (`requireOwnedDrawing`) is the template to copy for any future user-owned resource.
- Every route handler demonstrates the auth-first / ownership-second pattern; new APIs should follow it verbatim.

---

## Resolved during planning

Spec passages that left implementation choices open; decisions recorded here so implementers don't have to re-derive them.

1. **Thumbnail rasterization location.** Spec §8.2 says "Server writes `…json` and re-rasterizes a PNG thumbnail". Server-side canvas rendering would pull in `node-canvas` (native build, heavy) or a WASM canvas. Both are disproportionate for a hobby tier. **Decision:** the client rasterizes the thumbnail at autosave time and ships the PNG bytes along with the strokes in the `PATCH` body. Server just stores what it receives.

2. **Drawing index structure.** Spec §8.4 mentions a "Sorted set of drawingIds by `updatedAt` desc" at `user:<userId>:drawings`. Upstash's sorted set (`zadd` / `zrange`) works, but since we already write `updatedAt` into each meta and the per-user drawing count stays small, we use a plain set and sort in memory on read. **Decision:** `user:<userId>:drawings` is a `SADD` set; `listDrawings` does an in-memory sort. If a user's gallery ever grows past a few hundred items, swap to a sorted set — the API signature doesn't change.

3. **`expectedUpdatedAt` concurrency guard.** Spec §13 flags the autosave race: "if two autosaves fire quickly, the second should win. Use `updatedAt` monotonic check server-side." A strict monotonic check would reject the second save. **Decision:** the server's `updateDrawing` only throws `StaleWriteError` when the caller explicitly passes `expectedUpdatedAt`. The autosave flow in `Canvas.tsx` does **not** pass it, so the newest POST always wins. The plumbing is in place so a future feature (cross-tab editing) can opt into strict optimistic concurrency by passing the field.

4. **Title autosave.** Spec §8.2 says "Title edits save on blur, independently." **Decision:** the `Editor` commits title on `blur` via a separate `PATCH` with only `{ title }`. Stroke autosave is separate and does not touch the title.

5. **Thumbnail size.** Spec mentions "~400×533 for gallery display". **Decision:** we use exactly 400×533 (matches the 1200×1600 aspect ratio ÷ 3).

6. **Save-to-Photos UX on iOS.** Spec §8.3 says the download prompt "includes a 'Save to Photos' option via the share sheet". On iOS 15+, `navigator.share({ files })` reliably surfaces the share sheet with "Save Image" for PNGs; on desktop/non-supporting browsers we fall back to `<a download>`. **Decision:** the helper tries `navigator.canShare({ files })` first and falls back otherwise.

7. **Gallery tile image tag.** Spec uses "thumbnail served via Blob URL through `next/image`". `next/image` requires every remote host to be declared in `next.config.js` `remotePatterns`, and Blob URLs live under a different hostname per environment. **Decision:** use a plain `<img>` inside `GalleryTile.tsx` with an `eslint-disable` comment; the 400×533 PNG is small enough that `next/image`'s optimization isn't meaningful here. If we later move to a stable CDN, switch to `next/image` + `remotePatterns`.

8. **Undo granularity.** Spec §8.2 says the undo stack holds "stroke operations (not pixel snapshots)". **Decision:** the undo/redo unit is one complete stroke. `clear()` is one operation on the stack (so an accidental clear can be undone with a single undo).

9. **Eraser semantics.** Spec §8.2: "Eraser is destination-out composite." **Decision:** implemented via `ctx.globalCompositeOperation = 'destination-out'` during stroke rendering. Eraser strokes are saved as regular strokes with `brush: 'eraser'` so re-raster is deterministic.

10. **Proxy matcher.** Plan A's `proxy.ts` already runs on all routes except static assets, and its `PUBLIC_PATHS` list does not include any `/draw` or `/api/drawings` entry. **Decision:** no change to `proxy.ts` in this plan — the gate already protects the new routes.

11. **Reconciled against post-simplify main.** Plan B was originally drafted against the pre-`7047427` tree. After rebase, call sites, UI primitives, and import style were updated to match the current `lib/auth/*`, `FakeKV` (now in `lib/kv.fake.ts` with a public `reset()` method), Base-UI + cva conventions (`Button` from `@base-ui/react` + Tailwind `className`, mirroring `components/auth/UserPicker.tsx`), and the path-alias + descriptive-names rules from AGENTS.md (`3d87e58`). Tests mock `@/lib/kv` with a one-liner `() => ({ kv: fakeKv })` and reset stores via `fakeKv.reset()` / `fakeBlob.reset()` instead of reaching into private fields.
