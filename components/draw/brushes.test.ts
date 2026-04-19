import { describe, it, expect } from 'vitest';
import { BRUSHES, BRUSH_LIST } from '@/components/draw/brushes';

describe('brush presets', () => {
  it('defines all four brushes', () => {
    expect(BRUSH_LIST).toEqual(['pen', 'marker', 'pencil', 'eraser']);
  });

  it('each preset has well-formed options', () => {
    for (const brush of BRUSH_LIST) {
      const preset = BRUSHES[brush];
      expect(typeof preset.options.size).toBe('number');
      expect(typeof preset.options.thinning).toBe('number');
      expect(['source-over', 'destination-out']).toContain(preset.composite);
    }
  });

  it('eraser uses destination-out', () => {
    expect(BRUSHES.eraser.composite).toBe('destination-out');
  });
});
