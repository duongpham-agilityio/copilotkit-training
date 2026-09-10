import { useEffect, useRef, useState } from 'react';
import { Archive } from 'lucide-react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton, { type CopyHandler } from '@/components/common/CopyButton.tsx';
import MonoTag from '@/components/common/MonoTag.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';

const ARCHIVE_FEEDBACK_DURATION_MS = 2000;

const enum ArchiveState {
  Idle = 'idle',
  Saving = 'saving',
  Saved = 'saved',
  Failed = 'failed',
}

interface LivePreviewPanelProps {
  markdown: string | null;
  onCopy: CopyHandler;
  onArchive: CopyHandler;
}

const LivePreviewPanel = ({
  markdown,
  onCopy,
  onArchive,
}: LivePreviewPanelProps) => {
  const [archiveState, setArchiveState] = useState<ArchiveState>(
    ArchiveState.Idle,
  );
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimeoutRef.current), []);

  const handleArchive = async () => {
    setArchiveState(ArchiveState.Saving);
    const succeeded = (await onArchive()) !== false;
    setArchiveState(succeeded ? ArchiveState.Saved : ArchiveState.Failed);
    clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(
      () => setArchiveState(ArchiveState.Idle),
      ARCHIVE_FEEDBACK_DURATION_MS,
    );
  };

  const archiveLabel = {
    [ArchiveState.Idle]: 'Archive',
    [ArchiveState.Saving]: 'Saving…',
    [ArchiveState.Saved]: 'Saved',
    [ArchiveState.Failed]: 'Save failed',
  }[archiveState];

  return (
    <Card emphasis={CardEmphasis.Outlined}>
      <Card.Header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-headline-md text-on-surface font-semibold">
              Live Preview
            </span>
            <MonoTag>RELEASE_NOTES.md</MonoTag>
          </div>
          <div className="flex gap-2">
            <Button
              variant={ButtonVariant.Ghost}
              disabled={!markdown || archiveState === ArchiveState.Saving}
              onClick={() => void handleArchive()}
              className={
                archiveState === ArchiveState.Failed
                  ? 'border-error text-error border'
                  : 'border-outline-variant border'
              }
            >
              <span className="inline-flex items-center gap-2">
                <Archive className="size-4" />
                {archiveLabel}
              </span>
            </Button>
            <CopyButton
              variant={ButtonVariant.Ghost}
              className="border-primary border"
              onCopy={onCopy}
              disabled={!markdown}
            />
          </div>
        </div>
      </Card.Header>
      <MarkdownPreview markdown={markdown} />
    </Card>
  );
};

export default LivePreviewPanel;
