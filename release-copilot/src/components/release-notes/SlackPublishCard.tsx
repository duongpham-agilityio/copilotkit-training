import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton from '@/components/common/CopyButton.tsx';
import type { TabItem } from '@/components/common/Tabs.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';

export const enum SlackPublishStatus {
  Idle = 'idle',
  Sending = 'sending',
  Sent = 'sent',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

export interface PublishOption {
  platformId: string;
  label: string;
  content: string;
}

interface SlackPublishCardProps {
  options: PublishOption[];
  selectedPlatformId: string;
  preview: string;
  status: SlackPublishStatus;
  error?: string | null;
  onPlatformChange: (platformId: string) => void;
  onCopy: () => void;
  onSend: () => void;
  onCancel: () => void;
}

const SlackPublishCard = ({
  options,
  selectedPlatformId,
  preview,
  status,
  error = null,
  onPlatformChange,
  onCopy,
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
  const items: TabItem[] = options.map(({ platformId, label }) => ({
    value: platformId,
    label,
  }));

  return (
    <div className="border-outline-variant bg-surface-container-lowest flex flex-col gap-3 rounded-xl border p-4">
      {/* text-label-lg isn't in the theme's typography scale; text-body-lg is the
          closest defined size and matches how other cards style a prominent line
          (e.g. ReleaseHistoryListItem's title). */}
      <span className="text-body-lg text-on-surface">
        Announce this release in Slack?
      </span>

      <PlatformTabs
        items={items}
        value={selectedPlatformId}
        onChange={onPlatformChange}
        disabled={isSending}
      />

      <div className="flex justify-end">
        <CopyButton
          variant={ButtonVariant.Ghost}
          className="border-primary border"
          onCopy={onCopy}
          disabled={isSending}
        />
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
