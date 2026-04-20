'use client';

import { cx } from '@/cva.config';
import { Switch as BaseSwitch } from '@base-ui/react';
import type { ComponentProps } from 'react';

export const Switch = ({
  className,
  ...rest
}: ComponentProps<typeof BaseSwitch.Root>) => (
  <BaseSwitch.Root
    className={cx(
      'relative inline-block h-5 w-8.5 shrink-0 rounded-full bg-hair transition-colors duration-150',
      'hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
      'data-checked:bg-ink',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...rest}
  >
    <BaseSwitch.Thumb
      className={cx(
        'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
        'transition-[translate] duration-150',
        'data-checked:translate-x-3.5',
      )}
    />
  </BaseSwitch.Root>
);
