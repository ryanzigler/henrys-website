'use client';

import { useRef, useState } from 'react';
import type { Drawing, Brush } from '@/lib/drawing/types';
import {
  Canvas,
  type CanvasHandle,
  type StrokeControls,
} from '@/components/draw/Canvas';
import { BrushRail } from '@/components/draw/BrushRail';
import { StrokeControls as StrokeControlsPanel } from '@/components/draw/StrokeControls';
import { Toolbar } from '@/components/draw/Toolbar';
import {
  sanitizeFilename,
  saveBlobToPhotos,
} from '@/components/draw/saveToPhotos';

interface Props {
  drawing: Drawing;
}

export const Editor = ({ drawing }: Props) => {
  const canvasRef = useRef<CanvasHandle>(null);
  const [title, setTitle] = useState(drawing.title);
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [controls, setControls] = useState<StrokeControls>({
    brush: 'pen' as Brush,
    size: 8,
    opacity: 1,
    color: '#000000',
  });

  const commitTitle = async () => {
    if (title === drawing.title) return;
    setSaveState('saving');
    const response = await fetch(`/api/drawings/${drawing.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSaveState(response.ok ? 'saved' : 'error');
  };

  const onSaveToPhotos = async () => {
    const blob = await canvasRef.current?.exportFullResBlob();
    if (!blob) return;
    await saveBlobToPhotos(blob, sanitizeFilename(title, drawing.id));
  };

  return (
    <div className="mx-auto flex max-w-360 flex-col gap-4 p-4">
      <Toolbar
        title={title}
        onTitleChange={setTitle}
        onTitleCommit={commitTitle}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onClear={() => canvasRef.current?.clear()}
        onSaveToPhotos={onSaveToPhotos}
        saveState={saveState}
      />
      <div className="flex gap-4">
        <BrushRail
          value={controls.brush}
          onChange={(brush) =>
            setControls((current) => ({ ...current, brush }))
          }
        />
        <div className="flex-1 overflow-auto">
          <Canvas
            ref={canvasRef}
            drawingId={drawing.id}
            initialStrokes={drawing.strokes}
            controls={controls}
            onSaveStateChange={setSaveState}
          />
        </div>
        <StrokeControlsPanel
          size={controls.size}
          opacity={controls.opacity}
          color={controls.color}
          onSizeChange={(size) =>
            setControls((current) => ({ ...current, size }))
          }
          onOpacityChange={(opacity) =>
            setControls((current) => ({ ...current, opacity }))
          }
          onColorChange={(color) =>
            setControls((current) => ({ ...current, color }))
          }
        />
      </div>
    </div>
  );
};
