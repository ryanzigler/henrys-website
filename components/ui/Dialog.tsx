'use client';

import { cx } from '@/cva.config';
import { Dialog as BaseDialog } from '@base-ui/react';
import type { ReactNode } from 'react';

const Backdrop = ({ className }: { className?: string }) => (
  <BaseDialog.Backdrop
    className={cx(
      'fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]',
      'data-ending-style:opacity-0 data-starting-style:opacity-0',
      'transition-opacity duration-150',
      className,
    )}
  />
);

const Content = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <BaseDialog.Portal>
    <Backdrop />
    <BaseDialog.Popup
      className={cx(
        'fixed top-1/2 left-1/2 z-50 -translate-1/2',
        'w-[min(440px,calc(100vw-32px))] rounded-2xl',
        'border border-hair bg-ivory p-7 text-ink shadow-paper-dialog',
        'data-starting-style:scale-95 data-starting-style:opacity-0',
        'data-ending-style:scale-95 data-ending-style:opacity-0',
        'transition-[opacity,transform] duration-150',
        'focus:outline-none',
        className,
      )}
    >
      {children}
    </BaseDialog.Popup>
  </BaseDialog.Portal>
);

const Title = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <BaseDialog.Title
    className={cx('m-0 font-display text-display-md text-ink', className)}
  >
    {children}
  </BaseDialog.Title>
);

const Description = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <BaseDialog.Description
    className={cx('mt-2 text-sm leading-relaxed text-muted', className)}
  >
    {children}
  </BaseDialog.Description>
);

const Footer = ({ children }: { children: ReactNode }) => (
  <div className="mt-7 flex items-center justify-end gap-2">{children}</div>
);

export const Dialog = {
  Close: BaseDialog.Close,
  Content,
  Description,
  Footer,
  Root: BaseDialog.Root,
  Title,
  Trigger: BaseDialog.Trigger,
};
