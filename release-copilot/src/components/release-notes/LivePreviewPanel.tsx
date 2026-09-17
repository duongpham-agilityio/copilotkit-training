import { useEffect, useRef, useState } from 'react';
import { Archive, Code2, Download, Eye, X } from 'lucide-react';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import CopyButton, { type CopyHandler } from '@/components/common/CopyButton.tsx';
import Tabs, { TabsVariant, type TabItem } from '@/components/common/Tabs.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';
import RawMarkdownView from './RawMarkdownView.tsx';

const ARCHIVE_FEEDBACK_DURATION_MS = 2000;

const enum ArchiveState {
  Idle = 'idle',
  Saving = 'saving',
  Saved = 'saved',
  Failed = 'failed',
}

const enum PreviewTab {
  Preview = 'preview',
  Markdown = 'markdown',
}

const TAB_ITEMS: TabItem[] = [
  { value: PreviewTab.Preview, label: 'Preview', icon: <Eye className="size-3.25" /> },
  { value: PreviewTab.Markdown, label: 'Markdown', icon: <Code2 className="size-3.25" /> },
];

interface LivePreviewPanelProps {
  markdown: string | null;
  onCopy: CopyHandler;
  onArchive: CopyHandler;
  onClose: () => void;
}

const LivePreviewPanel = ({
  markdown,
  onCopy,
  onArchive,
  onClose,
}: LivePreviewPanelProps) => {
  const [archiveState, setArchiveState] = useState<ArchiveState>(ArchiveState.Idle);
  const [activeTab, setActiveTab] = useState<PreviewTab>(PreviewTab.Preview);
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
    <section
      className="bg-surface-container-lowest flex min-h-0 flex-1 flex-col"
      aria-label="Release notes preview"
    >
      <div className="flex h-13 shrink-0 items-center justify-between pr-3 pl-5">
        <span className="text-body-md text-on-surface font-semibold">Release notes</span>
        <IconButton
          icon={<X className="size-4" />}
          aria-label="Close live preview"
          onClick={onClose}
        />
      </div>

      <div className="border-outline-subtle flex h-12 shrink-0 items-center justify-between border-b pr-3 pl-5">
        <Tabs
          items={TAB_ITEMS}
          value={activeTab}
          onChange={(value) => setActiveTab(value as PreviewTab)}
          variant={TabsVariant.Segmented}
        />
        <div className="flex items-center gap-1">
          <CopyButton isIconOnly onCopy={onCopy} disabled={!markdown} />
          <IconButton
            icon={<Download className="size-4" />}
            aria-label="Export release notes"
            disabled={!markdown}
          />
          <Button
            variant={archiveState === ArchiveState.Failed ? ButtonVariant.Danger : ButtonVariant.Primary}
            disabled={!markdown || archiveState === ArchiveState.Saving}
            onClick={() => void handleArchive()}
            className="text-body-sm ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 py-0 font-semibold shadow-sm"
          >
            <Archive className="size-3.5" />
            {archiveLabel}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === PreviewTab.Preview ? (
          <div className="px-8 py-7">
            <div className="text-on-surface-muted font-mono text-[11px]">
              RELEASE_NOTES.md
            </div>
            <MarkdownPreview markdown={markdown} className="mt-1.5" />
          </div>
        ) : (
          <RawMarkdownView markdown={markdown} />
        )}
      </div>
    </section>
  );
};

export default LivePreviewPanel;
