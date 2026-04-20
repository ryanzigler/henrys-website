'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { Menu } from '@/components/ui/Menu';
import { PromptDialog } from '@/components/ui/PromptDialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * GalleryActions — the "⋯" menu on gallery tiles.
 *
 * FIX 7: replaces window.confirm / window.prompt with styled modals.
 * FIX 2: replaces the hand-rolled dropdown with Base UI Menu.
 *
 * Error states from the API used to surface as window.alert — now they
 * come back as a toast-less setError that shows in a tiny inline dialog.
 * (If you want a proper toast system later, the dialog below is trivial
 * to swap.)
 */

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
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const renameDrawing = async (nextTitle: string) => {
    if (nextTitle === title) return;
    const response = await fetch(`/api/drawings/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: nextTitle }),
    });
    if (!response.ok) {
      setErrorMsg('Rename failed. Try again.');
      return;
    }
    router.refresh();
  };

  const deleteDrawing = async () => {
    const response = await fetch(`/api/drawings/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setErrorMsg('Delete failed. Try again.');
      return;
    }
    router.refresh();
  };

  // Prevent the menu trigger from activating the parent <Link> on the tile.
  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div onClick={stop} onMouseDown={stop}>
      <Menu.Root>
        <Menu.Trigger
          render={
            <IconButton size="md" tone="muted" aria-label="More actions">
              <DotsIcon />
            </IconButton>
          }
        />
        <Menu.Popup>
          <Menu.Item icon={<RenameIcon />} onClick={() => setRenameOpen(true)}>
            Rename
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            tone="danger"
            icon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Menu.Item>
        </Menu.Popup>
      </Menu.Root>

      <PromptDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename drawing"
        label="Title"
        defaultValue={title}
        confirmLabel="Save"
        onConfirm={renameDrawing}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${title}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={deleteDrawing}
      />

      <ConfirmDialog
        open={errorMsg !== null}
        onOpenChange={(next) => !next && setErrorMsg(null)}
        title="Something went wrong"
        description={errorMsg ?? ''}
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setErrorMsg(null)}
      />
    </div>
  );
};
