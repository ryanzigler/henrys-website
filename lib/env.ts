import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: process.env,
  extends: [vercel()],
  isServer: typeof window === 'undefined' || Boolean(process.env.VITEST),
  server: {
    ADMIN_SECRET: z.string().min(1),
    AUTH_COOKIE_SECRET: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    KV_REST_API_TOKEN: z.string().min(1),
    KV_REST_API_URL: z.url(),
    WEBAUTHN_ORIGIN: z.url().optional(),
    WEBAUTHN_RP_ID: z.string().min(1).optional(),
    WEBAUTHN_RP_NAME: z.string().min(1),
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
