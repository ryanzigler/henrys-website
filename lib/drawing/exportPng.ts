import { BRUSHES } from '@/lib/drawing/brushes';
import type { Point, Stroke } from '@/types/drawing';
import getStroke from 'perfect-freehand';

export const LOGICAL_WIDTH = 1200;
export const LOGICAL_HEIGHT = 1600;

export const paintStroke = (
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  points: Point[] = stroke.points,
  sizeScale = 1,
) => {
  const preset = BRUSHES[stroke.brush];
  const outline = getStroke(points, {
    ...preset.options,
    size: stroke.size * sizeScale,
  });
  if (outline.length === 0) return;
  context.globalCompositeOperation = preset.composite;
  context.fillStyle = stroke.color;
  context.globalAlpha = stroke.opacity;
  context.beginPath();
  context.moveTo(outline[0][0], outline[0][1]);
  for (let index = 1; index < outline.length; index++) {
    context.lineTo(outline[index][0], outline[index][1]);
  }
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
};

interface RasterizeOptions {
  width?: number;
  height?: number;
  background?: string;
}

export const rasterizeStrokes = (
  strokes: Stroke[],
  opts: RasterizeOptions = {},
) => {
  const width = opts.width ?? LOGICAL_WIDTH;
  const height = opts.height ?? LOGICAL_HEIGHT;
  const scaleX = width / LOGICAL_WIDTH;
  const scaleY = height / LOGICAL_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2d context');

  context.fillStyle = opts.background ?? '#ffffff';
  context.fillRect(0, 0, width, height);

  for (const stroke of strokes) {
    const scaledPoints = stroke.points.map(
      ([x, y, pressure]) => [x * scaleX, y * scaleY, pressure] as Point,
    );
    paintStroke(context, stroke, scaledPoints, Math.min(scaleX, scaleY));
  }

  return canvas;
};

export const canvasToPngDataUrl = (canvas: HTMLCanvasElement) =>
  canvas.toDataURL('image/png');

export const canvasToPngBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
    );
  });
