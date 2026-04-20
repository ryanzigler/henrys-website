'use client';

import { Button } from '@base-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const useCreateDrawing = () => {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const createDrawing = async () => {
    setCreating(true);

    try {
      const response = await fetch('/api/drawings', { method: 'POST' });

      if (!response.ok) {
        throw new Error(`create failed (${response.status})`);
      }

      const { drawing } = await response.json();
      router.push(`/draw/${drawing.id}`);
    } catch (error) {
      alert((error as Error).message);
      setCreating(false);
    }
  };

  return { createDrawing, creating };
};

const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg aria-hidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

export const NewDrawingButton = () => {
  const { createDrawing, creating } = useCreateDrawing();

  return (
    <Button
      className="hover:bg-new-drawing hover:shadow-button-hover active:shadow-button-active inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-none bg-ink px-4.5 text-sm font-semibold whitespace-nowrap text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-0.25 active:translate-y-0 disabled:opacity-50"
      disabled={creating}
      onClick={createDrawing}
    >
      <PlusIcon />
      {creating ? 'Creating…' : 'New drawing'}
    </Button>
  );
};

export const NewDrawingCard = () => {
  const { createDrawing, creating } = useCreateDrawing();

  return (
    <Button
      aria-label="New drawing"
      className="hover:bg-danger-soft flex aspect-3/2 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-hair bg-transparent text-muted transition-[background,border-color,transform] duration-200 hover:-translate-y-0.75 hover:border-ink disabled:opacity-50"
      disabled={creating}
      onClick={createDrawing}
    >
      <div className="grid h-11 w-11 place-items-center rounded-full border border-hair bg-white text-ink">
        <PlusIcon size={18} />
      </div>
      <div className="text-sm font-semibold whitespace-nowrap text-ink">
        {creating ? 'Creating…' : 'New drawing'}
      </div>
      <div className="text-xs text-muted">Start from a blank paper</div>
    </Button>
  );
};
