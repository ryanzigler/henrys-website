export type Brush = 'pen' | 'marker' | 'pencil' | 'eraser';

export type Point = [x: number, y: number, pressure: number];

export interface Stroke {
  brush: Brush;
  size: number;
  opacity: number;
  color: string;
  points: Point[];
}

export interface DrawingMeta {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  blobJsonUrl: string;
  blobPngUrl: string | null;
}

export interface Drawing extends DrawingMeta {
  strokes: Stroke[];
}
