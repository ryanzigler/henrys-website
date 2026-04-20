'use client';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) => {
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Title>{title}</Dialog.Title>
        {description && <Dialog.Description>{description}</Dialog.Description>}
        <Dialog.Footer>
          <Dialog.Close
            render={<Button variant="ghost">{cancelLabel}</Button>}
          />
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};

/**
 * useConfirm — gives you an imperative `confirm()` that returns a Promise<boolean>.
 * Drop <confirmDialog /> somewhere in the tree and call confirm() from anywhere.
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   if (await confirm({ title: 'Delete?', destructive: true })) { ... }
 *   return <>...{confirmDialog}</>;
 */
export const useConfirm = () => {
  const [state, setState] = useState<null | Omit<
    ConfirmDialogProps,
    'open' | 'onOpenChange' | 'onConfirm'
  >>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback(
    (opts: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm'>) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setState(opts);
      }),
    [],
  );

  const onOpenChange = (next: boolean) => {
    if (!next) {
      resolveRef.current?.(false);
      resolveRef.current = null;
      setState(null);
    }
  };

  const confirmDialog =
    state ?
      <ConfirmDialog
        {...state}
        open
        onOpenChange={onOpenChange}
        onConfirm={() => {
          resolveRef.current?.(true);
          resolveRef.current = null;
        }}
      />
    : null;

  return { confirm, confirmDialog };
};
