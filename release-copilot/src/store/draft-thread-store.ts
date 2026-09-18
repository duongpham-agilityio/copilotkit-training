import { create } from 'zustand';
import type { ThreadSummary } from '@/types/thread.ts';

interface DraftThreadStoreState {
  draftThread: ThreadSummary | null;
  setDraftThread: (thread: ThreadSummary) => void;
}

export const useDraftThreadStore = create<DraftThreadStoreState>()(
  (set): DraftThreadStoreState => ({
    draftThread: null,
    setDraftThread: (thread) =>
      set((state) =>
        state.draftThread?.id === thread.id ? state : { draftThread: thread },
      ),
  }),
);
