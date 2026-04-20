import { cx } from '@/cva.config';
import Link from 'next/link';

/**
 * FeatureTile — a card on the Paper Studio hub.
 *
 * FIX 5A: reskinned in place (not replaced). The old tile was a 192px
 * square with an emoji + title. The new tile is:
 *   - a 3:2 "paper card" matching the gallery tile language,
 *   - ivory background with a subtle paper-grid pattern,
 *   - a cleanly-placed emoji glyph in the top-left,
 *   - title in font-display, short kicker in muted sans below,
 *   - an optional "Coming soon" pill bottom-right for disabled tiles.
 *
 * The hub now looks related to /draw and reads as a product shelf rather
 * than "two buttons on sky-blue".
 */

interface FeatureTileProps {
  comingSoonLabel?: string;
  disabled?: boolean;
  emoji: string;
  href: string;
  kicker?: string;
  title: string;
  tone?: 'paper' | 'blush' | 'mint' | 'sky';
}

const TONE: Record<NonNullable<FeatureTileProps['tone']>, string> = {
  paper: 'bg-paper',
  blush: 'bg-paper-blush',
  mint: 'bg-paper-mint',
  sky: 'bg-paper-sky',
};

export const FeatureTile = ({
  comingSoonLabel,
  disabled,
  emoji,
  href,
  kicker,
  title,
  tone = 'paper',
}: FeatureTileProps) => {
  const card = (
    <div
      aria-disabled={disabled || undefined}
      className={cx(
        'relative aspect-3/2 overflow-hidden rounded-[14px] border border-hair',
        'p-5 shadow-[0_2px_6px_rgba(60,40,20,0.04)]',
        'transition-[transform,box-shadow] duration-200',
        'bg-radial from-grid-light from-[1.2px] to-transparent to-[1.4px] bg-size-[18px_18px]',
        TONE[tone],
        !disabled && [
          'hover:-translate-y-1 hover:shadow-gallery',
          'active:translate-y-0 active:shadow-[0_2px_6px_rgba(60,40,20,0.04)]',
        ],
        disabled && 'cursor-not-allowed opacity-75',
      )}
    >
      <span
        aria-hidden
        className="absolute top-4 left-4 grid size-11 place-items-center rounded-full border border-hair bg-white/80 text-2xl shadow-paper-pill"
      >
        {emoji}
      </span>

      <div className="absolute right-5 bottom-5 left-5">
        <div className="font-display text-display-md text-ink">{title}</div>
        {kicker && <div className="mt-1 text-sm text-muted">{kicker}</div>}
      </div>

      {disabled && comingSoonLabel && (
        <span className="absolute top-4 right-4 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold tracking-[0.8px] text-muted uppercase">
          {comingSoonLabel}
        </span>
      )}
    </div>
  );

  if (disabled) return card;

  return (
    <Link
      href={href}
      className="block rounded-[14px] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      {card}
    </Link>
  );
};
