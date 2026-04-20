'use client';

import { cx } from '@/cva.config';

interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const SIZE: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-11 w-11 text-sm',
};

export const Avatar = ({
  initials,
  size = 'md',
  interactive = false,
}: AvatarProps) => (
  <span
    aria-hidden
    className={cx(
      'grid place-items-center rounded-full bg-linear-135 from-cheeto-dust to-salmon font-bold text-white',
      SIZE[size],
      interactive && [
        'cursor-pointer select-none',
        'transition-[transform,box-shadow] duration-150',
        'hover:scale-106 hover:shadow-button-hover',
        'data-popup-open:scale-106 data-popup-open:shadow-button-hover',
      ],
    )}
  >
    {initials}
  </span>
);
