import CommitListPanel from '@/components/commit-list/CommitListPanel.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { useCommitEntries } from '@/hooks/use-commit-entries.tsx';
import { useReleaseDraft } from '@/hooks/use-release-draft.tsx';
import { useSlackPublish } from '@/hooks/use-slack-publish.tsx';

const DashboardPage = () => {
  const { commits, selectedIds, toggleSelection } = useCommitEntries();
  const { activeContent } = useReleaseDraft();
  useSlackPublish();

  const selectedHashes = new Set(selectedIds);

  const handleCopy = () => {
    if (!activeContent) return;
    void navigator.clipboard.writeText(activeContent);
  };

  return (
    <SplitPane
      leftWidthPercent={65}
      left={
        <div className="flex flex-col gap-6">
          <CommitListPanel
            commits={commits}
            selectedHashes={selectedHashes}
            onToggle={toggleSelection}
          />
          <LivePreviewPanel markdown={activeContent} onCopy={handleCopy} />
        </div>
      }
      right={<CopilotAssistantPanel />}
    />
  );
};

export default DashboardPage;
