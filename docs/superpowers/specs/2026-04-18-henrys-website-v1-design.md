# Henry's Website — v1 Design

**Date:** 2026-04-18
**Status:** Approved (awaiting implementation plan)
**Scope:** First shippable version — authentication + drawing tool, deployed to Vercel.

---

## 1. Goals and context

Henry (7, 1st grade, reading at 2nd–3rd grade level) wants a personal website he uses from his iPad. He may let his brothers use it too. The first feature is a drawing tool he described as "a simplistic Photoshop, different brushes and colors, an infinite white canvas." He wants to sign in with Touch ID.

The site is intended to grow over time with additional features (browser games he invents). v1 delivers the login experience, the drawing tool, and a hub that's shaped to accept future features without restructuring.

## 2. Non-goals (explicitly out of v1)

- Real-time collaboration between kids.
- Printing or direct share (AirDrop, email). "Save to Photos" is the only export path.
- Coloring-book templates or pre-drawn line art.
- Games. The hub is shaped to host them, but none exist yet.
- Password recovery / self-serve account management. If a kid loses all their passkeys, dad re-registers via the admin flow.

## 3. Stack

- Next.js 16.2.4 (App Router) + React 19.2.4 + Tailwind 4
- Deployed on Vercel (Hobby tier)
- **Upstash Redis** (installed via the Vercel Marketplace Upstash Redis integration) for users, passkeys, sessions. Client: `@upstash/redis`. (`@vercel/kv` is deprecated; do not use.)
- **Vercel Blob** for drawing artifacts (JSON stroke data + PNG thumbnail)
- **`@simplewebauthn/server`** + **`@simplewebauthn/browser`** for WebAuthn
- **`perfect-freehand`** for stroke shaping (the library Excalidraw and tldraw both use internally)

`@excalidraw/excalidraw` installed earlier will be removed — it doesn't match Henry's mental model (sketchy diagram tool vs. paint app).

## 4. Users and accounts

Per-kid accounts (Netflix-profile model). Each person has a user record and their own drawing gallery. v1 supports:

- Dad (for admin + maintenance)
- Henry
- Henry's brothers (created via admin flow when they want in)

A user can have multiple passkeys (e.g., one per device). Sessions are per-user.

**Why per-kid accounts:** a 7-year-old will enjoy the "pick who I am" screen, each kid's drawings stay their own, and retrofitting this later would be painful.

## 5. Authentication

WebAuthn passkeys, rolled in-house. Clerk is not used (the free tier excludes passkeys).

### 5.1 Session model

Opaque 32-byte random session ID stored in a session cookie:

- Cookie: `session=<id>`, `HttpOnly`, `Secure`, `SameSite=Lax`, 30-day `Max-Age`.
- KV: `session:<id>` → `{ userId, expiresAt }`, 30-day TTL.
- Middleware reads the cookie, looks up the session in KV, and attaches `userId` to the request. Missing/expired → redirect to `/login`.
- Sliding expiration: each valid request refreshes the cookie and KV TTL.

### 5.2 Login flow (`/login`)

1. Page shows a "Who's drawing?" picker — one large tile per user (name + emoji/avatar).
2. Tap a tile → client calls `/api/auth/login/options` → server returns a WebAuthn assertion challenge scoped to that user's credentials → browser invokes WebAuthn → Touch ID prompt on iPad.
3. Client POSTs the assertion to `/api/auth/login/verify` → server verifies via `@simplewebauthn/server` → creates session → sets cookie → responds with redirect target (`/`).
4. A user with no passkeys yet cannot sign in; the tile is disabled with a small "ask dad to set this up" note.

### 5.3 Registration flow (`/register?secret=<ADMIN_SECRET>`)

Gated by the `ADMIN_SECRET` env var as a query-string match. Not a user-facing feature — only dad uses this.

Two modes:

- **New user:** enter a username + emoji → server creates user in KV → immediately triggers WebAuthn registration on the current device → stores credential.
- **Add device to existing user:** select an existing user → registration ceremony on the new device.

Uses `generateRegistrationOptions` / `verifyRegistrationResponse` from `@simplewebauthn/server`.

### 5.4 KV schema for auth

- `user:<userId>` → `{ id, username, displayName, emoji, createdAt }`
- `users` → Set of userIds (for the login picker)
- `credential:<credentialId>` → `{ userId, publicKey, counter, transports, createdAt }`
- `user:<userId>:credentials` → Set of credentialIds
- `session:<sessionId>` → `{ userId, expiresAt }` (TTL 30 days)

## 6. Route + middleware layout

- `/login` — user picker (public)
- `/register` — admin-only, gated by `ADMIN_SECRET` query param (public route, guarded in handler)
- `/api/auth/login/options`, `/api/auth/login/verify` — public (but tied to the challenge)
- `/api/auth/register/options`, `/api/auth/register/verify` — admin-only
- `/api/auth/logout` — authenticated
- `/` — authenticated hub
- `/draw` — authenticated gallery
- `/draw/[id]` — authenticated editor
- `/api/drawings/*` — authenticated CRUD

Middleware pattern: a single `middleware.ts` checks session cookie for all routes except the public list above.

## 7. Hub (`/`)

Post-login landing page. v1 shows:

- Top-right: "Hi, Henry 🦖" (display name + emoji) with a sign-out button.
- Main area: a grid of feature tiles. v1 has one tile: **Draw**.
- The tile component (`<FeatureTile />`) is built generic so future features slot in by adding a new tile without restructuring the page.

## 8. Drawing tool

### 8.1 Gallery (`/draw`)

- Grid of drawing thumbnails. Thumbnail is the stored PNG served via Blob URL through `next/image`.
- Each card: thumbnail, title, last-edited timestamp.
- Top-left `+ New Drawing` button creates an empty drawing and navigates to the editor.
- Card tap opens the editor for that drawing.
- Card long-press (on touch) / hover menu (on desktop) reveals **Rename** and **Delete**.
- Empty state: friendly illustration + "Tap New Drawing to start."

### 8.2 Editor (`/draw/[id]`)

**Canvas:** fixed-size "page" of 1200×1600 logical pixels, rendered at 2× device pixel ratio for retina iPads (2400×3200 backing). Centered on screen, with viewport padding so toolbars don't overlap.

**Top toolbar:** back-to-gallery, editable title field, undo, redo, clear, **Save to Photos** button.

**Left rail — brushes:** Pen, Marker, Pencil, Eraser. Each is a `perfect-freehand` config preset (smoothing, taper start/end, thinning, streamline). Pressure from Apple Pencil feeds stroke width. Eraser is destination-out composite.

**Right rail — stroke controls:**

- Size slider (1–60 px)
- Opacity slider (10–100%)
- Color palette: 12 preset colors + a color wheel input for custom picks. "Recently used" strip below the palette.

**Drawing engine:**

- HTML Canvas 2D, one on-screen canvas.
- `perfect-freehand` generates the outline polygon for each stroke; we fill it with the current color + opacity.
- Pointer Events API captures finger + Apple Pencil. `pointerType === "pen"` uses reported pressure; `"touch"` and `"mouse"` use a constant 0.5 pressure.

**Undo/redo:** an in-memory stack of stroke operations (not pixel snapshots). On undo, we re-rasterize from the stroke list. Resets on page reload — acceptable, since autosave preserves the canonical stroke list on the server.

**Autosave:**

- Debounce 2 seconds after the last pointer-up.
- POST `/api/drawings/[id]` with `{ title, strokes }`.
- Server writes `drawings/<userId>/<drawingId>.json` and re-rasterizes a PNG thumbnail to `drawings/<userId>/<drawingId>.png`.
- Title edits save on blur, independently.

### 8.3 Save to Photos (export)

Tap **Save to Photos** → client rasterizes the canvas to a high-res PNG (full 2400×3200) → triggers a download. On iOS Safari, the download prompt includes a "Save to Photos" option via the share sheet. Filename: `<title>-<shortid>.png`.

### 8.4 Data model

Each drawing has two artifacts in Blob:

- `drawings/<userId>/<drawingId>.json` — `{ id, userId, title, createdAt, updatedAt, strokes: Stroke[] }`
- `drawings/<userId>/<drawingId>.png` — rasterized thumbnail (~400×533 for gallery display; full-res is regenerated for exports)

A lightweight index per user lives in KV for gallery listing without scanning Blob:

- `user:<userId>:drawings` → Sorted set of drawingIds by `updatedAt` desc.
- `drawing:<drawingId>` → `{ id, userId, title, createdAt, updatedAt, blobJsonUrl, blobPngUrl }`

**Stroke shape:**

```ts
type Stroke = {
  brush: 'pen' | 'marker' | 'pencil' | 'eraser';
  size: number;
  opacity: number;
  color: string; // hex
  points: Array<[x: number, y: number, pressure: number]>;
};
```

### 8.5 Authorization

Every `/api/drawings/*` handler verifies `session.userId === drawing.userId` before reading, writing, or deleting. No cross-user access, ever.

## 9. File structure (projected)

```
app/
  layout.tsx
  page.tsx                   # hub
  login/page.tsx             # user picker
  register/page.tsx          # admin-gated
  draw/
    page.tsx                 # gallery
    [id]/page.tsx            # editor
  api/
    auth/
      login/options/route.ts
      login/verify/route.ts
      register/options/route.ts
      register/verify/route.ts
      logout/route.ts
    drawings/
      route.ts               # POST (create), GET (list)
      [id]/route.ts          # GET, PUT, DELETE
components/
  hub/FeatureTile.tsx
  auth/UserPicker.tsx
  draw/
    Editor.tsx
    Gallery.tsx
    Toolbar.tsx
    BrushRail.tsx
    StrokeControls.tsx
    ColorPalette.tsx
lib/
  auth/
    session.ts
    webauthn.ts              # wraps @simplewebauthn/server
  drawing/
    strokes.ts               # Stroke type + perfect-freehand configs
    rasterize.ts             # server-side canvas render for thumbnails
  kv.ts
  blob.ts
middleware.ts
```

## 10. Environment variables

| Var                                                  | Purpose                                                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_SECRET`                                       | Gates `/register` + related APIs.                                                                                                                                               |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST endpoint (auto-provisioned by the Vercel Marketplace Upstash integration). Legacy `KV_REST_API_*` names are still accepted as fallbacks by `@upstash/redis`. |
| `BLOB_READ_WRITE_TOKEN`                              | Vercel Blob (auto-provisioned).                                                                                                                                                 |
| `WEBAUTHN_RP_ID`                                     | Relying Party ID — the site's domain (e.g., `henrys.example.com`). `localhost` for local dev.                                                                                   |
| `WEBAUTHN_RP_NAME`                                   | Human-readable RP name (e.g., "Henry's Website").                                                                                                                               |
| `WEBAUTHN_ORIGIN`                                    | Full origin, used to validate WebAuthn responses.                                                                                                                               |

## 11. Bootstrap / first run

One-time setup, performed by dad:

1. Create the Vercel project; install the **Upstash Redis** + **Vercel Blob** integrations from the Vercel Marketplace.
2. Set `ADMIN_SECRET`, `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN` env vars.
3. Deploy.
4. From Henry's iPad, visit `/register?secret=...` → create user "Henry" → register passkey (Touch ID).
5. Repeat step 4 for each brother as they opt in, and for dad on any devices he'll use.

## 12. Testing approach

- **Unit tests:** stroke shape generation, session lifecycle, drawing index invariants, authorization guard helpers.
- **Integration tests:** API routes for `/api/drawings/*` with a mocked KV + Blob.
- **Manual acceptance on iPad:** register, log in with Touch ID, draw with finger + Apple Pencil, autosave, reopen from gallery, export to Photos. This is the real quality bar and must be done on actual hardware before declaring v1 done.

## 13. Risks and open questions

- **iPad Touch ID reliability** — newer iPads use Face ID; some have Touch ID in the power button. Either works through WebAuthn; confirm on Henry's specific device during bootstrap.
- **`perfect-freehand` performance on iPad** — very long strokes with many sample points can lag. Mitigation: downsample points on input, and cap stroke history at a reasonable depth.
- **Autosave race** — if two autosaves fire quickly, the second should win. Use `updatedAt` monotonic check server-side.
- **Storage growth** — at 3 MB per drawing (high estimate) and 100 drawings per kid, the free Blob tier (1 GB) has lots of headroom. Revisit if Henry turns into a prolific artist.

## 14. What a v1 "done" looks like

Dad can:

- Deploy, bootstrap users, and hand Henry the iPad.

Henry can:

- Open the site, tap his tile, Touch-ID in.
- Tap **Draw**, make a new drawing, pick brushes/colors, draw with his finger and Apple Pencil.
- Name the drawing, leave, come back, see it in his gallery, reopen and keep drawing.
- Save a drawing to Photos and show his mom.

Henry cannot see his brothers' drawings and vice versa.
