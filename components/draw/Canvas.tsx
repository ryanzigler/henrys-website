'use client';

import { cx } from '@/cva.config';
import {
  canvasToPngBlob,
  canvasToPngDataUrl,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  paintStroke,
  rasterizeStrokes,
} from '@/lib/drawing/exportPng';
import type { Brush, SaveState, Stroke } from '@/types/drawing';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from 'react';

export { LOGICAL_HEIGHT, LOGICAL_WIDTH };

const AUTOSAVE_DEBOUNCE_MS = 2000;

export interface StrokeControls {
  brush: Brush;
  color: string;
  opacity: number;
  size: number;
}

export interface CanvasHandle {
  clear: () => void;
  exportFullResBlob: () => Promise<Blob>;
  getStrokes: () => Stroke[];
  redo: () => void;
  undo: () => void;
}

interface CanvasProps {
  controls: StrokeControls;
  drawingId: string;
  initialStrokes: Stroke[];
  onDirtyChange?: (dirty: boolean) => void;
  onSaveStateChange?: (state: SaveState) => void;
  paperColor?: string;
  showGrid?: boolean;
  ref: RefObject<CanvasHandle | null>;
}

export const Canvas = ({
  drawingId,
  initialStrokes,
  controls,
  onDirtyChange,
  onSaveStateChange,
  paperColor = '#FDFBF5',
  showGrid = false,
  ref,
}: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baselineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>(initialStrokes);
  const redoRef = useRef<Stroke[]>([]);
  const liveRef = useRef<Stroke | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const clearContext = (
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
  ) => {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
  };

  const repaintBaseline = useCallback(() => {
    const canvas = baselineCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    clearContext(canvas, context);

    for (const stroke of strokesRef.current) {
      paintStroke(context, stroke);
    }
  }, []);

  const appendToBaseline = useCallback((stroke: Stroke) => {
    const context = baselineCanvasRef.current?.getContext('2d');
    if (!context) {
      return;
    }

    paintStroke(context, stroke);
  }, []);

  const paintLive = useCallback(() => {
    const canvas = canvasRef.current;
    const baseline = baselineCanvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context || !baseline) {
      return;
    }

    clearContext(canvas, context);
    context.drawImage(baseline, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (liveRef.current) {
      paintStroke(context, liveRef.current);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = LOGICAL_WIDTH * devicePixelRatio;
    canvas.height = LOGICAL_HEIGHT * devicePixelRatio;
    canvas.style.width = `${LOGICAL_WIDTH}px`;
    canvas.style.height = `${LOGICAL_HEIGHT}px`;

    canvas.getContext('2d')?.scale(devicePixelRatio, devicePixelRatio);

    const baseline = document.createElement('canvas');
    baseline.width = LOGICAL_WIDTH * devicePixelRatio;
    baseline.height = LOGICAL_HEIGHT * devicePixelRatio;
    baseline.getContext('2d')?.scale(devicePixelRatio, devicePixelRatio);
    baselineCanvasRef.current = baseline;

    repaintBaseline();
    paintLive();
  }, [paintLive, repaintBaseline]);

  useEffect(
    () => () => {
      if (!saveTimerRef.current) {
        return;
      }

      clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const runAutosave = useCallback(async () => {
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

      if (!response.ok) {
        throw new Error(`save failed: ${response.status}`);
      }

      onDirtyChange?.(false);
      onSaveStateChange?.('saved');
    } catch {
      onSaveStateChange?.('error');
    }
  }, [drawingId, onDirtyChange, onSaveStateChange]);

  const scheduleAutosave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void runAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [runAutosave]);

  const pointerPos = (event: React.PointerEvent): [number, number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    const pressure = event.pointerType === 'pen' ? event.pressure || 0.5 : 0.5;

    return [x, y, pressure];
  };

  const updateCursor = (event: React.PointerEvent) => {
    const [x, y] = pointerPos(event);
    setCursor({ x, y });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateCursor(event);

    liveRef.current = {
      brush: controls.brush,
      size: controls.size,
      opacity: controls.opacity,
      color: controls.color,
      points: [pointerPos(event)],
    };

    paintLive();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    updateCursor(event);

    if (!liveRef.current) {
      return;
    }

    liveRef.current.points.push(pointerPos(event));
    paintLive();
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const committed = liveRef.current;
    if (committed) {
      strokesRef.current.push(committed);
      redoRef.current.length = 0;
      liveRef.current = null;
      appendToBaseline(committed);
      onDirtyChange?.(true);
      scheduleAutosave();
      paintLive();
    }

    if (event.pointerType !== 'mouse') {
      setCursor(null);
    }
  };

  const onPointerEnter = (event: React.PointerEvent) => {
    updateCursor(event);
  };

  const onPointerLeave = () => {
    if (!liveRef.current) {
      setCursor(null);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        if (strokesRef.current.length === 0) {
          return;
        }

        strokesRef.current.length = 0;
        redoRef.current.length = 0;
        onDirtyChange?.(true);
        scheduleAutosave();
        repaintBaseline();
        paintLive();
      },
      exportFullResBlob: () =>
        canvasToPngBlob(
          rasterizeStrokes(strokesRef.current, {
            width: LOGICAL_WIDTH * 2,
            height: LOGICAL_HEIGHT * 2,
          }),
        ),
      getStrokes: () => strokesRef.current,
      redo: () => {
        const nextStroke = redoRef.current.pop();
        if (!nextStroke) {
          return;
        }

        strokesRef.current.push(nextStroke);
        appendToBaseline(nextStroke);
        onDirtyChange?.(true);
        scheduleAutosave();
        paintLive();
      },
      undo: () => {
        const lastStroke = strokesRef.current.pop();
        if (!lastStroke) {
          return;
        }

        redoRef.current.push(lastStroke);
        onDirtyChange?.(true);
        scheduleAutosave();
        repaintBaseline();
        paintLive();
      },
    }),

    [
      appendToBaseline,
      onDirtyChange,
      paintLive,
      repaintBaseline,
      scheduleAutosave,
    ],
  );

  const isDarkPaper = paperColor === '#2B2A2E';

  return (
    <div
      className="relative h-400 w-300 overflow-hidden rounded-sm shadow-canvas transition-[background] duration-200"
      style={{
        background: paperColor,
      }}
    >
      {showGrid && (
        <div
          aria-hidden
          className={cx(
            'from-grid-light pointer-events-none absolute inset-0 bg-radial from-[1.2px] to-transparent to-[1.4px] bg-size-[18px_18px]',
            isDarkPaper && 'from-black/8',
          )}
        />
      )}
      <canvas
        className="relative block cursor-none touch-none"
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={canvasRef}
        style={{ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT }}
      />
      {cursor && (
        <div
          aria-hidden
          className={cx(
            'shadow-brush-cursor-light pointer-events-none absolute -translate-1/2 rounded-full border-[1.5px] border-ink/55',
            {
              'shadow-brush-cursor-dark border-white/75 bg-white': isDarkPaper,
            },
          )}
          style={{
            left: cursor.x,
            top: cursor.y,
            width: controls.size,
            height: controls.size,
          }}
        />
      )}
    </div>
  );
};
