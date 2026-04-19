'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import getStroke from 'perfect-freehand';
import type { Brush, Stroke } from '@/lib/drawing/types';
import { BRUSHES } from '@/components/draw/brushes';
import {
  canvasToPngBlob,
  canvasToPngDataUrl,
  rasterizeStrokes,
} from '@/components/draw/exportPng';

export const LOGICAL_WIDTH = 1200;
export const LOGICAL_HEIGHT = 1600;
const AUTOSAVE_DEBOUNCE_MS = 2000;

export interface StrokeControls {
  brush: Brush;
  size: number;
  opacity: number;
  color: string;
}

export interface CanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  getStrokes: () => Stroke[];
  exportFullResBlob: () => Promise<Blob>;
}

interface Props {
  drawingId: string;
  initialStrokes: Stroke[];
  controls: StrokeControls;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveStateChange?: (state: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { drawingId, initialStrokes, controls, onDirtyChange, onSaveStateChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>(initialStrokes);
  const redoRef = useRef<Stroke[]>([]);
  const liveRef = useRef<Stroke | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRedraw] = useState(0);
  const redraw = useCallback(() => forceRedraw((tick) => tick + 1), []);

  // --- drawing ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = LOGICAL_WIDTH * devicePixelRatio;
    canvas.height = LOGICAL_HEIGHT * devicePixelRatio;
    canvas.style.width = `${LOGICAL_WIDTH}px`;
    canvas.style.height = `${LOGICAL_HEIGHT}px`;
    const context = canvas.getContext('2d');
    if (context) context.scale(devicePixelRatio, devicePixelRatio);
    paintAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paintAll = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();

    const allStrokes =
      liveRef.current ?
        [...strokesRef.current, liveRef.current]
      : strokesRef.current;
    for (const stroke of allStrokes) paintStroke(context, stroke);
  }, []);

  useEffect(paintAll);

  const paintStroke = (context: CanvasRenderingContext2D, stroke: Stroke) => {
    const preset = BRUSHES[stroke.brush];
    const outline = getStroke(stroke.points, {
      ...preset.options,
      size: stroke.size,
    });
    if (outline.length === 0) return;
    context.globalCompositeOperation = preset.composite;
    context.fillStyle = stroke.color;
    context.globalAlpha = stroke.opacity;
    context.beginPath();
    context.moveTo(outline[0][0], outline[0][1]);
    for (let index = 1; index < outline.length; index++)
      context.lineTo(outline[index][0], outline[index][1]);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  };

  // --- pointer events ---

  const pointerPos = (event: React.PointerEvent): [number, number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    const pressure = event.pointerType === 'pen' ? event.pressure || 0.5 : 0.5;
    return [x, y, pressure];
  };

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    liveRef.current = {
      brush: controls.brush,
      size: controls.size,
      opacity: controls.opacity,
      color: controls.color,
      points: [pointerPos(event)],
    };
    redraw();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!liveRef.current) return;
    liveRef.current.points.push(pointerPos(event));
    redraw();
  };

  const onPointerUp = () => {
    if (!liveRef.current) return;
    strokesRef.current = [...strokesRef.current, liveRef.current];
    redoRef.current = [];
    liveRef.current = null;
    onDirtyChange?.(true);
    scheduleAutosave();
    redraw();
  };

  // --- autosave ---

  const scheduleAutosave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void runAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const runAutosave = async () => {
    onSaveStateChange?.('saving');
    try {
      const thumbCanvas = rasterizeStrokes(strokesRef.current, {
        width: 400,
        height: 533,
      });
      const response = await fetch(`/api/drawings/${drawingId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          strokes: strokesRef.current,
          thumbnailPngBase64: canvasToPngDataUrl(thumbCanvas),
        }),
      });
      if (!response.ok) throw new Error(`save failed: ${response.status}`);
      onDirtyChange?.(false);
      onSaveStateChange?.('saved');
    } catch {
      onSaveStateChange?.('error');
    }
  };

  // --- imperative handle ---

  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        const lastStroke = strokesRef.current[strokesRef.current.length - 1];
        if (!lastStroke) return;
        strokesRef.current = strokesRef.current.slice(0, -1);
        redoRef.current = [...redoRef.current, lastStroke];
        onDirtyChange?.(true);
        scheduleAutosave();
        redraw();
      },
      redo: () => {
        const nextStroke = redoRef.current[redoRef.current.length - 1];
        if (!nextStroke) return;
        redoRef.current = redoRef.current.slice(0, -1);
        strokesRef.current = [...strokesRef.current, nextStroke];
        onDirtyChange?.(true);
        scheduleAutosave();
        redraw();
      },
      clear: () => {
        if (strokesRef.current.length === 0) return;
        strokesRef.current = [];
        redoRef.current = [];
        onDirtyChange?.(true);
        scheduleAutosave();
        redraw();
      },
      getStrokes: () => strokesRef.current,
      exportFullResBlob: () =>
        canvasToPngBlob(
          rasterizeStrokes(strokesRef.current, {
            width: LOGICAL_WIDTH * 2,
            height: LOGICAL_HEIGHT * 2,
          }),
        ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawingId],
  );

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="touch-none rounded-lg bg-white shadow-lg"
      style={{ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT }}
    />
  );
});
