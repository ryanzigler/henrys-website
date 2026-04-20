'use client';

import { cx } from '@/cva.config';
import { cva, type VariantProps } from 'cva';
import { Button as BaseButton } from '@base-ui/react';
import type { ComponentProps, ReactNode } from 'react';

const button = cva({
  base: [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-lg font-semibold font-sans',
    'transition-[background,transform,box-shadow,border-color,color] duration-150',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  ],
  variants: {
    variant: {
      primary: [
        'bg-ink text-white border-none cursor-pointer',
        'hover:bg-new-drawing hover:shadow-button-hover hover:-translate-y-px',
        'active:translate-y-0 active:shadow-button-active',
      ],
      ghost: [
        'bg-white text-ink border border-hair cursor-pointer',
        'hover:border-ink hover:bg-background-draw',
      ],
      danger: [
        'bg-white text-ink border border-hair cursor-pointer',
        'hover:bg-danger-soft hover:border-danger hover:text-danger',
      ],
      link: [
        'bg-transparent text-muted border-none cursor-pointer px-0',
        'hover:text-ink',
      ],
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-4.5 text-sm',
    },
  },
  compoundVariants: [
    { variant: 'link', size: 'sm', class: 'h-auto px-0 py-0' },
    { variant: 'link', size: 'md', class: 'h-auto px-0 py-0' },
    { variant: 'link', size: 'lg', class: 'h-auto px-0 py-0' },
  ],
  defaultVariants: { variant: 'ghost', size: 'md' },
});

export type ButtonProps = ComponentProps<typeof BaseButton>
  & VariantProps<typeof button> & { children?: ReactNode };

export const Button = ({ className, variant, size, ...rest }: ButtonProps) => (
  <BaseButton className={cx(button({ variant, size }), className)} {...rest} />
);
