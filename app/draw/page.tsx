import { UserMenu } from '@/components/auth/UserMenu';
import { GalleryTile } from '@/components/draw/GalleryTile';
import {
  NewDrawingButton,
  NewDrawingCard,
} from '@/components/draw/NewDrawingButton';
import { initialsOf } from '@/lib/auth/identity';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import { listDrawings } from '@/lib/drawing/storage';
import { redirect } from 'next/navigation';

const formatLastEdited = (updatedAt: number) => {
  const days = Math.floor(
    Math.max(0, Date.now() - updatedAt) / (1000 * 60 * 60 * 24),
  );

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'a week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'a month ago';
  return `${Math.floor(days / 30)} months ago`;
};

const DrawGalleryPage = async () => {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect('/login');
  }

  const drawings = await listDrawings(session.userId);
  const count = drawings.length;
  const lastEdited =
    drawings[0] ?
      ` · last edited ${formatLastEdited(drawings[0].updatedAt)}`
    : '';

  return (
    <main className="fixed inset-0 z-40 flex flex-col overflow-auto bg-ivory font-sans text-ink">
      <div className="flex h-16 shrink-0 items-center justify-end gap-5 border-b border-hair bg-ivory px-7">
        <UserMenu
          displayName={session.displayName}
          initials={initialsOf(session.displayName)}
          emoji={session.emoji}
        />
      </div>

      <section className="flex-1 bg-canvas px-12 pt-10 pb-16">
        <div className="mx-auto max-w-300">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0 flex-auto">
              <h1 className="m-0 font-display text-display-lg whitespace-nowrap">
                {session.displayName}&rsquo;s drawings
              </h1>
              <div className="mt-2 text-sm text-muted">
                {count} {count === 1 ? 'piece' : 'pieces'}
                {lastEdited}
              </div>
            </div>
            <div className="flex shrink-0 gap-2.5">
              <NewDrawingButton />
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
            <NewDrawingCard />
            {drawings.map((meta) => (
              <GalleryTile key={meta.id} meta={meta} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default DrawGalleryPage;
