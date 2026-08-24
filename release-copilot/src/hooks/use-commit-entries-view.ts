import { useMemo } from 'react';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import { EMPTY_ENTRIES_THREAD_STATE } from '@/store/entries-slice.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import type { Commit } from '@/types/commit.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';

// Mirrors the pre-rewrite mapping in the old dashboard store 1:1, including its
// known limitation: a breaking entry's real type (feat/fix) is not preserved
// because `Commit` has one `type` field, not a separate `breaking` flag, so a
// breaking commit's badge falls back to neutral instead of showing its real
// type. Fixing that needs a `Commit` type change plus a `CommitListItem` badge
// change — UI work explicitly out of scope for this hooks-only rewrite.
const toCommit = (entry: ReleaseEntry): Commit => ({
  hash: entry.id,
  type: entry.breaking ? 'breaking' : entry.type,
  message: entry.title,
  author: entry.author,
  timestamp: entry.timestamp,
});

export interface CommitEntriesView {
  entries: ReleaseEntry[];
  commits: Commit[];
  selectedIds: string[];
  selectedEntries: ReleaseEntry[];
}

// Read-only projection of the entries slice — safe to call from any number of
// components or hooks. Tool registration lives only in useCommitEntries()
// below, which must stay a single call site; calling useFrontendTool from more
// than one mounted place would register the tool twice.
export const useCommitEntriesView = (): CommitEntriesView => {
  const { threadId } = useThreadSession();
  const threadState = useReleaseWorkspaceStore(
    (state) => state.entriesByThread[threadId] ?? EMPTY_ENTRIES_THREAD_STATE,
  );

  const commits = useMemo(
    () => threadState.entries.map(toCommit),
    [threadState.entries],
  );
  const selectedIdSet = new Set(threadState.selectedIds);
  const selectedEntries = threadState.entries.filter((entry) =>
    selectedIdSet.has(entry.id),
  );

  return {
    entries: threadState.entries,
    commits,
    selectedIds: threadState.selectedIds,
    selectedEntries,
  };
};
