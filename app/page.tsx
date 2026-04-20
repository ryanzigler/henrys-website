import { FeatureTile } from '@/components/hub/FeatureTile';
import { getSessionFromCookie } from '@/lib/auth/sessions';

const HubPage = async () => {
  const session = await getSessionFromCookie();
  const name = session?.displayName ?? 'there';
  const firstName = name.split(/\s+/)[0];

  return (
    <main className="mx-auto max-w-300 px-8 pt-6 pb-16">
      <header className="mb-10">
        <h1 className="m-0 font-display text-display-lg text-ink">
          Hi, {firstName}.
        </h1>
        <p className="mt-2 text-sm text-muted">Pick something to make.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureTile
          emoji="🎨"
          title="Draw"
          kicker="Paper Studio — sketch and save."
          href="/draw"
          tone="paper"
        />
        <FeatureTile
          emoji="📝"
          title="Notes"
          kicker="Jot things down."
          href="/notes"
          tone="blush"
          disabled
          comingSoonLabel="Soon"
        />
        <FeatureTile
          emoji="🎧"
          title="Sounds"
          kicker="Record little clips."
          href="/sounds"
          tone="mint"
          disabled
          comingSoonLabel="Soon"
        />
      </div>
    </main>
  );
};

export default HubPage;
