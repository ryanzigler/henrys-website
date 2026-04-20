'use client';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@base-ui/react';
import { useEffect, useRef, useState } from 'react';

interface PromptDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  defaultValue?: string;
  label?: string;
  onConfirm: (value: string) => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placeholder?: string;
  title: string;
}

export const PromptDialog = ({
  cancelLabel = 'Cancel',
  confirmLabel = 'Save',
  defaultValue = '',
  label,
  onConfirm,
  onOpenChange,
  open,
  placeholder,
  title,
}: PromptDialogProps) => {
  const [value, setValue] = useState(defaultValue);
  const [pending, setPending] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setValue(defaultValue);
  }

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
    return () => clearTimeout(timer);
  }, [open]);

  const handleConfirm = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setPending(true);
    try {
      await onConfirm(trimmed);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Title>{title}</Dialog.Title>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleConfirm();
          }}
        >
          {label && (
            <label className="mb-2 block text-xs font-bold tracking-[1.4px] text-muted uppercase">
              {label}
            </label>
          )}
          <Input
            className="h-10 w-full rounded-lg border border-hair bg-white px-3 text-sm text-ink outline-none focus:border-ink"
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            ref={inputRef}
            value={value}
          />
          <Dialog.Footer>
            <Dialog.Close
              render={
                <Button type="button" variant="ghost">
                  {cancelLabel}
                </Button>
              }
            />
            <Button
              type="submit"
              variant="primary"
              disabled={pending || !value.trim()}
            >
              {pending ? 'Saving…' : confirmLabel}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
