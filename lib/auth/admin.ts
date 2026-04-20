import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

export const isAdminRequest = (url: URL) => {
  const provided = url.searchParams.get('secret');
  if (!provided) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(env.ADMIN_SECRET);

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
};
