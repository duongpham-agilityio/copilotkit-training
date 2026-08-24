import { useMemo } from 'react';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import { EMPTY_DRAFT_THREAD_STATE } from '@/store/draft-slice.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { buildPlatformOptions } from '@/lib/release-notes/platform-options.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface ReleaseDraftView {
  draft: ReleaseNotesDraft | null;
  options: PlatformOption[];
  activePlatformId: string;
  activeContent: string | null;
  setActivePlatform: (platformId: string) => void;
}

// Read-only projection of the draft slice — safe to call from any number of
// components or hooks. Tool registration lives only in useReleaseDraft()
// below, which must stay a single call site; calling useRenderTool from more
// than one mounted place would register the tool twice. setActivePlatform is
// exposed here (not gated behind the single-call-site rule) because it only
// dispatches a store action — it registers nothing with CopilotKit.
export const useReleaseDraftView = (): ReleaseDraftView => {
  const { threadId } = useThreadSession();
  const threadState = useReleaseWorkspaceStore(
    (state) => state.draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE,
  );
  const setActivePlatformAction = useReleaseWorkspaceStore(
    (state) => state.setActivePlatform,
  );

  // Falls back to GitHub when the thread's stored activePlatformId no longer
  // matches any option in the current draft (e.g. a redraft dropped a dynamic
  // platform the user had been viewing).
  const options = useMemo(
    () => (threadState.draft ? buildPlatformOptions(threadState.draft) : []),
    [threadState.draft],
  );
  const activePlatformId = options.some(
    (option) => option.platformId === threadState.activePlatformId,
  )
    ? threadState.activePlatformId
    : KnownPlatformId.Github;
  const activeContent =
    options.find((option) => option.platformId === activePlatformId)?.content ??
    null;

  return {
    draft: threadState.draft,
    options,
    activePlatformId,
    activeContent,
    setActivePlatform: (platformId: string) =>
      setActivePlatformAction(threadId, platformId),
  };
};
