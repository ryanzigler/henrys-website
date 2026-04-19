# Vercel Blob setup (one-time, per-environment)

From the Vercel dashboard:

1. Project → Storage → Marketplace → **Vercel Blob** → Install.
2. Attach it to the preview + production environments.
3. Confirm `BLOB_READ_WRITE_TOKEN` appears under Project → Settings → Environment Variables.

For local dev (`pnpm dev`), pull the token locally with `vercel env pull .env.local`.
`FakeBlob` in `lib/blob.ts` covers the test suite with no token.
