import Link from 'next/link';

interface Props {
  title: string;
  emoji: string;
  href: string;
  disabled?: boolean;
  comingSoonLabel?: string;
}

const BASE =
  'flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-3xl bg-white shadow-lg transition';

export const FeatureTile = ({
  title,
  emoji,
  href,
  disabled,
  comingSoonLabel,
}: Props) => {
  const body = (
    <>
      <span className="text-6xl">{emoji}</span>
      <span className="text-lg font-semibold">{title}</span>
      {disabled && comingSoonLabel && (
        <span className="text-xs">{comingSoonLabel}</span>
      )}
    </>
  );

  if (disabled) {
    return (
      <div className={`${BASE} opacity-60`} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className={`${BASE} active:scale-95`}>
      {body}
    </Link>
  );
};
