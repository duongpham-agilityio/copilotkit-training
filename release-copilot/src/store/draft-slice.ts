import type { StateCreator } from 'zustand';
import type { EntriesSlice } from '@/store/entries-slice.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface DraftThreadState {
  draft: ReleaseNotesDraft | null;
  activePlatformId: string;
}

export const EMPTY_DRAFT_THREAD_STATE: DraftThreadState = {
  draft: null,
  activePlatformId: KnownPlatformId.Github,
};

export interface DraftSlice {
  draftByThread: Record<string, DraftThreadState>;
  setDraft: (threadId: string, draft: ReleaseNotesDraft) => void;
  setActivePlatform: (threadId: string, platformId: string) => void;
}

export const createDraftSlice: StateCreator<
  EntriesSlice & DraftSlice,
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
  setActivePlatform: (threadId, platformId) =>
    set((state) => {
      const current = state.draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE;
      if (current.activePlatformId === platformId) {
        return state;
      }
      return {
        draftByThread: {
          ...state.draftByThread,
          [threadId]: { ...current, activePlatformId: platformId },
        },
      };
    }),
});
