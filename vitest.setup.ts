import '@testing-library/jest-dom/vitest';

process.env.AUTH_COOKIE_SECRET ??= 'test-secret-do-not-use-in-prod';
process.env.ADMIN_SECRET ??= 'test-admin-secret';
