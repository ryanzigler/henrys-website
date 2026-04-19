import { timingSafeEqual } from 'node:crypto';

export const isAdminRequest = (url: URL) => {
  const provided = url.searchParams.get('secret');
  const expected = process.env.ADMIN_SECRET;

  if (!provided || !expected) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
};
