'use client';

import { Button } from '@base-ui/react';
import type { Brush } from '@/lib/drawing/types';
import { BRUSH_LIST } from '@/components/draw/brushes';

interface Props {
  value: Brush;
  onChange: (brush: Brush) => void;
}

const BRUSH_LABEL: Record<Brush, string> = {
  pen: 'Pen',
  marker: 'Marker',
  pencil: 'Pencil',
  eraser: 'Eraser',
};

const BRUSH_EMOJI: Record<Brush, string> = {
  pen: '🖊️',
  marker: '🖍️',
  pencil: '✏️',
  eraser: '🧽',
};

export const BrushRail = ({ value, onChange }: Props) => (
  <div className="flex flex-col gap-2">
    {BRUSH_LIST.map((brush) => (
      <Button
        key={brush}
        onClick={() => onChange(brush)}
        aria-pressed={value === brush}
        className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl transition ${
          value === brush ? 'bg-black text-white' : 'bg-white shadow'
        }`}
      >
        <span className="text-2xl">{BRUSH_EMOJI[brush]}</span>
        <span className="text-[10px]">{BRUSH_LABEL[brush]}</span>
      </Button>
    ))}
  </div>
);
