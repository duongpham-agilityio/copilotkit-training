import { useEffect, type ReactNode } from 'react';
import Button, { ButtonVariant } from './Button.tsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  isOpen,
  icon,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-surface-container-lowest w-[420px] rounded-2xl p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-error-rose/10 text-error-rose flex size-10 items-center justify-center rounded-xl">
          {icon}
        </div>
        <h2
          id="confirm-dialog-title"
          className="text-headline-md text-on-surface mt-4 font-semibold"
        >
          {title}
        </h2>
        <p className="text-body-md text-on-surface-variant mt-1.5">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant={ButtonVariant.Secondary}
            onClick={onCancel}
            className="bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container border"
          >
            Cancel
          </Button>
          <Button variant={ButtonVariant.Danger} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
