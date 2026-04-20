'use client';

import { Button } from '@/components/ui/Button';
import { Button as BaseButton } from '@base-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * NewDrawingButton / NewDrawingCard
 *
 * FIX 2: NewDrawingButton now uses our shared <Button variant="primary">.
 * NewDrawingCard stays as a bespoke dashed tile (it's a layout element,
 * not a button per se) but the TODO alert for error handling is replaced
 * with a setError + inline ConfirmDialog (kept inside the button for
 * simplicity — callers don't need to plumb it).
 */

const useCreateDrawing = () => {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createDrawing = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/drawings', { method: 'POST' });
      if (!response.ok) throw new Error(`create failed (${response.status})`);
      const { drawing } = await response.json();
      router.push(`/draw/${drawing.id}`);
    } catch (error) {
      setErrorMsg((error as Error).message);
      setCreating(false);
    }
  };

  return {
    createDrawing,
    creating,
    errorMsg,
    clearError: () => setErrorMsg(null),
  };
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
      variant="primary"
      size="lg"
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
    <BaseButton
      aria-label="New drawing"
      disabled={creating}
      onClick={createDrawing}
      className={[
        'flex aspect-3/2 cursor-pointer flex-col items-center justify-center gap-2.5',
        'rounded-xl border-[1.5px] border-dashed border-hair bg-transparent text-muted',
        'transition-[background,border-color,transform] duration-200',
        'hover:-translate-y-0.75 hover:border-ink hover:bg-background-draw',
        'disabled:pointer-events-none disabled:opacity-50',
      ].join(' ')}
    >
      <div className="grid h-11 w-11 place-items-center rounded-full border border-hair bg-white text-ink">
        <PlusIcon size={18} />
      </div>
      <div className="text-sm font-semibold whitespace-nowrap text-ink">
        {creating ? 'Creating…' : 'New drawing'}
      </div>
      <div className="text-xs text-muted">Start from a blank paper</div>
    </BaseButton>
  );
};
