import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COPILOTKIT_THREAD_ID_STORAGE_KEY } from '@/constants/copilotkit.ts';
import { createUUID } from '@/lib/uuid.ts';

interface ThreadSessionStoreState {
  threadId: string;
  setThreadId: (threadId: string) => void;
}

export const useThreadSessionStore = create<ThreadSessionStoreState>()(
  persist(
    (set): ThreadSessionStoreState => ({
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
