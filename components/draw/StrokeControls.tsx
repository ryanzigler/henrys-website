'use client';

import { cx } from '@/cva.config';
import { Button } from '@base-ui/react';
import { useState } from 'react';

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#8e24aa',
  '#d81b60',
  '#6d4c41',
  '#00acc1',
  '#757575',
];

interface StrokeControlProps {
  color: string;
  onColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
  onSizeChange: (size: number) => void;
  opacity: number;
  size: number;
}

export const StrokeControls = ({
  color,
  onColorChange,
  onOpacityChange,
  onSizeChange,
  opacity,
  size,
}: StrokeControlProps) => {
  const [recentColors, setRecentColors] = useState<string[]>([]);

  const pickColor = (chosen: string) => {
    onColorChange(chosen);
    setRecentColors((previous) =>
      [chosen, ...previous.filter((other) => other !== chosen)].slice(0, 6),
    );
  };

  return (
    <div className="flex w-52 flex-col gap-4 rounded-xl bg-white p-4 shadow">
      <label className="block">
        <span className="text-xs font-semibold">Size: {size}</span>
        <input
          className="mt-1 w-full"
          max={60}
          min={1}
          onChange={(event) => onSizeChange(Number(event.target.value))}
          type="range"
          value={size}
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold">
          Opacity: {Math.round(opacity * 100)}%
        </span>
        <input
          className="mt-1 w-full"
          max={100}
          min={10}
          onChange={(event) =>
            onOpacityChange(Number(event.target.value) / 100)
          }
          type="range"
          value={opacity * 100}
        />
      </label>
      <div>
        <span className="text-xs font-semibold">Color</span>
        <div className="mt-1 grid grid-cols-6 gap-1">
          {PRESET_COLORS.map((presetColor) => (
            <Button
              aria-label={presetColor}
              className={cx(
                'h-8 w-8 rounded-full border',
                color === presetColor && 'ring-2 ring-black',
              )}
              key={presetColor}
              onClick={() => pickColor(presetColor)}
              style={{ background: presetColor }}
            />
          ))}
        </div>
        <input
          aria-label="custom color"
          className="mt-2 h-8 w-full"
          onChange={(event) => pickColor(event.target.value)}
          type="color"
          value={color}
        />
        {recentColors.length > 0 && (
          <div className="mt-2 flex gap-1" aria-label="Recent colors">
            {recentColors.map((recentColor) => (
              <Button
                aria-label={recentColor}
                className="h-6 w-6 rounded-full border"
                key={recentColor}
                onClick={() => pickColor(recentColor)}
                style={{ background: recentColor }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
