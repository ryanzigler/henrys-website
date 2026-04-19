'use client';

import type { SaveState } from '@/types/drawing';
import { Button } from '@base-ui/react';
import Link from 'next/link';

interface ToolbarProps {
  onClear: () => void;
  onRedo: () => void;
  onSaveToPhotos: () => void;
  onTitleChange: (title: string) => void;
  onTitleCommit: () => void;
  onUndo: () => void;
  saveState: SaveState;
  title: string;
}

const SAVE_STATE_LABEL: Record<SaveState, string> = {
  error: 'save failed',
  idle: '',
  saved: 'saved',
  saving: 'saving…',
};

export const Toolbar = ({
  onClear,
  onRedo,
  onSaveToPhotos,
  onTitleChange,
  onTitleCommit,
  onUndo,
  saveState,
  title,
}: ToolbarProps) => (
  <div className="flex w-full items-center gap-3 rounded-xl bg-white p-3 shadow">
    <Link
      href="/draw"
      className="rounded bg-gray-100 px-3 py-2 text-sm font-semibold"
    >
      ← Gallery
    </Link>
    <input
      className="flex-1 rounded border px-3 py-2 text-lg font-semibold"
      value={title}
      onChange={(event) => onTitleChange(event.target.value)}
      onBlur={onTitleCommit}
      aria-label="title"
    />
    <Button onClick={onUndo} className="rounded bg-gray-100 px-3 py-2 text-sm">
      Undo
    </Button>
    <Button onClick={onRedo} className="rounded bg-gray-100 px-3 py-2 text-sm">
      Redo
    </Button>
    <Button
      onClick={() => {
        if (confirm('Clear the whole drawing?')) onClear();
      }}
      className="rounded bg-gray-100 px-3 py-2 text-sm"
    >
      Clear
    </Button>
    <Button
      onClick={onSaveToPhotos}
      className="rounded bg-black px-4 py-2 text-sm font-semibold text-white"
    >
      Save to Photos
    </Button>
    <span className="w-20 text-right text-xs text-gray-500">
      {SAVE_STATE_LABEL[saveState]}
    </span>
  </div>
);
