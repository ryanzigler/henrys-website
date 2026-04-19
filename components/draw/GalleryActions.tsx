'use client';

import { Button } from '@base-ui/react';
import { useRouter } from 'next/navigation';

interface Props {
  id: string;
  title: string;
}

export const GalleryActions = ({ id, title }: Props) => {
  const router = useRouter();

  const renameDrawing = async () => {
    const nextTitle = prompt('New title:', title);
    if (nextTitle === null || nextTitle.trim() === '' || nextTitle === title)
      return;
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

  const onDelete = async () => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const response = await fetch(`/api/drawings/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      alert('delete failed');
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-2 flex gap-2 text-xs">
      <Button onClick={renameDrawing} className="underline">
        Rename
      </Button>
      <Button onClick={onDelete} className="text-red-600 underline">
        Delete
      </Button>
    </div>
  );
};
