'use client';

import { Switch } from '@/components/ui/Switch';
import { cx } from '@/cva.config';
import { BRUSH_LIST } from '@/lib/drawing/brushes';
import type { Brush } from '@/types/drawing';
import { Button as BaseButton } from '@base-ui/react';
import { Eraser, Grip, Highlighter, Pen, Pencil } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface PaperPreset {
  id: string;
  value: string;
  label: string;
}

export const PAPER_COLORS: PaperPreset[] = [
  { id: 'cream', value: 'var(--color-paper)', label: 'Cream' },
  { id: 'white', value: 'var(--color-white)', label: 'White' },
  { id: 'blush', value: 'var(--color-paper-blush)', label: 'Blush' },
  { id: 'mint', value: 'var(--color-paper-mint)', label: 'Mint' },
  { id: 'sky', value: 'var(--color-paper-sky)', label: 'Sky' },
  { id: 'slate', value: 'var(--color-paper-slate)', label: 'Slate' },
];

interface BrushRailProps {
  onChange: (brush: Brush) => void;
  paperColor: string;
  paperOpen: boolean;
  onPaperColorChange: (value: string) => void;
  onPaperToggle: () => void;
  onPaperClose: () => void;
  onShowGridChange: (show: boolean) => void;
  showGrid: boolean;
  value: Brush;
}

export const BrushRail = ({
  onChange,
  onPaperClose,
  onPaperColorChange,
  onPaperToggle,
  onShowGridChange,
  paperColor,
  paperOpen,
  showGrid,
  value,
}: BrushRailProps) => {
  const paperPillRef = useRef<HTMLDivElement | null>(null);
  const isDarkPaper = paperColor === 'var(--color-paper-slate)';

  useEffect(() => {
    if (!paperOpen) return;

    const onDocClick = (event: MouseEvent) => {
      if (!paperPillRef.current?.contains(event.target as Node)) {
        onPaperClose();
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onPaperClose, paperOpen]);

  return (
    <div className="pointer-events-none absolute top-7 left-1/2 flex -translate-x-1/2 items-start gap-2.5">
      <div className="pointer-events-auto flex gap-0.5 rounded-2xl border border-hair bg-white p-1.5 shadow-paper-pill">
        {BRUSH_LIST.map((brush) => (
          <BaseButton
            aria-pressed={value === brush}
            className={cx(
              'flex w-16.5 flex-col items-center gap-0.75 rounded-xl border-none bg-transparent px-1.5 pt-2 pb-1.75 text-ink transition-colors duration-150 hover:not-aria-pressed:bg-ink/6',
              value === brush && 'bg-ink text-white',
            )}
            key={brush}
            onClick={() => onChange(brush)}
            title={brush}
          >
            {brush === 'pen' && <Pen size={22} strokeWidth={1.6} />}
            {brush === 'marker' && <Highlighter size={22} strokeWidth={1.6} />}
            {brush === 'pencil' && <Pencil size={22} strokeWidth={1.6} />}
            {brush === 'eraser' && <Eraser size={22} strokeWidth={1.6} />}
            <span
              className={cx(
                'text-xs font-semibold tracking-tighter text-muted capitalize',
                value === brush && 'text-white',
              )}
            >
              {brush}
            </span>
          </BaseButton>
        ))}
      </div>

      <div
        className="pointer-events-auto relative flex gap-0.5 rounded-2xl border border-hair bg-white p-1.5 shadow-paper-pill"
        ref={paperPillRef}
      >
        <BaseButton
          aria-expanded={paperOpen}
          className={cx(
            'flex w-16.5 flex-col items-center gap-0.75 rounded-xl border-none bg-transparent px-1.5 pt-2 pb-1.75 text-ink transition-colors duration-150 hover:not-aria-expanded:bg-ink/6',
            paperOpen && 'bg-ink text-white',
          )}
          onClick={onPaperToggle}
          title="Paper"
        >
          <div
            aria-expanded={paperOpen}
            className={cx(
              'flex items-center justify-center rounded-sm border border-ink text-ink',
              showGrid && isDarkPaper && 'text-white',
            )}
            style={{ backgroundColor: paperColor }}
          >
            <Grip size={20} strokeWidth={2} />
          </div>
          <span
            className={cx(
              'text-xs font-semibold tracking-tighter',
              paperOpen ? 'text-white' : 'text-muted',
            )}
          >
            Paper
          </span>
        </BaseButton>

        {paperOpen && (
          <div
            role="dialog"
            aria-label="Paper"
            className="absolute top-[calc(100%+0.625rem)] right-0 z-20 w-60 rounded-2xl border border-hair bg-white p-3.5 shadow-paper-dialog"
          >
            <div className="mb-2.5 text-xs font-bold tracking-[1.4px] text-muted uppercase">
              Paper color
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {PAPER_COLORS.map(({ id, label, value }) => (
                <BaseButton
                  className={cx(
                    'aspect-square rounded-md p-0 outline-offset-2 transition-all hover:scale-112 hover:shadow-swatch',
                    (id === 'white' || id === 'cream') && 'border border-hair',
                    paperColor === value && 'outline-2 outline-ink',
                  )}
                  key={id}
                  onClick={() => onPaperColorChange(value)}
                  style={{ backgroundColor: value }}
                  title={label}
                />
              ))}
            </div>
            <label className="mt-3.5 flex cursor-pointer items-center justify-between gap-2.5 text-sm font-medium text-ink">
              Show grid
              <Switch
                aria-label="Show grid"
                checked={showGrid}
                onCheckedChange={onShowGridChange}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
