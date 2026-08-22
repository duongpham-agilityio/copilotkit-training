import { useEffect, useRef, useState } from 'react';
import CommitListPanel from '@/components/commit-list/CommitListPanel.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { useShowEntryListTool } from '@/hooks/use-show-entry-list-tool.tsx';
import { useEntrySelectionContext } from '@/hooks/use-entry-selection-context.ts';
import { useRenderReleaseNotesPreviewTool } from '@/hooks/use-render-release-notes-preview-tool.tsx';
import { useConfirmSlackPublishTool } from '@/hooks/use-confirm-slack-publish-tool.tsx';
import { useCurrentDraftContext } from '@/hooks/use-current-draft-context.ts';
import {
  EMPTY_DASHBOARD_THREAD_STATE,
  useDashboardStore,
} from '@/hooks/use-dashboard-store.ts';
import { useThreadStore } from '@/hooks/use-thread-store.ts';
import { composeDraftContent } from '@/lib/release-notes/release-title.ts';
import { Platform } from '@/types/platform.ts';

const DashboardPage = () => {
  const threadId = useThreadStore((state) => state.threadId);

  // useFrontendTool/useRenderTool register their `render` closure once (see
  // use-show-entry-list-tool.tsx / use-render-release-notes-preview-tool.tsx) — a
  // callback that closed over `threadId` directly would keep reporting the thread
  // that was active at mount. Read the current thread through a ref instead.
  const threadIdRef = useRef(threadId);
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const threadState = useDashboardStore(
    (state) => state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE,
  );
  const showEntryList = useDashboardStore((state) => state.showEntryList);
  const showDraft = useDashboardStore((state) => state.showDraft);
  const toggleHash = useDashboardStore((state) => state.toggleHash);
  const [platform, setPlatform] = useState<Platform>(Platform.AppStore);

  useShowEntryListTool({
    onEntryListShown: (entries) => showEntryList(threadIdRef.current, entries),
  });

  useRenderReleaseNotesPreviewTool({
    onDraftRendered: (draft) => showDraft(threadIdRef.current, draft),
  });

  useConfirmSlackPublishTool({ draft: threadState.draft, platform });

  const selectedHashes = new Set(threadState.selectedHashes);
  const activeEntries = threadState.entries.filter((entry) =>
    selectedHashes.has(entry.id),
  );

  useEntrySelectionContext({ entries: activeEntries });
  useCurrentDraftContext({ draft: threadState.draft });

  const handleToggle = (hash: string) => toggleHash(threadId, hash);

  const markdown = threadState.draft
    ? composeDraftContent(threadState.draft, platform)
    : null;

  const handleCopy = () => {
    if (!markdown) return;
    void navigator.clipboard.writeText(markdown);
  };

  return (
    <SplitPane
      leftWidthPercent={65}
      left={
        <div className="flex flex-col gap-6">
          <CommitListPanel
            commits={threadState.commits}
            selectedHashes={selectedHashes}
            onToggle={handleToggle}
          />
          <LivePreviewPanel
            markdown={markdown}
            platform={platform}
            onPlatformChange={setPlatform}
            onCopy={handleCopy}
          />
        </div>
      }
      right={<CopilotAssistantPanel />}
    />
  );
};

export default DashboardPage;
