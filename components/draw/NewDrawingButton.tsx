'use client';

import { Button } from '@base-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const NewDrawingButton = () => {
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

  return (
    <Button
      className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-3xl bg-white shadow-lg transition active:scale-95 disabled:opacity-50"
      disabled={creating}
      onClick={createDrawing}
    >
      <span className="text-6xl">＋</span>
      <span className="text-lg font-semibold">
        {creating ? 'Creating…' : 'New Drawing'}
      </span>
    </Button>
  );
};
