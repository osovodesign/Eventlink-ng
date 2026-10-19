import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

/**
 * Dialog (Design_System.md Section 8.11 & Component_Specifications.md Section 4.17)
 * Moves focus into modal on open, closes on Escape, and restores focus to trigger on close.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const timer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B4A]/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
        tabIndex={-1}
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-[20px] border border-[#D7DEE8] bg-white p-6 shadow-lg outline-none`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E9EDF3]">
          <div className="space-y-1">
            <h2
              id="dialog-title"
              className="text-xl font-bold text-[#142B4A]"
            >
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-sm text-[#344054]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[#697586] hover:bg-[#F4F6F9] hover:text-[#172B4D] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="py-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#E9EDF3]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

/**
 * ConfirmDialog (Component_Specifications.md Section 4.17)
 * Requires specific action copy (e.g. "Archive this listing?") and explains consequences.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#344054]">
        Please confirm that you want to proceed with this action.
      </p>
    </Dialog>
  );
}

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Drawer (Design_System.md Section 8.11 & Component_Specifications.md Section 4.17)
 * Mobile-friendly side/bottom sheet for filter panels and mobile navigation.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#142B4A]/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-sm h-full bg-white border-l border-[#D7DEE8] flex flex-col justify-between p-5 overflow-y-auto shadow-lg outline-none"
      >
        <div>
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E9EDF3]">
            <h2 className="text-lg font-bold text-[#142B4A]">{title}</h2>
            <button
              type="button"
              aria-label="Close panel"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[#697586] hover:bg-[#F4F6F9] hover:text-[#172B4D] cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="py-4">{children}</div>
        </div>

        {footer && (
          <div className="pt-4 border-t border-[#E9EDF3]">{footer}</div>
        )}
      </div>
    </div>
  );
}
