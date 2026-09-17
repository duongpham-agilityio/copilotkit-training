import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import ThreadHeader from '@/components/chat/ThreadHeader.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import DashboardLayout from '@/layouts/DashboardLayout.tsx';
import { useArchiveRelease } from '@/hooks/use-archive-release.ts';
import { usePreviewPanel } from '@/hooks/use-preview-panel.ts';
import { useReleaseDraft } from '@/hooks/use-release-draft.tsx';
import { useSlackPublish } from '@/hooks/use-slack-publish.tsx';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { ToastKind } from '@/store/toast-store.ts';
import { copyText } from '@/lib/clipboard.ts';
import { downloadTextFile } from '@/lib/download-text-file.ts';
import { buildSaveReleaseHistoryRequest } from '@/lib/release-notes/build-save-release-history-request.ts';
import {
  buildReleaseNotesFileName,
  describeReleaseDraft,
} from '@/lib/release-notes/release-title.ts';

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
  const { draft, content, isArchived } = useReleaseDraft({
    isPreviewOpen,
    onOpenPreview: openPreview,
  });
  useSlackPublish();
  const { threadId, threads } = useThreadSession();
  const { showToast } = useToast();
  const { archive, isArchiving } = useArchiveRelease();

  const currentThread = threads?.find((thread) => thread.id === threadId);
  const title = currentThread?.title || 'New thread';

  const handleCopy = async (): Promise<boolean> => {
    if (!draft || !content) return false;

    const isCopied = await copyText(content);
    showToast(
      isCopied
        ? {
            kind: ToastKind.Success,
            title: 'Copied to clipboard',
            description: `Markdown for ${describeReleaseDraft(draft)}`,
          }
        : { kind: ToastKind.Error, title: 'Couldn’t copy release notes' },
    );
    return isCopied;
  };

  const handleExport = () => {
    if (!draft || !content) return;

    const fileName = buildReleaseNotesFileName(draft);
    downloadTextFile(fileName, content);
    showToast({
      kind: ToastKind.Success,
      title: `Exported ${fileName}`,
      description: 'Saved to your Downloads folder.',
    });
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <ThreadHeader
        title={title}
        isPreviewOpen={isPreviewOpen}
        onTogglePreview={() => (isPreviewOpen ? closePreview() : openPreview())}
        onExportNotes={handleExport}
        canExportNotes={content !== null}
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
                onExport={handleExport}
                onArchive={() => draft && archive(draft)}
                isArchiving={isArchiving}
                isArchived={isArchived}
                canArchive={draft !== null && buildSaveReleaseHistoryRequest(draft) !== null}
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
