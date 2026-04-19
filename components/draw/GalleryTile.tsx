import { GalleryActions } from '@/components/draw/GalleryActions';
import type { DrawingMeta } from '@/types/drawing';
import Link from 'next/link';

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

export const GalleryTile = ({ meta }: { meta: DrawingMeta }) => (
  <div className="flex w-48 flex-col rounded-3xl bg-white p-3 shadow-lg">
    <Link
      className="flex h-36 items-center justify-center rounded-xl bg-sky-50"
      href={`/draw/${meta.id}`}
    >
      {meta.blobPngUrl ?
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.blobPngUrl}
          alt={meta.title}
          className="h-full w-full rounded-xl object-cover"
        />
      : <span className="text-4xl">🎨</span>}
    </Link>
    <div className="mt-2 truncate font-semibold">{meta.title}</div>
    <div className="text-xs text-gray-500">{formatDate(meta.updatedAt)}</div>
    <GalleryActions id={meta.id} title={meta.title} />
  </div>
);
