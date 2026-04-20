'use client';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import type { SaveState } from '@/types/drawing';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Toolbar — top bar of the drawing editor.
 *
 * FIX 2: Share/Save buttons now use <Button>, undo/redo use <IconButton>.
 * FIX 4: title uses text-display-sm instead of inline [21px] / leading / ts.
 *
 * The nested overflow-hidden wrapper around undo+redo is kept so they read
 * as a segmented control.
 */

interface ToolbarProps {
  onRedo: () => void;
  onSaveToPhotos: () => void;
  onTitleChange: (title: string) => void;
  onTitleCommit: () => void;
  onUndo: () => void;
  saveState: SaveState;
  title: string;
}

const SAVE_STATE_LABEL: Record<SaveState, string> = {
  error: 'Save failed',
  idle: 'Autosaved',
  saved: 'Autosaved',
  saving: 'Saving…',
};

const formatDate = () =>
  new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 14L4 9l5-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 9h10a6 6 0 0 1 6 6v1a4 4 0 0 1-4 4h-3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M15 14l5-5-5-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 9H10a6 6 0 0 0-6 6v1a4 4 0 0 0 4 4h3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Toolbar = ({
  onRedo,
  onSaveToPhotos,
  onTitleChange,
  onTitleCommit,
  onUndo,
  saveState,
  title,
}: ToolbarProps) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    onTitleCommit();
  };

  return (
    <div className="col-span-full flex h-16 items-center gap-5 border-b border-hair bg-ivory px-7">
      <Link
        className="flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink"
        href="/draw"
      >
        <span className="text-base">←</span> Gallery
      </Link>
      <div className="h-5.5 w-px bg-hair" />
      <div className="flex flex-col leading-[1.15]">
        {editing ?
          <input
            aria-label="title"
            className="w-56 border-b border-hair bg-transparent font-display text-display-sm text-ink outline-none"
            onBlur={commit}
            onChange={(event) => onTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              else if (event.key === 'Escape') {
                setEditing(false);
                onTitleChange(title);
              }
            }}
            ref={inputRef}
            value={title}
          />
        : <button
            className="cursor-text text-left font-display text-display-sm text-ink transition-colors duration-150 hover:text-ink"
            onClick={() => setEditing(true)}
            title="Rename"
          >
            {title}
          </button>
        }
        <div className="text-xs tracking-[0.2px] text-muted">
          {SAVE_STATE_LABEL[saveState]} · {formatDate()}
        </div>
      </div>
      <div className="flex-1" />

      <div className="flex overflow-hidden rounded-[10px] border border-hair bg-white">
        <IconButton
          size="lg"
          tone="default"
          onClick={onUndo}
          title="Undo"
          className="rounded-none"
        >
          <UndoIcon />
        </IconButton>
        <div className="w-px bg-hair" />
        <IconButton
          size="lg"
          tone="default"
          onClick={onRedo}
          title="Redo"
          className="rounded-none"
        >
          <RedoIcon />
        </IconButton>
      </div>

      <Button variant="ghost" disabled title="Share (coming soon)">
        Share
      </Button>
      <Button variant="primary" onClick={onSaveToPhotos}>
        Save
      </Button>
    </div>
  );
};
