import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ChatErrorBarProps {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

const ChatErrorBar = ({
  message,
  canRetry,
  onRetry,
  onDismiss,
}: ChatErrorBarProps) => (
  <div
    role="alert"
    className="border-error/30 bg-error/5 mx-4 mb-2 flex shrink-0 items-start gap-2 rounded-xl border px-3 py-2"
  >
    <AlertTriangle className="text-error mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span className="text-body-md text-on-surface min-w-0 flex-1 break-words">
      {message}
    </span>
    {canRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="text-label-sm text-primary flex shrink-0 cursor-pointer items-center gap-1"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Retry
      </button>
    )}
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss error"
      className="text-on-surface-variant shrink-0 cursor-pointer"
    >
      <X className="size-4" />
    </button>
  </div>
);

export default ChatErrorBar;
