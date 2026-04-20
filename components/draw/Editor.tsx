'use client';

import { BrushRail } from '@/components/draw/BrushRail';
import {
  Canvas,
  type CanvasHandle,
  type StrokeControls as StrokeControlsType,
} from '@/components/draw/Canvas';
import { StrokeControls as PropertiesPanel } from '@/components/draw/StrokeControls';
import { Toolbar } from '@/components/draw/Toolbar';
import { sanitizeFilename, saveBlobToPhotos } from '@/lib/drawing/saveToPhotos';
import type { Drawing, SaveState } from '@/types/drawing';
import { Button } from '@base-ui/react';
import { useRef, useState } from 'react';

interface EditorProps {
  drawing: Drawing;
}

export const Editor = ({ drawing }: EditorProps) => {
  const canvasRef = useRef<CanvasHandle | null>(null);
  const [title, setTitle] = useState(drawing.title);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [paperColor, setPaperColor] = useState('var(--color-paper)');
  const [showGrid, setShowGrid] = useState(true);
  const [paperOpen, setPaperOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(3);
  const [controls, setControls] = useState<StrokeControlsType>({
    brush: 'pen',
    color: 'oklch(0.6811 0.1545 31.48)',
    opacity: 1,
    size: 6,
  });

  const zoomSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const;
  const zoom = zoomSteps[zoomIndex];
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < zoomSteps.length - 1;

  const zoomOut = () => setZoomIndex((index) => Math.max(0, index - 1));
  const zoomIn = () =>
    setZoomIndex((index) => Math.min(zoomSteps.length - 1, index + 1));

  const updateControl = <TKey extends keyof StrokeControlsType>(
    key: TKey,
    value: StrokeControlsType[TKey],
  ) => setControls((current) => ({ ...current, [key]: value }));

  const chooseColor = (chosen: string) => {
    updateControl('color', chosen);
    setRecentColors((previous) =>
      [chosen, ...previous.filter((other) => other !== chosen)].slice(0, 5),
    );
  };

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
    <div className="fixed inset-0 z-50 grid grid-cols-[1fr_280px] grid-rows-[64px_1fr] overflow-hidden bg-ivory font-sans text-ink">
      <Toolbar
        onRedo={() => canvasRef.current?.redo()}
        onSaveToPhotos={onSaveToPhotos}
        onTitleChange={setTitle}
        onTitleCommit={commitTitle}
        onUndo={() => canvasRef.current?.undo()}
        saveState={saveState}
        title={title}
      />

      <div className="relative flex origin-center items-center justify-center overflow-hidden bg-canvas p-12 transition-transform duration-120">
        <div
          style={{
            transform: `scale(${zoom})`,
          }}
        >
          <Canvas
            controls={controls}
            drawingId={drawing.id}
            initialStrokes={drawing.strokes}
            onSaveStateChange={setSaveState}
            paperColor={paperColor}
            ref={canvasRef}
            showGrid={showGrid}
          />
        </div>

        <div className="absolute right-5 bottom-5 flex items-center gap-1.5 rounded-full border border-hair bg-white py-1 pr-1 pl-3.5 text-xs text-muted shadow-[0_4px_16px_rgba(60,40,20,0.06)]">
          <span className="font-mono">{Math.round(zoom * 100)}%</span>
          <Button
            className="ps-zoom-pill size-6 rounded-full border-none bg-ivory text-sm text-ink"
            disabled={!canZoomOut}
            onClick={zoomOut}
            title="Zoom out"
          >
            −
          </Button>
          <Button
            className="ps-zoom-pill size-6 rounded-full border-none bg-ivory text-sm text-ink"
            disabled={!canZoomIn}
            onClick={zoomIn}
            title="Zoom in"
          >
            +
          </Button>
        </div>

        <BrushRail
          onChange={(brush) => updateControl('brush', brush)}
          onPaperClose={() => setPaperOpen(false)}
          onPaperColorChange={setPaperColor}
          onPaperToggle={() => setPaperOpen((open) => !open)}
          onShowGridChange={setShowGrid}
          paperColor={paperColor}
          paperOpen={paperOpen}
          showGrid={showGrid}
          value={controls.brush}
        />
      </div>

      <PropertiesPanel
        color={controls.color}
        onClear={() => canvasRef.current?.clear()}
        onColorChange={chooseColor}
        onSizeChange={(size) => updateControl('size', size)}
        recentColors={recentColors}
        size={controls.size}
        tool={controls.brush}
      />
    </div>
  );
};
