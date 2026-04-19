import { GalleryTile } from '@/components/draw/GalleryTile';
import { NewDrawingButton } from '@/components/draw/NewDrawingButton';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import { listDrawings } from '@/lib/drawing/storage';
import { redirect } from 'next/navigation';

const DrawGalleryPage = async () => {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect('/login');
  }

  const drawings = await listDrawings(session.userId);

  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center p-6">
      <h1 className="text-3xl font-bold">My Drawings</h1>
      <div className="mt-8 flex flex-wrap justify-center gap-6">
        <NewDrawingButton />
        {drawings.map((meta) => (
          <GalleryTile key={meta.id} meta={meta} />
        ))}
      </div>
      {drawings.length === 0 && (
        <p className="mt-8 text-center text-lg text-gray-600">
          Tap <strong>New Drawing</strong> to start your first one.
        </p>
      )}
    </main>
  );
};

export default DrawGalleryPage;
