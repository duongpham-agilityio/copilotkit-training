import { useEffect, useRef, useState } from 'react';
import { Download, Send } from 'lucide-react';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton, { type CopyHandler } from '@/components/common/CopyButton.tsx';
import type { TabItem } from '@/components/common/Tabs.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';
import type { ReleaseSummary } from '@/types/release.ts';
import { KnownPlatformId } from '@/types/platform.ts';

const PLATFORM_ITEMS: TabItem[] = [
  { value: KnownPlatformId.AppStore, label: 'App Store' },
  { value: KnownPlatformId.GooglePlay, label: 'Google Play' },
  { value: KnownPlatformId.Github, label: 'GitHub' },
];

const SEND_FEEDBACK_DURATION_MS = 2000;

const enum SendState {
  Idle = 'idle',
  Sending = 'sending',
  Sent = 'sent',
  Failed = 'failed',
}

interface ReleaseDetailHeaderProps {
  release: ReleaseSummary;
  activePlatform: KnownPlatformId;
  onPlatformChange: (platform: KnownPlatformId) => void;
  onCopy: (platform: KnownPlatformId) => void;
  onSendToSlack: CopyHandler;
}

const ReleaseDetailHeader = ({
  release,
  activePlatform,
  onPlatformChange,
  onCopy,
  onSendToSlack,
}: ReleaseDetailHeaderProps) => {
  const [sendState, setSendState] = useState<SendState>(SendState.Idle);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimeoutRef.current), []);

  const handleSendToSlack = async () => {
    setSendState(SendState.Sending);
    const succeeded = (await onSendToSlack()) !== false;
    setSendState(succeeded ? SendState.Sent : SendState.Failed);
    clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(
      () => setSendState(SendState.Idle),
      SEND_FEEDBACK_DURATION_MS,
    );
  };

  const sendLabel = {
    [SendState.Idle]: 'Send to Slack',
    [SendState.Sending]: 'Sending…',
    [SendState.Sent]: 'Sent',
    [SendState.Failed]: 'Failed to send',
  }[sendState];

  return (
    <div className="bg-surface-container-lowest border-outline-variant flex flex-col gap-4 border-b px-6 py-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-headline-lg text-on-surface font-bold">
            {release.version}
          </span>
          <span className="text-body-md text-on-surface-variant">
            Generated on {release.date}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={ButtonVariant.Ghost}
            disabled={sendState === SendState.Sending}
            onClick={() => void handleSendToSlack()}
            className={
              sendState === SendState.Failed
                ? 'border-error text-error border'
                : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container border'
            }
          >
            <span className="inline-flex items-center gap-2">
              <Send className="size-4" />
              {sendLabel}
            </span>
          </Button>
          <Button
            variant={ButtonVariant.Ghost}
            className="bg-primary/10 hover:bg-primary/20"
          >
            <span className="inline-flex items-center gap-2">
              <Download className="size-4" />
              Export
            </span>
          </Button>
          <CopyButton
            variant={ButtonVariant.Primary}
            onCopy={() => onCopy(activePlatform)}
          />
        </div>
      </div>
      <PlatformTabs
        items={PLATFORM_ITEMS}
        value={activePlatform}
        onChange={(value) => onPlatformChange(value as KnownPlatformId)}
        className="rounded-md px-6"
        containerClassName="bg-surface-variant/50 rounded-md"
      />
    </div>
  );
};

export default ReleaseDetailHeader;
