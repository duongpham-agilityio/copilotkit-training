import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import ThreadHeader from '@/components/chat/ThreadHeader.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import DashboardLayout from '@/layouts/DashboardLayout.tsx';
import { usePreviewPanel } from '@/hooks/use-preview-panel.ts';
import { useReleaseDraft } from '@/hooks/use-release-draft.tsx';
import { useSlackPublish } from '@/hooks/use-slack-publish.tsx';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { copyText } from '@/lib/clipboard.ts';
import { saveReleaseToHistory } from '@/lib/release-notes/save-release-to-history.ts';

// Single call site for the two CopilotKit tool registrations this page owns:
// useReleaseDraft (renderReleaseNotesPreview) and useSlackPublish
// (confirmSlackPublish). Anything that only READS the draft uses
// useReleaseDraftView() instead — usePreviewPanel does exactly that.
const DashboardPage = () => {
  const {
    isOpen: isPreviewOpen,
    open: openPreview,
    close: closePreview,
  } = usePreviewPanel();
  const { content } = useReleaseDraft({
    isPreviewOpen,
    onOpenPreview: openPreview,
  });
  useSlackPublish();
  const { threadId, threads } = useThreadSession();

  const currentThread = threads?.find((thread) => thread.id === threadId);
  const title = currentThread?.title || 'New thread';

  const handleCopy = async (): Promise<boolean> => {
    if (!content) return false;
    return copyText(content);
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <ThreadHeader
        title={title}
        isPreviewOpen={isPreviewOpen}
        onTogglePreview={() => (isPreviewOpen ? closePreview() : openPreview())}
      />
      <DashboardLayout
        chat={
          <ErrorBoundary title="Copilot panel unavailable">
            <CopilotAssistantPanel />
          </ErrorBoundary>
        }
        preview={
          isPreviewOpen && (
            <ErrorBoundary title="Preview unavailable">
              <LivePreviewPanel
                markdown={content}
                onCopy={handleCopy}
                onArchive={() => saveReleaseToHistory().then((result) => result.ok)}
                onClose={closePreview}
              />
            </ErrorBoundary>
          )
        }
      />
    </div>
  );
};

export default DashboardPage;
