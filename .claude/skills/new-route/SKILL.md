---
name: new-route
description: Scaffold a new App Router route with layout, page, loading, and error boundaries using the project's Next.js 16 conventions. Accepts a route path argument (e.g. "blog/[slug]").
disable-model-invocation: true
---

# new-route

Scaffold a new Next.js 16 App Router route at `app/<path>/` with the standard boundary files.

## Inputs

- `$ARGUMENTS`: route path relative to `app/`. Examples:
  - `about` → `app/about/`
  - `blog/[slug]` → `app/blog/[slug]/`
  - `(marketing)/pricing` → route group

## Important

This project uses **Next.js 16**. Before writing any code, read `node_modules/next/dist/docs/` for the current conventions — do **not** rely on training-data habits from older versions. In particular, verify the current signatures for:

- `params` (may be a Promise in async Server Components)
- `searchParams` (may be a Promise)
- `generateMetadata`
- Cache Components directives (`use cache`, `cacheLife`, `cacheTag`)

## Procedure

1. **Verify the path does not already exist.** If it does, stop and ask the user.
2. **Create `app/<path>/page.tsx`** as an async Server Component by default. Type `params` and `searchParams` as `Promise<...>` and `await` them before use.
3. **Create `app/<path>/layout.tsx`** only if the route needs a distinct layout (nested navigation, a different shell). Skip for simple leaf pages.
4. **Create `app/<path>/loading.tsx`** with a minimal Suspense fallback — a skeleton that matches the page's structure, not a generic spinner.
5. **Create `app/<path>/error.tsx`** as a Client Component (`"use client"`) exporting a default function that accepts `{ error, reset }`.
6. **If the route fetches data**, wrap slow segments in `<Suspense>` rather than blocking the full page.
7. **Type it with strict mode on.** No `any`. Exports must be named per the framework convention.
8. **Run verification:** `pnpm typecheck && pnpm lint && pnpm format`.
9. **Smoke test:** start the dev server with `pnpm dev`, open the new route, confirm it renders and loading/error boundaries behave.

## Do not

- Do not add client components unless interactivity requires it.
- Do not import from `pages/` — this project is App Router only.
- Do not use deprecated cache APIs (e.g., `unstable_cache`); prefer Cache Components patterns.
- Do not add tests unless the user asks — there is no test framework in this repo yet.
