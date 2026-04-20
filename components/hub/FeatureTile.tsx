import { VariantProps, cva, cx } from '@/cva.config';
import Link from 'next/link';
import { ComponentProps } from 'react';

const featureTileVariants = cva({
  base: 'relative aspect-3/2 overflow-hidden rounded-xl border border-hair p-5 shadow-[0_2px_6px_rgba(60,40,20,0.04)] transition-[transform,box-shadow] duration-200 bg-radial from-grid-light from-[1.2px] to-transparent to-[1.4px] bg-size-[18px_18px]',
  variants: {
    disabled: {
      true: 'cursor-not-allowed opacity-75',
      false:
        'hover:-translate-y-1 hover:shadow-gallery active:translate-y-0 active:shadow-[0_2px_6px_rgba(60,40,20,0.04)]',
    },
    tone: {
      paper: 'bg-paper',
      blush: 'bg-paper-blush',
      mint: 'bg-paper-mint',
      sky: 'bg-paper-sky',
    },
  },
  defaultVariants: {
    disabled: false,
    tone: 'paper',
  },
});

interface FeatureTileProps
  extends VariantProps<typeof featureTileVariants>, ComponentProps<'div'> {
  comingSoonLabel?: string;
  emoji: string;
  href: string;
  kicker?: string;
  title: string;
}

export const FeatureTile = ({
  comingSoonLabel,
  className,
  disabled,
  emoji,
  href,
  kicker,
  title,
  tone,
}: FeatureTileProps) => {
  const card = (
    <div
      aria-disabled={disabled || undefined}
      className={cx(featureTileVariants({ disabled, tone }), className)}
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
        <span className="absolute top-4 right-4 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold tracking-[0.8px] text-muted uppercase">
          {comingSoonLabel}
        </span>
      )}
    </div>
  );

  if (disabled) return card;

  return (
    <Link
      href={href}
      className="block rounded-xl no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      {card}
    </Link>
  );
};
