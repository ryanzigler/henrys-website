import Link from 'next/link';

const NotFound = () => (
  <main className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8">
    <h1 className="text-2xl font-bold">This drawing isn&apos;t here.</h1>
    <p>It might have been deleted, or it belongs to someone else.</p>
    <Link className="rounded bg-black px-4 py-2 text-white" href="/draw">
      Back to gallery
    </Link>
  </main>
);

export default NotFound;
