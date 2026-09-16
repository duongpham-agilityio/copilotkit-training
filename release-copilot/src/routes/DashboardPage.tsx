import CommitListPanel from '@/components/commit-list/CommitListPanel.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { useCommitEntries } from '@/hooks/use-commit-entries.tsx';
import { useReleaseDraft } from '@/hooks/use-release-draft.tsx';
import { useSlackPublish } from '@/hooks/use-slack-publish.tsx';
import { copyText } from '@/lib/clipboard.ts';
import { saveReleaseToHistory } from '@/lib/release-notes/save-release-to-history.ts';

const DashboardPage = () => {
  const { commits, selectedIds, toggleSelection } = useCommitEntries();
  const { content } = useReleaseDraft();
  useSlackPublish();

  const selectedHashes = new Set(selectedIds);

  const handleCopy = async (): Promise<boolean> => {
    if (!content) return false;
    return copyText(content);
  };

  return (
    <SplitPane
      leftWidthPercent={65}
      left={
        <div className="flex flex-col gap-6">
          <ErrorBoundary title="Commit list unavailable">
            <CommitListPanel
              commits={commits}
              selectedHashes={selectedHashes}
              onToggle={toggleSelection}
            />
          </ErrorBoundary>
          <ErrorBoundary title="Preview unavailable">
            <LivePreviewPanel
              markdown={content}
              onCopy={handleCopy}
              onArchive={() => saveReleaseToHistory().then((result) => result.ok)}
            />
          </ErrorBoundary>
        </div>
      }
      right={
        <ErrorBoundary title="Copilot panel unavailable">
          <CopilotAssistantPanel />
        </ErrorBoundary>
      }
    />
  );
};

export default DashboardPage;
