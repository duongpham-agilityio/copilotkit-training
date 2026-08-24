import type { StateCreator } from 'zustand';
import type { DraftSlice } from '@/store/draft-slice.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';

export interface EntriesThreadState {
  entries: ReleaseEntry[];
  selectedIds: string[];
}

export const EMPTY_ENTRIES_THREAD_STATE: EntriesThreadState = {
  entries: [],
  selectedIds: [],
};

export interface EntriesSlice {
  entriesByThread: Record<string, EntriesThreadState>;
  setEntries: (threadId: string, entries: ReleaseEntry[]) => void;
  toggleEntrySelection: (threadId: string, entryId: string) => void;
}

// Typed against the combined store (EntriesSlice & DraftSlice) rather than just
// EntriesSlice, per Zustand's documented slices pattern — this is what lets
// release-workspace-store.ts spread this slice and draft-slice.ts together
// with a single `set`/`get` pair. The circular type-only import with
// draft-slice.ts is expected and resolves fine at compile time.
export const createEntriesSlice: StateCreator<
  EntriesSlice & DraftSlice,
  [],
  [],
  EntriesSlice
> = (set) => ({
  entriesByThread: {},
  // Idempotent by data: a tool re-render triggered by switching back to an
  // already-visited thread carries the same entries the thread already has,
  // so this is a no-op instead of a stale reset — avoids a visible flicker.
  setEntries: (threadId, entries) =>
    set((state) => {
      const current = state.entriesByThread[threadId];
      if (current && JSON.stringify(current.entries) === JSON.stringify(entries)) {
        return state;
      }

      return {
        entriesByThread: {
          ...state.entriesByThread,
          [threadId]: {
            entries,
            selectedIds: entries.map((entry) => entry.id),
          },
        },
      };
    }),
  toggleEntrySelection: (threadId, entryId) =>
    set((state) => {
      const current = state.entriesByThread[threadId] ?? EMPTY_ENTRIES_THREAD_STATE;
      const selected = new Set(current.selectedIds);
      if (selected.has(entryId)) {
        selected.delete(entryId);
      } else {
        selected.add(entryId);
      }
      return {
        entriesByThread: {
          ...state.entriesByThread,
          [threadId]: { ...current, selectedIds: [...selected] },
        },
      };
    }),
});
