'use client';

import { cva, cx, type VariantProps } from '@/cva.config';
import { ComponentProps } from 'react';

const avatarVariants = cva({
  base: 'grid place-items-center rounded-full bg-linear-135 from-cheeto-dust to-salmon font-bold text-white',
  variants: {
    interactive: {
      true: 'cursor-pointer select-none transition-[transform,box-shadow] duration-150 hover:scale-106 hover:shadow-button-hover data-popup-open:scale-106 data-popup-open:shadow-button-hover',
      false: null,
    },
    size: {
      sm: 'h-8 w-8 text-xs',
      md: 'h-9 w-9 text-sm',
      lg: 'h-11 w-11 text-sm',
    },
  },
  defaultVariants: {
    interactive: false,
    size: 'md',
  },
});

interface AvatarProps
  extends VariantProps<typeof avatarVariants>, ComponentProps<'span'> {
  initials: string;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = ({
  className,
  initials,
  interactive,
  size,
  ...rest
}: AvatarProps) => (
  <span
    aria-hidden
    className={cx(avatarVariants({ interactive, size }), className)}
    {...rest}
  >
    {initials}
  </span>
);
