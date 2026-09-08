import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useThreadSessionStore } from '@/store/thread-session-store.ts';
import { listThreads } from '@/services/list-threads.ts';
import { createUUID } from '@/lib/uuid.ts';
import type { ThreadSummary } from '@/types/thread.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { useAuth } from './use-auth';

const THREADS_QUERY_KEY = ['threads'];
// Threads rarely change; avoid refetching every time the dropdown reopens.
const THREADS_STALE_TIME_MS = 30_000;

interface UseThreadSessionResult {
  threadId: string;
  threads: ThreadSummary[] | undefined;
  isThreadsLoading: boolean;
  isThreadsError: boolean;
  startNewChat: () => void;
  selectThread: (threadId: string) => void;
}

// Registers no CopilotKit primitive — safe to call from any number of
// components. Every other domain hook in this plan calls this one internally
// to resolve the current thread instead of receiving threadId as a prop.
export const useThreadSession = (): UseThreadSessionResult => {
  const threadId = useThreadSessionStore((state) => state.threadId);
  const { session } = useAuth();
  const resourceId = session!.user.id;
  const setThreadId = useThreadSessionStore((state) => state.setThreadId);
  const queryClient = useQueryClient();

  const {
    data: threads,
    isLoading: isThreadsLoading,
    isError: isThreadsError,
  } = useQuery({
    queryKey: THREADS_QUERY_KEY,
    queryFn: () =>
      listThreads({
        agentId: RELEASE_COPILOT_AGENT_ID,
        resourceId,
      }),
    staleTime: THREADS_STALE_TIME_MS,
  });

  // The active thread may not exist server-side yet (no message sent, title
  // not generated) — seed a placeholder so the list never shows nothing for it.
  useEffect(() => {
    if (!threadId) return;

    queryClient.setQueryData<ThreadSummary[]>(THREADS_QUERY_KEY, (current) => {
      if (current?.some((thread) => thread.id === threadId)) return current;

      const now = new Date().toISOString();
      return [
        {
          id: threadId,
          title: threadId,
          resourceId,
          createdAt: now,
          updatedAt: now,
        },
        ...(current ?? []),
      ];
    });
  }, [threadId, queryClient, resourceId]);

  return {
    threadId,
    threads,
    isThreadsLoading,
    isThreadsError,
    startNewChat: () => setThreadId(createUUID()),
    selectThread: setThreadId,
  };
};
