import type { FakeBlob } from '@/lib/blob.fake';
import type { FakeKV } from '@/lib/kv.fake';

interface Session {
  userId: string;
}

interface DrawingHarness {
  fakeBlob: FakeBlob;
  fakeKv: FakeKV;
  reset: () => void;
  session: { current: Session | null };
}

export const makeDrawingHarness = async (
  defaultSession: Session | null = { userId: 'u_1' },
): Promise<DrawingHarness> => {
  const { FakeKV } = await import('@/lib/kv.fake');
  const { FakeBlob } = await import('@/lib/blob.fake');
  const fakeKv = new FakeKV();
  const fakeBlob = new FakeBlob();
  const session = { current: defaultSession };

  return {
    fakeBlob,
    fakeKv,
    reset: () => {
      fakeKv.reset();
      fakeBlob.reset();
      session.current = defaultSession;
    },
    session,
  };
};
