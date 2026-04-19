import { describe, it, expect, afterEach } from 'vitest';
import { isAdminRequest } from '@/lib/auth/admin';

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
