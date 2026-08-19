import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import { cn } from '@/lib/cn.ts';
import { Platform } from '@/types/platform.ts';

export const enum SlackPublishStatus {
  Idle = 'idle',
  Sending = 'sending',
  Sent = 'sent',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

const PLATFORM_OPTIONS: ReadonlyArray<{ value: Platform; label: string }> = [
  { value: Platform.Github, label: 'GitHub' },
  { value: Platform.AppStore, label: 'App Store' },
  { value: Platform.GooglePlay, label: 'Google Play' },
];

interface SlackPublishCardProps {
  preview: string;
  platform: Platform;
  status: SlackPublishStatus;
  error?: string | null;
  onPlatformChange: (platform: Platform) => void;
  onSend: () => void;
  onCancel: () => void;
}

const SlackPublishCard = ({
  preview,
  platform,
  status,
  error = null,
  onPlatformChange,
  onSend,
  onCancel,
}: SlackPublishCardProps) => {
  if (status === SlackPublishStatus.Sent) {
    return (
      <div className="border-outline-variant text-body-md text-on-surface-variant rounded-xl border px-4 py-3">
        Posted to Slack.
      </div>
    );
  }

  if (status === SlackPublishStatus.Cancelled) {
    return (
      <div className="border-outline-variant text-body-md text-on-surface-variant rounded-xl border px-4 py-3">
        Not posted.
      </div>
    );
  }

  const isSending = status === SlackPublishStatus.Sending;

  return (
    <div className="border-outline-variant bg-surface-container-lowest flex flex-col gap-3 rounded-xl border p-4">
      {/* text-label-lg isn't in the theme's typography scale; text-body-lg is the
          closest defined size and matches how other cards style a prominent line
          (e.g. ReleaseHistoryListItem's title). */}
      <span className="text-body-lg text-on-surface">
        Announce this release in Slack?
      </span>

      <div className="flex flex-wrap gap-2">
        {PLATFORM_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={isSending}
            onClick={() => onPlatformChange(value)}
            className={cn(
              'text-label-sm cursor-pointer rounded-lg border px-3 py-1.5 transition-colors disabled:pointer-events-none disabled:opacity-50',
              value === platform
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant text-on-surface-variant hover:bg-primary/5',
            )}
            aria-pressed={value === platform}
          >
            {label}
          </button>
        ))}
      </div>

      {/* text-body-sm isn't in the theme's typography scale; text-body-md is the
          smallest defined body size and is already the default body text elsewhere
          in this codebase. */}
      <pre className="bg-surface-container text-body-md text-on-surface max-h-48 overflow-auto rounded-lg p-3 whitespace-pre-wrap">
        {preview}
      </pre>

      {error && (
        <span className="text-body-md text-error" role="alert">
          {error}
        </span>
      )}

      <div className="flex gap-2">
        <Button onClick={onSend} disabled={isSending}>
          {isSending ? 'Sending…' : 'Send to Slack'}
        </Button>
        <Button
          variant={ButtonVariant.Ghost}
          onClick={onCancel}
          disabled={isSending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default SlackPublishCard;
