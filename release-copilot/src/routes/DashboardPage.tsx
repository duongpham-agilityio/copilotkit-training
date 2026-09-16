import { useState } from 'react';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import ThreadSidebar from '@/components/chat/ThreadSidebar.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import DashboardLayout from '@/layouts/DashboardLayout.tsx';
import { usePreviewPanel } from '@/hooks/use-preview-panel.ts';
import { useReleaseDraft } from '@/hooks/use-release-draft.tsx';
import { useSlackPublish } from '@/hooks/use-slack-publish.tsx';
import { copyText } from '@/lib/clipboard.ts';
import { saveReleaseToHistory } from '@/lib/release-notes/save-release-to-history.ts';

// Single call site for the two CopilotKit tool registrations this page owns:
// useReleaseDraft (renderReleaseNotesPreview) and useSlackPublish
// (confirmSlackPublish). Anything that only READS the draft uses
// useReleaseDraftView() instead — usePreviewPanel does exactly that.
const DashboardPage = () => {
  const { content } = useReleaseDraft();
  useSlackPublish();
  const {
    isOpen: isPreviewOpen,
    open: openPreview,
    close: closePreview,
  } = usePreviewPanel();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleCopy = async (): Promise<boolean> => {
    if (!content) return false;
    return copyText(content);
  };

  return (
    <DashboardLayout
      sidebar={
        isSidebarOpen && (
          <ErrorBoundary title="Threads unavailable">
            <ThreadSidebar onCollapse={() => setIsSidebarOpen(false)} />
          </ErrorBoundary>
        )
      }
      chat={
        <ErrorBoundary title="Copilot panel unavailable">
          <CopilotAssistantPanel
            leading={
              !isSidebarOpen && (
                <IconButton
                  icon={<PanelLeftOpen className="size-5" />}
                  aria-label="Open thread sidebar"
                  onClick={() => setIsSidebarOpen(true)}
                />
              )
            }
            trailing={
              // Only offered when there is something to go back to: a draft
              // exists and the user closed its panel.
              Boolean(content) &&
              !isPreviewOpen && (
                <IconButton
                  icon={<PanelRightOpen className="size-5" />}
                  aria-label="Open live preview"
                  onClick={openPreview}
                />
              )
            }
          />
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
  );
};

export default DashboardPage;
