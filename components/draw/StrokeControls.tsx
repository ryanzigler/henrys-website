'use client';

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

interface Props {
  size: number;
  opacity: number;
  color: string;
  onSizeChange: (size: number) => void;
  onOpacityChange: (opacity: number) => void;
  onColorChange: (color: string) => void;
}

export const StrokeControls = ({
  size,
  opacity,
  color,
  onSizeChange,
  onOpacityChange,
  onColorChange,
}: Props) => {
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
          type="range"
          min={1}
          max={60}
          value={size}
          onChange={(event) => onSizeChange(Number(event.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold">
          Opacity: {Math.round(opacity * 100)}%
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={opacity * 100}
          onChange={(event) =>
            onOpacityChange(Number(event.target.value) / 100)
          }
          className="mt-1 w-full"
        />
      </label>
      <div>
        <span className="text-xs font-semibold">Color</span>
        <div className="mt-1 grid grid-cols-6 gap-1">
          {PRESET_COLORS.map((presetColor) => (
            <Button
              key={presetColor}
              aria-label={presetColor}
              onClick={() => pickColor(presetColor)}
              className={`h-8 w-8 rounded-full border ${
                color === presetColor ? 'ring-2 ring-black' : ''
              }`}
              style={{ background: presetColor }}
            />
          ))}
        </div>
        <input
          type="color"
          value={color}
          onChange={(event) => pickColor(event.target.value)}
          className="mt-2 h-8 w-full"
          aria-label="custom color"
        />
        {recentColors.length > 0 && (
          <div className="mt-2 flex gap-1" aria-label="Recent colors">
            {recentColors.map((recentColor) => (
              <Button
                key={recentColor}
                onClick={() => pickColor(recentColor)}
                className="h-6 w-6 rounded-full border"
                style={{ background: recentColor }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
