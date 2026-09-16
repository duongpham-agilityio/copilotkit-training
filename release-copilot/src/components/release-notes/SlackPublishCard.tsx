import Button, { ButtonVariant } from '@/components/common/Button.tsx';

export const enum SlackPublishStatus {
  Idle = 'idle',
  Sending = 'sending',
  Sent = 'sent',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

interface SlackPublishCardProps {
  status: SlackPublishStatus;
  error?: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const SlackPublishCard = ({
  status,
  error = null,
  onSubmit,
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
        Do you want to publish to Slack?
      </span>

      {error && (
        <span className="text-body-md text-error" role="alert">
          {error}
        </span>
      )}

      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={isSending}>
          {isSending ? 'Sending…' : 'Submit'}
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
