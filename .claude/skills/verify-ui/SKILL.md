---
name: verify-ui
description: Terminate UI changes correctly — run typecheck, lint, format, then exercise the affected route in a real browser via Playwright MCP and confirm no console errors or visual regressions.
---

# verify-ui

Use this skill **before claiming any UI task complete**. It enforces the project rule: type/lint/format green AND the feature actually works in a browser.

## When to run

- After editing anything under `app/`, `public/`, `*.css`, or styling config.
- Before reporting a UI task complete.
- Before opening a PR.

## Procedure

### 1. Static verification

Run all three in order. Do **not** proceed if any fails:

```
pnpm typecheck
pnpm lint
pnpm exec prettier --check .
```

If the prettier check fails, run `pnpm format` and re-run the check. Note: `pnpm lint` already runs `eslint --fix`, so expect it to modify files on its first pass — run it twice if you want a clean second pass.

### 2. Start dev server

```
pnpm dev
```

Wait for `Ready in …` and note the port (default `3000`).

### 3. Browser smoke test

Using the Playwright MCP tools (`browser_navigate`, `browser_snapshot`, `browser_console_messages`):

1. Navigate to every route you touched.
2. Capture a snapshot of the accessibility tree — confirm the expected landmarks/headings exist.
3. Read console messages — **any** error or warning is a failure unless you can justify it in writing.
4. Exercise the primary interaction (click the main CTA, submit the form, toggle the menu). Confirm the resulting state is correct.
5. Resize to 375px width and re-snapshot — the layout must not break.

### 4. Stop the dev server when done

Leaving dev servers running wastes local resources and produces misleading state for the next session.

## Reporting

When you report results to the user, state explicitly:

- Which routes you exercised
- Which commands you ran and their exit status
- Any console warning you encountered and why you accepted it (if you did)

If you could not reach the browser for any reason, **say so** — do not claim success on static checks alone.
