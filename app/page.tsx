import { FeatureTile } from '@/components/hub/FeatureTile';

export default function HubPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center p-8">
      <h1 className="text-4xl font-bold">Henry&apos;s Website</h1>
      <div className="mt-12 flex flex-wrap justify-center gap-6">
        <FeatureTile
          title="Draw"
          emoji="🎨"
          href="/draw"
          disabled
          comingSoonLabel="coming soon"
        />
      </div>
    </main>
  );
}
