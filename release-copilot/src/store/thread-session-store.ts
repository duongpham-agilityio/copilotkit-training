import { create } from 'zustand';
import { ROUTE_DASHBOARD, THREAD_SEARCH_PARAM } from '@/constants/routings.ts';
import { createUUID } from '@/lib/uuid.ts';

interface ThreadSessionStoreState {
  threadId: string;
  setThreadId: (threadId: string) => void;
}

// Seeded from the URL so a reload reopens the same thread on the first render,
// instead of briefly connecting CopilotChat to a throwaway id.
// use-thread-url-sync.ts keeps the two in step afterwards.
const readInitialThreadId = (): string => {
  const { pathname, search } = window.location;
  const threadId =
    pathname === ROUTE_DASHBOARD
      ? new URLSearchParams(search).get(THREAD_SEARCH_PARAM)
      : null;
  return threadId || createUUID();
};

export const useThreadSessionStore = create<ThreadSessionStoreState>()(
  (set): ThreadSessionStoreState => ({
    threadId: readInitialThreadId(),
    setThreadId: (threadId) => set({ threadId }),
  }),
);
