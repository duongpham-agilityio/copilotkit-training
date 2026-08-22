import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DASHBOARD_STATE_STORAGE_KEY } from '@/constants/storage.ts';
import type { Commit } from '@/types/commit.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface DashboardThreadState {
  commits: Commit[];
  selectedHashes: string[];
  entries: ReleaseEntry[];
  draft: ReleaseNotesDraft | null;
}

export const EMPTY_DASHBOARD_THREAD_STATE: DashboardThreadState = {
  commits: [],
  selectedHashes: [],
  entries: [],
  draft: null,
};

const toCommit = (entry: ReleaseEntry): Commit => ({
  hash: entry.id,
  type: entry.breaking ? 'breaking' : entry.type,
  message: entry.title,
  author: entry.author,
  timestamp: entry.timestamp,
});

interface DashboardStoreState {
  threads: Record<string, DashboardThreadState>;
  showEntryList: (threadId: string, entries: ReleaseEntry[]) => void;
  showDraft: (threadId: string, draft: ReleaseNotesDraft) => void;
  toggleHash: (threadId: string, hash: string) => void;
}

export const useDashboardStore = create<DashboardStoreState>()(
  persist(
    (set) => ({
      threads: {},
      // Idempotent by data, not by toolCallId history: a tool re-render triggered by
      // switching back to an already-visited thread carries the same entries/draft the
      // thread already has, so this is a no-op instead of a stale reset.
      showEntryList: (threadId, entries) =>
        set((state) => {
          const current = state.threads[threadId];
          if (current && JSON.stringify(current.entries) === JSON.stringify(entries)) {
            return state;
          }

          const commits = entries.map(toCommit);
          return {
            threads: {
              ...state.threads,
              [threadId]: {
                commits,
                selectedHashes: commits.map((commit) => commit.hash),
                entries,
                draft: current?.draft ?? null,
              },
            },
          };
        }),
      showDraft: (threadId, draft) =>
        set((state) => {
          const current = state.threads[threadId];
          if (current && JSON.stringify(current.draft) === JSON.stringify(draft)) {
            return state;
          }

          return {
            threads: {
              ...state.threads,
              [threadId]: { ...(current ?? EMPTY_DASHBOARD_THREAD_STATE), draft },
            },
          };
        }),
      toggleHash: (threadId, hash) =>
        set((state) => {
          const current = state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE;
          const selected = new Set(current.selectedHashes);
          if (selected.has(hash)) {
            selected.delete(hash);
          } else {
            selected.add(hash);
          }
          return {
            threads: {
              ...state.threads,
              [threadId]: { ...current, selectedHashes: [...selected] },
            },
          };
        }),
    }),
    { name: DASHBOARD_STATE_STORAGE_KEY },
  ),
);
