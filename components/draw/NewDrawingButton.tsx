'use client';

import { Button } from '@/components/ui/Button';
import { useCreateDrawing } from '@/hooks/useCreateDrawing';
import { Button as BaseButton } from '@base-ui/react';
import { Plus } from 'lucide-react';

export const NewDrawingButton = () => {
  const { createDrawing, creating } = useCreateDrawing();

  return (
    <Button
      disabled={creating}
      onClick={createDrawing}
      size="lg"
      variant="primary"
    >
      <Plus size={16} />
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
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-hair bg-background-draw text-left transition duration-200 hover:-translate-y-0.75 hover:shadow-gallery disabled:pointer-events-none disabled:opacity-50"
    >
      <div className="flex aspect-3/2 items-center justify-center rounded-t-xl bg-new-drawing-thumb transition-colors duration-200">
        <div className="grid size-11 place-items-center rounded-full bg-ink text-paper transition duration-200 group-hover:rotate-90">
          <Plus size={18} />
        </div>
      </div>
      <div className="px-4 py-3.5">
        <div className="tracking-tightest font-display text-lg font-medium whitespace-nowrap text-ink">
          {creating ? 'Creating…' : 'New drawing'}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          Start from a blank paper
        </div>
      </div>
    </BaseButton>
  );
};
