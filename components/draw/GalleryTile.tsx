import { GalleryActions } from '@/components/draw/GalleryActions';
import { formatEdited } from '@/lib/utils';
import type { DrawingMeta } from '@/types/drawing';
import Link from 'next/link';

export const GalleryTile = ({ meta }: { meta: DrawingMeta }) => (
  <div className="relative">
    <Link className="block no-underline" href={`/draw/${meta.id}`}>
      <div className="rounded-xl border border-hair bg-white transition duration-200 hover:-translate-y-0.75 hover:shadow-gallery disabled:pointer-events-none disabled:opacity-50">
        <div className="relative aspect-3/2 overflow-hidden rounded-t-xl bg-paper">
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
            <div className="tracking-tightest overflow-hidden font-display text-lg font-medium overflow-ellipsis whitespace-nowrap text-ink">
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
