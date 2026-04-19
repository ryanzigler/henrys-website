import { notFound } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import {
  requireOwnedDrawing,
  NotOwnerError,
  DrawingNotFoundError,
} from '@/lib/drawing/authorization';
import { Editor } from '@/components/draw/Editor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DrawEditorPage({ params }: PageProps) {
  const session = await getSessionFromCookie();
  if (!session) notFound(); // proxy.ts should have redirected; belt-and-suspenders

  const { id } = await params;
  const drawing = await (async () => {
    try {
      return await requireOwnedDrawing(id, session);
    } catch (error) {
      if (
        error instanceof DrawingNotFoundError
        || error instanceof NotOwnerError
      ) {
        notFound();
      }
      throw error;
    }
  })();
  return <Editor drawing={drawing} />;
}
