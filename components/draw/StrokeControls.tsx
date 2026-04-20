'use client';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cx } from '@/cva.config';
import type { Brush } from '@/types/drawing';
import { Button as BaseButton } from '@base-ui/react';
import { Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

const PALETTE = [
  '#27241E',
  '#FFFFFF',
  '#E86F5A',
  '#F2B155',
  '#F2D66B',
  '#8BB87A',
  '#6FB3C4',
  '#5B7EC7',
  '#A07AB8',
  '#D48BB0',
  '#9B7653',
];

interface StrokeControlsProps {
  color: string;
  onClear: () => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  recentColors: string[];
  size: number;
  tool: Brush;
}

export const StrokeControls = ({
  color,
  onClear,
  onColorChange,
  onSizeChange,
  recentColors,
  size,
  tool,
}: StrokeControlsProps) => {
  const [clearOpen, setClearOpen] = useState(false);
  const isEraser = tool === 'eraser';
  const previewDiameter = Math.min(28, Math.max(4, size * 0.8));

  const sizePresets = [3, 6, 12, 20, 30];

  const toolHints = {
    pen: 'Crisp, inky lines.',
    marker: 'Bold, semi-opaque strokes.',
    pencil: 'Soft, textured lines.',
    eraser: 'Erases back to paper.',
  }[tool];

  return (
    <aside className="flex h-full flex-col gap-6.5 overflow-auto border-l border-hair bg-ivory px-6 py-7">
      <Section label="Tool">
        <div className="flex flex-col items-baseline justify-between gap-1">
          <div className="font-display text-display-md capitalize">{tool}</div>
          <div className="max-w-57.75 text-xs leading-[1.3] text-muted">
            {toolHints}
          </div>
        </div>
      </Section>

      {!isEraser && (
        <Section
          label="Color"
          aside={
            <label
              className="relative inline-flex cursor-pointer items-center gap-1 text-xs font-semibold tracking-[0.8px] text-muted uppercase transition-colors duration-150 hover:text-ink"
              title="Custom color"
            >
              <span aria-hidden>◉</span> Pick
              <input
                aria-label="Custom color"
                className="absolute inset-0 cursor-pointer border-none p-0 opacity-0"
                onChange={(event) => onColorChange(event.target.value)}
                type="color"
                value={color}
              />
            </label>
          }
        >
          <div className="grid grid-cols-6 gap-2">
            {PALETTE.map((presetColor) => (
              <BaseButton
                key={presetColor}
                aria-label={presetColor}
                className={cx(
                  'aspect-square rounded-full p-0 outline-offset-2 transition-[transform,box-shadow] duration-150 outline-none hover:scale-110 hover:shadow-swatch',
                  color === presetColor && 'outline-2 outline-ink',
                  presetColor === '#FFFFFF' && 'border border-hair',
                )}
                onClick={() => onColorChange(presetColor)}
                style={{
                  background: presetColor,
                }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-hair bg-white px-2.5 py-2">
            <div
              className={cx(
                'size-5.5 rounded-md',
                color === '#FFFFFF' && 'border border-hair',
              )}
              style={{
                background: color,
              }}
            />
            <div className="font-mono text-xs text-muted">
              {color.toUpperCase()}
            </div>
          </div>
        </Section>
      )}

      <Section label="Size">
        <div className="flex items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center overflow-hidden">
            <div
              className={cx(
                'rounded-full',
                isEraser && 'border-2 border-dashed border-muted',
              )}
              style={{
                width: previewDiameter,
                height: previewDiameter,
                background: isEraser ? 'transparent' : color,
              }}
            />
          </div>
          <input
            aria-label="Size"
            className="flex-1"
            max={40}
            min={1}
            onChange={(event) => onSizeChange(Number(event.target.value))}
            type="range"
            value={size}
          />
          <div className="w-10 text-right font-mono text-xs text-muted">
            {size}px
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          {sizePresets.map((sizePreset) => {
            const isActive = size === sizePreset;

            return (
              <BaseButton
                aria-label={`${sizePreset}px`}
                className={cx(
                  'grid h-8.5 flex-1 place-items-center rounded-lg border border-hair bg-white transition-colors duration-150 hover:not-data-[active=true]:border-ink hover:not-data-[active=true]:bg-background-draw',
                  isActive && 'border-ink bg-ink',
                )}
                data-active={isActive}
                key={sizePreset}
                onClick={() => onSizeChange(sizePreset)}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: Math.min(sizePreset * 0.6, 14),
                    height: Math.min(sizePreset * 0.6, 14),
                    background:
                      isEraser ? 'transparent'
                      : isActive ? '#fff'
                      : color,
                    border:
                      isEraser ?
                        `1.5px dashed ${isActive ? '#fff' : '#8D8575'}`
                      : 'none',
                  }}
                />
              </BaseButton>
            );
          })}
        </div>
      </Section>

      {!isEraser && recentColors.length > 0 && (
        <Section label="Recent">
          <div className="flex gap-2">
            {recentColors.map((recent) => (
              <BaseButton
                key={recent}
                aria-label={recent}
                onClick={() => onColorChange(recent)}
                className={cx(
                  'aspect-square size-7 rounded-full border-none p-0 transition-[transform,box-shadow] duration-150 hover:scale-110 hover:shadow-swatch',
                  recent === '#FFFFFF' && 'border border-hair',
                )}
                style={{
                  background: recent,
                }}
              />
            ))}
          </div>
        </Section>
      )}

      <div className="flex-1" />
      <Button variant="danger" size="lg" onClick={() => setClearOpen(true)}>
        <Trash2 size={14} />
        Clear canvas
      </Button>

      <ConfirmDialog
        confirmLabel="Clear canvas"
        description="All strokes will be removed. You can't undo this from the toolbar."
        destructive
        onConfirm={onClear}
        onOpenChange={setClearOpen}
        open={clearOpen}
        title="Clear the whole drawing?"
      />
    </aside>
  );
};

interface SectionProps {
  aside?: ReactNode;
  children: ReactNode;
  label: string;
}

function Section({ aside, children, label }: SectionProps) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <div className="text-xs font-bold tracking-[1.4px] text-muted uppercase">
          {label}
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}
