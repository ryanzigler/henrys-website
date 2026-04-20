'use client';

import { cva, cx, type VariantProps } from '@/cva.config';
import { Button as BaseButton } from '@base-ui/react';
import type { ComponentProps } from 'react';

const iconButton = cva({
  base: [
    'grid place-items-center rounded-lg border-none bg-transparent text-ink',
    'transition-[background,color,border-color] duration-150 cursor-pointer',
    'disabled:opacity-40 disabled:pointer-events-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  ],
  variants: {
    size: {
      sm: 'size-6 text-sm',
      md: 'size-8 [&_svg]:size-4',
      lg: 'h-9 w-9 [&_svg]:size-4',
    },
    tone: {
      default: 'hover:bg-ivory',
      onCanvas: 'bg-ivory hover:bg-hair',
      muted: 'text-muted hover:bg-ivory hover:text-ink',
    },
  },
  defaultVariants: { size: 'md', tone: 'default' },
});

interface IconButtonProps
  extends ComponentProps<typeof BaseButton>, VariantProps<typeof iconButton> {}

export const IconButton = ({
  className,
  size,
  tone,
  ...rest
}: IconButtonProps) => (
  <BaseButton className={cx(iconButton({ size, tone }), className)} {...rest} />
);
