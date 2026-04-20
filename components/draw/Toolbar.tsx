'use client';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { formatDate } from '@/lib/utils';
import type { SaveState } from '@/types/drawing';
import { MoveLeft, Redo2, Save, Share, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface ToolbarProps {
  onRedo: () => void;
  onSaveToPhotos: () => void;
  onTitleChange: (title: string) => void;
  onTitleCommit: () => void;
  onUndo: () => void;
  saveState: SaveState;
  title: string;
}

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

  const saveStateLabel = {
    error: 'Save failed',
    idle: 'Autosaved',
    saved: 'Autosaved',
    saving: 'Saving…',
  }[saveState];

  return (
    <div className="col-span-full flex h-16 items-center gap-5 border-b border-hair bg-ivory px-7">
      <Link
        className="flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink"
        href="/draw"
      >
        <span className="text-base">
          <MoveLeft size={14} />
        </span>{' '}
        Gallery
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
          {saveStateLabel} · {formatDate()}
        </div>
      </div>
      <div className="flex-1" />

      <div className="flex overflow-hidden rounded-lg border border-hair bg-white">
        <IconButton
          className="rounded-none"
          onClick={onUndo}
          size="lg"
          title="Undo"
          tone="default"
        >
          <Undo2 size={16} />
        </IconButton>
        <div className="w-px bg-hair" />
        <IconButton
          className="rounded-none"
          onClick={onRedo}
          size="lg"
          title="Redo"
          tone="default"
        >
          <Redo2 size={16} />
        </IconButton>
      </div>

      <Button title="Share (coming soon)" variant="ghost" disabled>
        <Share size={14} /> Share
      </Button>
      <Button variant="primary" onClick={onSaveToPhotos}>
        <Save size={14} /> Save
      </Button>
    </div>
  );
};
