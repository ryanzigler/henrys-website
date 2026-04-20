import { GalleryActions } from '@/components/draw/GalleryActions';
import type { DrawingMeta } from '@/types/drawing';
import Link from 'next/link';

const formatEdited = (updatedAt: number) => {
  const days = Math.floor(
    Math.max(0, Date.now() - updatedAt) / (1000 * 60 * 60 * 24),
  );

  if (days === 0) return 'Edited today';
  if (days === 1) return 'Edited yesterday';
  if (days < 7) return `Edited ${days} days ago`;
  if (days < 14) return 'Edited a week ago';
  if (days < 30) return `Edited ${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'Edited a month ago';
  return `Edited ${Math.floor(days / 30)} months ago`;
};

export const GalleryTile = ({ meta }: { meta: DrawingMeta }) => (
  <div className="relative">
    <Link className="block no-underline" href={`/draw/${meta.id}`}>
      <div className="ps-card rounded-[14px] border border-hair bg-white shadow-[0_2px_6px_rgba(60,40,20,0.04)]">
        <div className="relative aspect-3/2 overflow-hidden rounded-t-[13px] bg-paper">
          <div className="ps-card-thumb h-full w-full">
            {meta.blobPngUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                src={`/api/drawings/${meta.id}/thumbnail`}
              />
            : <div className="flex h-full w-full items-center justify-center text-4xl opacity-60">
                ✏️
              </div>
            }
          </div>
        </div>
        <div className="flex items-center justify-between gap-2.5 px-4 py-3.5">
          <div className="min-w-0">
            <div className="overflow-hidden font-display text-[18px] font-medium tracking-[-0.2px] overflow-ellipsis whitespace-nowrap text-ink">
              {meta.title}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {formatEdited(meta.updatedAt)}
            </div>
          </div>
          <GalleryActions id={meta.id} title={meta.title} />
        </div>
      </div>
    </Link>
  </div>
);
