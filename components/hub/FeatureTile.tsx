import Link from 'next/link';

type Props = {
  title: string;
  emoji: string;
  href: string;
  disabled?: boolean;
  comingSoonLabel?: string;
};

export function FeatureTile({
  title,
  emoji,
  href,
  disabled,
  comingSoonLabel,
}: Props) {
  const base =
    'flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-3xl bg-white shadow-lg transition';
  if (disabled) {
    return (
      <div className={`${base} opacity-60`} aria-disabled="true">
        <span className="text-6xl">{emoji}</span>
        <span className="text-lg font-semibold">{title}</span>
        {comingSoonLabel && <span className="text-xs">{comingSoonLabel}</span>}
      </div>
    );
  }
  return (
    <Link href={href} className={`${base} active:scale-95`}>
      <span className="text-6xl">{emoji}</span>
      <span className="text-lg font-semibold">{title}</span>
    </Link>
  );
}
