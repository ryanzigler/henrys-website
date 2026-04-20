'use client';

import { cx } from '@/cva.config';
import { BRUSH_LIST } from '@/lib/drawing/brushes';
import type { Brush } from '@/types/drawing';
import { Button } from '@base-ui/react';
import { useEffect, useRef } from 'react';

export interface PaperPreset {
  id: string;
  value: string;
  label: string;
}

export const PAPER_COLORS: PaperPreset[] = [
  { id: 'cream', value: 'bg-paper', label: 'Cream' },
  { id: 'white', value: 'bg-white', label: 'White' },
  { id: 'blush', value: 'bg-paper-blush', label: 'Blush' },
  { id: 'mint', value: 'bg-paper-mint', label: 'Mint' },
  { id: 'sky', value: 'bg-paper-sky', label: 'Sky' },
  { id: 'slate', value: 'bg-paper-slate', label: 'Slate' },
];

const BRUSH_LABEL: Record<Brush, string> = {
  pen: 'Pen',
  marker: 'Marker',
  pencil: 'Pencil',
  eraser: 'Eraser',
};

const brushGlyph = (brush: Brush, active: boolean) => {
  const common = {
    stroke: active ? '#fff' : '#27241E',
    strokeWidth: 1.6,
    fill: 'none',
    strokeLinejoin: 'round' as const,
  };

  switch (brush) {
    case 'pen':
      return <path d="M5 19l3-1 10-10-2-2L6 16l-1 3z" {...common} />;
    case 'marker':
      return <path d="M6 18h12M8 14h8l-1-8h-6l-1 8z" {...common} />;
    case 'pencil':
      return <path d="M4 20l2-5 9-9 3 3-9 9-5 2z M13 7l3 3" {...common} />;
    case 'eraser':
      return <path d="M4 16l8-8 6 6-4 4h-8l-2-2z M10 10l6 6" {...common} />;
  }
};

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
      <div className="shadow-paper-pill pointer-events-auto flex gap-0.5 rounded-2xl border border-hair bg-white p-1.5">
        {BRUSH_LIST.map((brush) => {
          const active = value === brush;
          return (
            <Button
              aria-pressed={active}
              className={cx(
                'flex w-16.5 flex-col items-center gap-0.75 rounded-xl border-none bg-transparent px-1.5 pt-2 pb-1.75 text-ink transition-colors duration-150 hover:not-aria-pressed:bg-ink/6',
                active && 'bg-ink text-white',
              )}
              key={brush}
              onClick={() => onChange(brush)}
              title={BRUSH_LABEL[brush]}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                {brushGlyph(brush, active)}
              </svg>
              <span
                className={cx(
                  'text-xs font-semibold tracking-tighter text-muted',
                  active && 'text-white',
                )}
              >
                {BRUSH_LABEL[brush]}
              </span>
            </Button>
          );
        })}
      </div>

      <div
        ref={paperPillRef}
        className="shadow-paper-pill pointer-events-auto relative flex gap-0.5 rounded-2xl border border-hair bg-white p-1.5"
      >
        <Button
          aria-expanded={paperOpen}
          className={cx(
            'flex w-16.5 flex-col items-center gap-0.75 rounded-2xl border-none bg-transparent px-1.5 pt-2 transition-colors duration-150 hover:not-aria-expanded:bg-ink/6 hover:not-aria-pressed:bg-ink/6',
          )}
          onClick={onPaperToggle}
          title="Paper"
        >
          <div
            aria-expanded={paperOpen}
            className={cx(
              'size-5.5 rounded-sm border-[1.5px] border-ink bg-none bg-size-[5px_5px]',
              paperColor,
              paperOpen && 'border-white',
              showGrid
                && 'bg-radial from-black/35 from-[1px] to-transparent to-[1.2px]',
              showGrid && paperOpen && 'from-white',
            )}
            style={{
              backgroundColor: paperColor,
            }}
          />
          <span
            className={cx(
              'text-xs font-semibold tracking-tighter',
              paperOpen ? 'text-white' : 'text-muted',
            )}
          >
            Paper
          </span>
        </Button>

        {paperOpen && (
          <div
            role="dialog"
            aria-label="Paper"
            className="shadow-paper-dialog absolute top-[calc(100%+0.625rem)] right-0 z-20 w-60 rounded-2xl border border-hair bg-white p-3.5"
          >
            <div className="mb-2.5 text-xs font-bold tracking-[1.4px] text-muted uppercase">
              Paper color
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {PAPER_COLORS.map((preset) => {
                const active = paperColor === preset.value;

                return (
                  <Button
                    className={cx(
                      'hover:shadow-swatch aspect-square rounded-md p-0 outline-offset-2 transition-all hover:scale-112',
                      preset.value,
                      preset.value === 'bg-white' && 'border border-hair',
                      active && 'outline-2 outline-ink',
                    )}
                    key={preset.id}
                    onClick={() => onPaperColorChange(preset.value)}
                    title={preset.label}
                  />
                );
              })}
            </div>
            <label className="mt-3.5 flex cursor-pointer items-center justify-between gap-2.5 text-sm font-medium text-ink">
              Show grid
              <span
                role="switch"
                aria-checked={showGrid}
                tabIndex={0}
                onClick={() => onShowGridChange(!showGrid)}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    onShowGridChange(!showGrid);
                  }
                }}
                className={cx(
                  'relative inline-block h-5 w-8.5 shrink-0 rounded-full transition-all duration-150 hover:brightness-110',
                  showGrid && 'bg-ink',
                  !showGrid && 'bg-hair',
                )}
              >
                <span
                  className="absolute top-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left]"
                  style={{ left: showGrid ? 16 : 2 }}
                />
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
