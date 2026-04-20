import { describe, it, expect } from 'vitest';
import { newDrawingId } from '@/lib/drawing/ids';

describe('newDrawingId', () => {
  it('returns a d_<hex16> id', () => {
    expect(newDrawingId()).toMatch(/^d_[0-9a-f]{32}$/);
  });

  it('returns different values on successive calls', () => {
    expect(newDrawingId()).not.toBe(newDrawingId());
  });
});
