import { randomToken } from '@/lib/random';

export const newDrawingId = () => `d_${randomToken(16)}`;
