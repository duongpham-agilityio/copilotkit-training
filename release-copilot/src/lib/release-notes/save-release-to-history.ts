import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import { useThreadSessionStore } from '@/store/thread-session-store.ts';
import { EMPTY_DRAFT_THREAD_STATE } from '@/store/draft-slice.ts';
import { EMPTY_ENTRIES_THREAD_STATE } from '@/store/entries-slice.ts';
import { saveReleaseHistory } from '@/services/save-release-history.ts';

interface SaveReleaseToHistoryResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
}

// Reads the current thread's draft/entries directly from the Zustand stores
// rather than taking them as parameters — callable from anywhere (event
// handler, chat-flow callback) without threading props through, and without
// widening any hook's public signature to expose store internals.
export const saveReleaseToHistory =
  async (): Promise<SaveReleaseToHistoryResult> => {
    const { threadId } = useThreadSessionStore.getState();
    const { draftByThread, entriesByThread, setSavedVersion } =
      useReleaseWorkspaceStore.getState();
    const { draft, savedVersion } =
      draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE;
    const { entries, selectedIds } =
      entriesByThread[threadId] ?? EMPTY_ENTRIES_THREAD_STATE;

    if (!draft?.version || !draft.title) {
      return { ok: false, error: 'Draft has no version/title yet.' };
    }

    const selectedIdSet = new Set(selectedIds);
    const selectedEntries = entries.filter((entry) =>
      selectedIdSet.has(entry.id),
    );
    if (selectedEntries.length === 0) {
      return { ok: false, error: 'No entries selected.' };
    }

    if (savedVersion === draft.version) {
      return { ok: true, skipped: true };
    }

    const result = await saveReleaseHistory({
      ...draft,
      version: draft.version,
      title: draft.title,
      entries: selectedEntries,
    });

    if (result.ok) {
      setSavedVersion(threadId, draft.version);
    }

    return result;
  };
