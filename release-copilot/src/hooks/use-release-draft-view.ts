import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import { EMPTY_DRAFT_THREAD_STATE } from '@/store/draft-slice.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { composeReleaseContent } from '@/lib/release-notes/release-title.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface ReleaseDraftView {
  draft: ReleaseNotesDraft | null;
  content: string | null;
}

// Read-only projection of the draft slice — safe to call from any number of
// components or hooks. Tool registration lives only in useReleaseDraft()
// (use-release-draft.tsx), which must stay a single call site; calling
// useRenderTool from more than one mounted place would register the tool twice.
export const useReleaseDraftView = (): ReleaseDraftView => {
  const { threadId } = useThreadSession();
  const threadState = useReleaseWorkspaceStore(
    (state) => state.draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE,
  );

  return {
    draft: threadState.draft,
    content: threadState.draft
      ? composeReleaseContent(threadState.draft)
      : null,
  };
};
