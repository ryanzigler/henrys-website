'use client';

import { cx } from '@/cva.config';
import { Menu as BaseMenu } from '@base-ui/react';
import type { ComponentProps, ReactNode } from 'react';

const Separator = ({ className }: { className?: string }) => (
  <BaseMenu.Separator className={cx('mx-0.5 my-1 h-px bg-hair', className)} />
);

const Popup = ({
  align = 'end',
  children,
  className,
  sideOffset = 6,
}: {
  align?: 'start' | 'center' | 'end';
  children: ReactNode;
  className?: string;
  sideOffset?: number;
}) => (
  <BaseMenu.Portal>
    <BaseMenu.Positioner align={align} sideOffset={sideOffset}>
      <BaseMenu.Popup
        className={cx(
          'w-44 rounded-xl border border-hair bg-white p-1.5 text-ink shadow-menu',
          'data-starting-style:scale-95 data-starting-style:opacity-0',
          'data-ending-style:scale-95 data-ending-style:opacity-0',
          'origin-(--transform-origin) transition-[opacity,transform] duration-120',
          'focus:outline-none',
          className,
        )}
      >
        {children}
      </BaseMenu.Popup>
    </BaseMenu.Positioner>
  </BaseMenu.Portal>
);

interface ItemProps extends ComponentProps<typeof BaseMenu.Item> {
  icon?: ReactNode;
  tone?: 'default' | 'danger';
}

const Item = ({
  children,
  className,
  icon,
  tone = 'default',
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
      'px-2.5 pt-2 pb-1.5 text-xs font-bold tracking-[1.4px] text-muted uppercase',
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

export const Menu = {
  Header,
  Item,
  Label,
  Popup,
  Root: BaseMenu.Root,
  Separator,
  Trigger: BaseMenu.Trigger,
};
