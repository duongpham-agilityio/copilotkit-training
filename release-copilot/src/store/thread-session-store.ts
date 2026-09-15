import { create } from 'zustand';
import { createUUID } from '@/lib/uuid.ts';

interface ThreadSessionStoreState {
  threadId: string;
  setThreadId: (threadId: string) => void;
}

export const useThreadSessionStore = create<ThreadSessionStoreState>()(
  (set): ThreadSessionStoreState => ({
    threadId: createUUID(),
    setThreadId: (threadId) => set({ threadId }),
  }),
);
