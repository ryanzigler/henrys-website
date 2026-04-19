'use client';

import { BrushRail } from '@/components/draw/BrushRail';
import {
  Canvas,
  type CanvasHandle,
  type StrokeControls,
} from '@/components/draw/Canvas';
import { StrokeControls as StrokeControlsPanel } from '@/components/draw/StrokeControls';
import { Toolbar } from '@/components/draw/Toolbar';
import { sanitizeFilename, saveBlobToPhotos } from '@/lib/drawing/saveToPhotos';
import type { Drawing, SaveState } from '@/types/drawing';
import { useRef, useState } from 'react';

interface EditorProps {
  drawing: Drawing;
}

const DEFAULT_CONTROLS: StrokeControls = {
  brush: 'pen',
  color: '#000000',
  opacity: 1,
  size: 8,
};

export const Editor = ({ drawing }: EditorProps) => {
  const canvasRef = useRef<CanvasHandle | null>(null);
  const [title, setTitle] = useState(drawing.title);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [controls, setControls] = useState<StrokeControls>(DEFAULT_CONTROLS);

  const updateControl = <TKey extends keyof StrokeControls>(
    key: TKey,
    value: StrokeControls[TKey],
  ) => setControls((current) => ({ ...current, [key]: value }));

  const commitTitle = async () => {
    if (title === drawing.title) {
      return;
    }

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
    if (!blob) {
      return;
    }

    await saveBlobToPhotos(blob, sanitizeFilename(title, drawing.id));
  };

  return (
    <div className="mx-auto flex max-w-360 flex-col gap-4 p-4">
      <Toolbar
        onClear={() => canvasRef.current?.clear()}
        onRedo={() => canvasRef.current?.redo()}
        onSaveToPhotos={onSaveToPhotos}
        onTitleChange={setTitle}
        onTitleCommit={commitTitle}
        onUndo={() => canvasRef.current?.undo()}
        saveState={saveState}
        title={title}
      />
      <div className="flex gap-4">
        <BrushRail
          onChange={(brush) => updateControl('brush', brush)}
          value={controls.brush}
        />
        <div className="flex-1 overflow-auto">
          <Canvas
            controls={controls}
            drawingId={drawing.id}
            initialStrokes={drawing.strokes}
            onSaveStateChange={setSaveState}
            ref={canvasRef}
          />
        </div>
        <StrokeControlsPanel
          color={controls.color}
          onColorChange={(color) => updateControl('color', color)}
          onOpacityChange={(opacity) => updateControl('opacity', opacity)}
          onSizeChange={(size) => updateControl('size', size)}
          opacity={controls.opacity}
          size={controls.size}
        />
      </div>
    </div>
  );
};
