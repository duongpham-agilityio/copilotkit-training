import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COPILOTKIT_THREAD_ID_STORAGE_KEY } from '@/constants/copilotkit';
import { createUUID } from '@/lib/uuid.ts';

interface ThreadStoreState {
  threadId: string;
  setThreadId: (threadId: string) => void;
}

export const useThreadStore = create<ThreadStoreState>()(
  persist(
    (set): ThreadStoreState => ({
      threadId: '',
      setThreadId: (threadId) => set({ threadId }),
    }),
    {
      name: COPILOTKIT_THREAD_ID_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state && !state.threadId) {
          state.setThreadId(createUUID());
        }
      },
    },
  ),
);
