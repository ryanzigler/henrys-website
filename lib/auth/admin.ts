import { timingSafeEqual } from 'node:crypto';

export const isAdminRequest = (url: URL) => {
  const provided = url.searchParams.get('secret');
  const expected = process.env.ADMIN_SECRET;
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};
