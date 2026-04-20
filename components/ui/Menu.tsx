'use client';

import { cx } from '@/cva.config';
import { Menu as BaseMenu } from '@base-ui/react';
import type { ComponentProps, ReactNode } from 'react';

const Root = BaseMenu.Root;
const Trigger = BaseMenu.Trigger;
const Separator = ({ className }: { className?: string }) => (
  <BaseMenu.Separator className={cx('mx-0.5 my-1 h-px bg-hair', className)} />
);

const Popup = ({
  children,
  className,
  align = 'end',
  sideOffset = 6,
  width = 'w-44',
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  width?: string;
}) => (
  <BaseMenu.Portal>
    <BaseMenu.Positioner align={align} sideOffset={sideOffset}>
      <BaseMenu.Popup
        className={cx(
          'rounded-xl border border-hair bg-white p-1.5 text-ink shadow-menu',
          'data-starting-style:scale-95 data-starting-style:opacity-0',
          'data-ending-style:scale-95 data-ending-style:opacity-0',
          'origin-(--transform-origin) transition-[opacity,transform] duration-120',
          'focus:outline-none',
          width,
          className,
        )}
      >
        {children}
      </BaseMenu.Popup>
    </BaseMenu.Positioner>
  </BaseMenu.Portal>
);

interface ItemProps extends ComponentProps<typeof BaseMenu.Item> {
  tone?: 'default' | 'danger';
  icon?: ReactNode;
}

const Item = ({
  tone = 'default',
  icon,
  className,
  children,
  ...rest
}: ItemProps) => (
  <BaseMenu.Item
    className={cx(
      'flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none bg-transparent px-2.5 py-2',
      'text-left font-sans text-sm transition-colors duration-150',
      'focus:outline-none',
      tone === 'default'
        && 'text-ink hover:bg-background-draw data-highlighted:bg-background-draw',
      tone === 'danger'
        && 'text-danger hover:bg-danger-soft data-highlighted:bg-danger-soft',
      className,
    )}
    {...rest}
  >
    {icon && <span className="grid size-3.5 place-items-center">{icon}</span>}
    {children}
  </BaseMenu.Item>
);

const Header = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cx(
      'px-2.5 pt-2 pb-1.5 text-[11px] font-bold tracking-[1.4px] text-muted uppercase',
      className,
    )}
  >
    {children}
  </div>
);

const Label = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cx('px-2.5 py-1.5 text-sm text-ink', className)}>
    {children}
  </div>
);

export const Menu = { Root, Trigger, Popup, Item, Separator, Header, Label };
