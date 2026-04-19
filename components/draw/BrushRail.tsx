'use client';

import { cx } from '@/cva.config';
import { BRUSH_LIST } from '@/lib/drawing/brushes';
import type { Brush } from '@/types/drawing';
import { Button } from '@base-ui/react';

interface BrushRailProps {
  onChange: (brush: Brush) => void;
  value: Brush;
}

const BRUSH_META: Record<Brush, { label: string; emoji: string }> = {
  pen: { label: 'Pen', emoji: '🖊️' },
  marker: { label: 'Marker', emoji: '🖍️' },
  pencil: { label: 'Pencil', emoji: '✏️' },
  eraser: { label: 'Eraser', emoji: '🧽' },
};

export const BrushRail = ({ onChange, value }: BrushRailProps) => (
  <div className="flex flex-col gap-2">
    {BRUSH_LIST.map((brush) => (
      <Button
        aria-pressed={value === brush}
        className={cx(
          'flex h-14 w-14 flex-col items-center justify-center rounded-xl transition',
          value === brush ? 'bg-black text-white' : 'bg-white shadow',
        )}
        key={brush}
        onClick={() => onChange(brush)}
      >
        <span className="text-2xl">{BRUSH_META[brush].emoji}</span>
        <span className="text-[10px]">{BRUSH_META[brush].label}</span>
      </Button>
    ))}
  </div>
);
