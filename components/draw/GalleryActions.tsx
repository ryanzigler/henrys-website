'use client';

import { Button } from '@base-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface GalleryActionsProps {
  id: string;
  title: string;
}

const DotsIcon = () => (
  <svg
    aria-hidden
    fill="currentColor"
    height="16"
    viewBox="0 0 24 24"
    width="16"
  >
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

const RenameIcon = () => (
  <svg aria-hidden fill="none" height="14" viewBox="0 0 20 20" width="14">
    <path
      d="M3 17l3-1 10-10-2-2L4 14l-1 3z M12 4l2 2"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const DeleteIcon = () => (
  <svg aria-hidden fill="none" height="14" viewBox="0 0 20 20" width="14">
    <path
      d="M3 6h14M7 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-11"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

export const GalleryActions = ({ id, title }: GalleryActionsProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (
        wrapperRef.current
        && !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const renameDrawing = async () => {
    setOpen(false);

    const nextTitle = prompt('New title:', title);
    if (nextTitle === null || nextTitle.trim() === '' || nextTitle === title) {
      return;
    }

    const response = await fetch(`/api/drawings/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: nextTitle }),
    });

    if (!response.ok) {
      alert('rename failed');
      return;
    }
    router.refresh();
  };

  const deleteDrawing = async () => {
    setOpen(false);

    if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }

    const response = await fetch(`/api/drawings/${id}`, { method: 'DELETE' });

    if (!response.ok) {
      alert('delete failed');
      return;
    }

    router.refresh();
  };

  const toggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <Button
        aria-haspopup="menu"
        aria-label="More actions"
        className="grid size-7.5 place-items-center rounded-lg border-none bg-transparent text-muted transition-colors duration-150 hover:bg-ivory"
        onClick={toggle}
      >
        <DotsIcon />
      </Button>

      {open && (
        <div
          className="shadow-gallery absolute top-full right-0 z-20 mt-1 w-40 rounded-lg border border-hair bg-white p-1.5"
          role="menu"
        >
          <button
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none bg-transparent px-2.5 py-2 text-left font-sans text-sm text-ink transition-colors duration-150 hover:bg-background-draw"
            onClick={(event) => {
              event.preventDefault();
              renameDrawing();
            }}
            role="menuitem"
            type="button"
          >
            <RenameIcon />
            Rename
          </button>
          <div className="mx-0.5 my-1 h-px bg-hair" />
          <button
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none bg-transparent px-2.5 py-2 text-left font-sans text-sm text-danger transition-colors hover:bg-accent-soft"
            onClick={(event) => {
              event.preventDefault();
              deleteDrawing();
            }}
            role="menuitem"
            type="button"
          >
            <DeleteIcon />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
