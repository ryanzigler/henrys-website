import { describe, it, expect } from 'vitest';
import { isAdminRequest } from '@/lib/auth/admin';
import { env } from '@/lib/env';

describe('isAdminRequest', () => {
  it('returns true when ?secret= matches ADMIN_SECRET', () => {
    expect(
      isAdminRequest(
        new URL(`http://localhost/register?secret=${env.ADMIN_SECRET}`),
      ),
    ).toBe(true);
  });

  it('returns false when secrets differ', () => {
    expect(
      isAdminRequest(new URL('http://localhost/register?secret=wrong')),
    ).toBe(false);
  });

  it('returns false when no secret query param is present', () => {
    expect(isAdminRequest(new URL('http://localhost/register'))).toBe(false);
  });
});
