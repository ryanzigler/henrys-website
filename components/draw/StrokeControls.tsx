'use client';

import { cx } from '@/cva.config';
import type { Brush } from '@/types/drawing';
import { Button } from '@base-ui/react';
import type { ReactNode } from 'react';

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

const SIZE_PRESETS = [3, 6, 12, 20, 30];

const TOOL_HINTS: Record<Brush, string> = {
  pen: 'Crisp, inky lines.',
  marker: 'Bold, semi-opaque strokes.',
  pencil: 'Soft, textured lines.',
  eraser: 'Erases back to paper.',
};

interface SectionProps {
  aside?: ReactNode;
  children: ReactNode;
  label: string;
}

const Section = ({ aside, children, label }: SectionProps) => (
  <div>
    <div className="mb-2.5 flex items-baseline justify-between">
      <div className="text-[11px] font-bold tracking-[1.4px] text-muted uppercase">
        {label}
      </div>
      {aside}
    </div>
    {children}
  </div>
);

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
  const isEraser = tool === 'eraser';
  const previewDiameter = Math.min(28, Math.max(4, size * 0.8));

  return (
    <aside className="flex h-full flex-col gap-[26px] overflow-auto border-l border-hair bg-ivory px-6 py-7">
      <Section label="Tool">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="font-display text-[27px] font-medium tracking-[-0.3px] capitalize">
            {tool}
          </div>
          <div className="max-w-[150px] text-right text-xs leading-[1.3] text-muted">
            {TOOL_HINTS[tool]}
          </div>
        </div>
      </Section>

      {!isEraser && (
        <Section
          label="Color"
          aside={
            <label
              className="relative inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold tracking-[0.8px] text-muted uppercase transition-colors duration-150 hover:text-ink"
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
            {PALETTE.map((presetColor) => {
              const active = color === presetColor;
              return (
                <Button
                  key={presetColor}
                  aria-label={presetColor}
                  className="ps-swatch aspect-square rounded-full p-0"
                  onClick={() => onColorChange(presetColor)}
                  style={{
                    background: presetColor,
                    border:
                      presetColor === '#FFFFFF' ? '1px solid #E5DECE' : 'none',
                    outline: active ? '2px solid #27241E' : 'none',
                    outlineOffset: 2,
                  }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-hair bg-white px-2.5 py-2">
            <div
              className="size-5.5 rounded-md"
              style={{
                background: color,
                border: color === '#FFFFFF' ? '1px solid #E5DECE' : 'none',
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
              className="rounded-full"
              style={{
                width: previewDiameter,
                height: previewDiameter,
                background: isEraser ? 'transparent' : color,
                border: isEraser ? '2px dashed #8D8575' : 'none',
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
          {SIZE_PRESETS.map((preset) => {
            const active = size === preset;
            return (
              <Button
                key={preset}
                aria-label={`${preset}px`}
                data-active={active}
                onClick={() => onSizeChange(preset)}
                className={cx(
                  'grid h-8.5 flex-1 place-items-center rounded-lg border border-hair bg-white transition-colors duration-150 hover:not-data-[active=true]:border-ink hover:not-data-[active=true]:bg-background-draw',
                  active && 'border-ink bg-ink',
                )}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: Math.min(preset * 0.6, 14),
                    height: Math.min(preset * 0.6, 14),
                    background:
                      isEraser ? 'transparent'
                      : active ? '#fff'
                      : color,
                    border:
                      isEraser ?
                        `1.5px dashed ${active ? '#fff' : '#8D8575'}`
                      : 'none',
                  }}
                />
              </Button>
            );
          })}
        </div>
      </Section>

      {!isEraser && recentColors.length > 0 && (
        <Section label="Recent">
          <div className="flex gap-2">
            {recentColors.map((recent) => (
              <Button
                key={recent}
                aria-label={recent}
                onClick={() => onColorChange(recent)}
                className="ps-swatch h-7 w-7 rounded-full border-none p-0"
                style={{
                  background: recent,
                  border: recent === '#FFFFFF' ? '1px solid #E5DECE' : 'none',
                }}
              />
            ))}
          </div>
        </Section>
      )}

      <div className="flex-1" />
      <Button
        className="ps-danger-btn inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-hair bg-white text-[13px] font-medium text-ink"
        onClick={() => {
          if (confirm('Clear the whole drawing?')) onClear();
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Clear canvas
      </Button>
    </aside>
  );
};
