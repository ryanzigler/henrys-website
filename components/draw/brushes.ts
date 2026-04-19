import type { Brush } from '@/lib/drawing/types';

export interface BrushOptions {
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
  start: { taper: number; cap: boolean };
  end: { taper: number; cap: boolean };
}

export interface BrushPreset {
  options: BrushOptions;
  composite: 'source-over' | 'destination-out';
}

export const BRUSHES: Record<Brush, BrushPreset> = {
  pen: {
    options: {
      size: 8,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    },
    composite: 'source-over',
  },
  marker: {
    options: {
      size: 16,
      thinning: 0,
      smoothing: 0.25,
      streamline: 0.3,
      simulatePressure: false,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    },
    composite: 'source-over',
  },
  pencil: {
    options: {
      size: 4,
      thinning: 0.75,
      smoothing: 0.6,
      streamline: 0.5,
      simulatePressure: true,
      start: { taper: 2, cap: true },
      end: { taper: 2, cap: true },
    },
    composite: 'source-over',
  },
  eraser: {
    options: {
      size: 24,
      thinning: 0.2,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    },
    composite: 'destination-out',
  },
};

export const BRUSH_LIST: Brush[] = ['pen', 'marker', 'pencil', 'eraser'];
