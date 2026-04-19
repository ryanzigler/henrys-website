'use client';

import { Button } from '@base-ui/react';
import Link from 'next/link';
import { useState } from 'react';

interface Props {
  title: string;
  onTitleChange: (title: string) => void;
  onTitleCommit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSaveToPhotos: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
}

export const Toolbar = ({
  title,
  onTitleChange,
  onTitleCommit,
  onUndo,
  onRedo,
  onClear,
  onSaveToPhotos,
  saveState,
}: Props) => {
  const [draftTitle, setDraftTitle] = useState(title);

  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-white p-3 shadow">
      <Link
        href="/draw"
        className="rounded bg-gray-100 px-3 py-2 text-sm font-semibold"
      >
        ← Gallery
      </Link>
      <input
        className="flex-1 rounded border px-3 py-2 text-lg font-semibold"
        value={draftTitle}
        onChange={(event) => {
          setDraftTitle(event.target.value);
          onTitleChange(event.target.value);
        }}
        onBlur={onTitleCommit}
        aria-label="title"
      />
      <Button
        onClick={onUndo}
        className="rounded bg-gray-100 px-3 py-2 text-sm"
      >
        Undo
      </Button>
      <Button
        onClick={onRedo}
        className="rounded bg-gray-100 px-3 py-2 text-sm"
      >
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
        {saveState === 'saving' && 'saving…'}
        {saveState === 'saved' && 'saved'}
        {saveState === 'error' && 'save failed'}
      </span>
    </div>
  );
};
