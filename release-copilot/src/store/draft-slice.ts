import type { StateCreator } from 'zustand';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface DraftThreadState {
  draft: ReleaseNotesDraft | null;
  savedVersion: string | null;
}

export const EMPTY_DRAFT_THREAD_STATE: DraftThreadState = {
  draft: null,
  savedVersion: null,
};

export interface DraftSlice {
  draftByThread: Record<string, DraftThreadState>;
  setDraft: (threadId: string, draft: ReleaseNotesDraft) => void;
  setSavedVersion: (threadId: string, version: string) => void;
}

export const createDraftSlice: StateCreator<
  DraftSlice,
  [],
  [],
  DraftSlice
> = (set) => ({
  draftByThread: {},
  setDraft: (threadId, draft) =>
    set((state) => {
      const current = state.draftByThread[threadId];
      if (current && JSON.stringify(current.draft) === JSON.stringify(draft)) {
        return state;
      }
      return {
        draftByThread: {
          ...state.draftByThread,
          [threadId]: { ...(current ?? EMPTY_DRAFT_THREAD_STATE), draft },
        },
      };
    }),
  setSavedVersion: (threadId, version) =>
    set((state) => {
      const current = state.draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE;
      if (current.savedVersion === version) {
        return state;
      }
      return {
        draftByThread: {
          ...state.draftByThread,
          [threadId]: { ...current, savedVersion: version },
        },
      };
    }),
});
