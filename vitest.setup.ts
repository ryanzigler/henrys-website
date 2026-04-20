import '@testing-library/jest-dom/vitest';

process.env.AUTH_COOKIE_SECRET ??= 'test-secret-do-not-use-in-prod';
process.env.ADMIN_SECRET ??= 'test-admin-secret';
process.env.WEBAUTHN_RP_ID ??= 'localhost';
process.env.WEBAUTHN_ORIGIN ??= 'http://localhost:3000';
process.env.WEBAUTHN_RP_NAME ??= 'Test RP';
process.env.KV_REST_API_URL ??= 'http://localhost:8079';
process.env.KV_REST_API_TOKEN ??= 'test-upstash-token';
process.env.BLOB_READ_WRITE_TOKEN ??= 'test-blob-token';
