import { FeatureTile } from '@/components/hub/FeatureTile';
import { getSessionFromCookie } from '@/lib/auth/sessions';

/**
 * Hub page.
 *
 * FIX 5A: reskinned to read as the Paper Studio product shelf rather than
 * "two tiles on a sky-blue body". The hub now:
 *   - sits on --color-canvas (matches the gallery background),
 *   - has a display-lg greeting using the session's display name,
 *   - uses a responsive grid (1 → 2 → 3 columns),
 *   - shows the reskinned FeatureTile cards for Draw + placeholders.
 *
 * FIX 5B (conservative): added one disabled "Coming soon" tile so the hub
 * visibly implies there's more than /draw. Delete if you don't want that.
 *
 * NOTE: relies on layout.tsx's bg change from bg-sky-50 → bg-canvas.
 */
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
