import { cx } from '@/cva.config';
import Link from 'next/link';

interface FeatureTileProps {
  comingSoonLabel?: string;
  disabled?: boolean;
  emoji: string;
  href: string;
  title: string;
}

export const FeatureTile = ({
  comingSoonLabel,
  disabled,
  emoji,
  href,
  title,
}: FeatureTileProps) => (
  <Link
    aria-disabled={disabled}
    href={disabled ? '#' : href}
    className={cx(
      'flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-3xl bg-white shadow-lg transition',
      {
        'active:scale-95': !disabled,
        'opacity-60': disabled,
      },
    )}
  >
    <span className="text-6xl">{emoji}</span>
    <span className="text-lg font-semibold">{title}</span>
    {disabled && comingSoonLabel && (
      <span className="text-xs">{comingSoonLabel}</span>
    )}
  </Link>
);
