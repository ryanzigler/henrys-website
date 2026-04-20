'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { Menu } from '@/components/ui/Menu';
import { PromptDialog } from '@/components/ui/PromptDialog';
import { Ellipsis, SquarePen, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface GalleryActionsProps {
  id: string;
  title: string;
}

export const GalleryActions = ({ id, title }: GalleryActionsProps) => {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const renameDrawing = async (nextTitle: string) => {
    if (nextTitle === title) {
      return;
    }

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
              <Ellipsis size={14} />
            </IconButton>
          }
        />
        <Menu.Popup>
          <Menu.Item
            icon={<SquarePen size={14} />}
            onClick={() => setRenameOpen(true)}
          >
            Rename
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            tone="danger"
            icon={<Trash2 size={14} />}
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
