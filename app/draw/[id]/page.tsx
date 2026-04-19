import { Editor } from '@/components/draw/Editor';
import { getSessionFromCookie } from '@/lib/auth/sessions';
import {
  isDrawingNotFoundError,
  isNotOwnerError,
  requireOwnedDrawing,
} from '@/lib/drawing/authorization';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

const loadOwnedDrawing = async (id: string, session: { userId: string }) => {
  try {
    return await requireOwnedDrawing(id, session);
  } catch (error) {
    if (isDrawingNotFoundError(error) || isNotOwnerError(error)) {
      notFound();
    }
    throw error;
  }
};

const DrawEditorPage = async ({ params }: PageProps) => {
  const session = await getSessionFromCookie();
  // proxy.ts should have redirected; belt-and-suspenders
  if (!session) notFound();

  const { id } = await params;
  const drawing = await loadOwnedDrawing(id, session);

  return <Editor drawing={drawing} />;
};

export default DrawEditorPage;
