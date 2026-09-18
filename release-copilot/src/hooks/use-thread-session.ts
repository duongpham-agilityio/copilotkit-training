import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { listThreads } from '@/services/list-threads.ts';
import type { ThreadSummary } from '@/types/thread.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id';
import { THREADS_QUERY_KEY } from '@/constants/query-keys.ts';
import { buildThreadPath, ROUTE_DASHBOARD } from '@/constants/routings.ts';
import { useDraftThreadStore } from '@/store/draft-thread-store.ts';
import { useAuth } from './use-auth';
import { useThreadConfig } from './use-thread-config.ts';

// Threads rarely change; avoid refetching every time the dropdown reopens.
const THREADS_STALE_TIME_MS = 30_000;

interface UseThreadSessionResult {
  threadId: string;
  /**
   * True while the thread is a client-side draft: CopilotKit has minted an id
   * but no run has persisted it server-side yet, so it has no row in `threads`
   * and the welcome screen is showing.
   */
  isDraftThread: boolean;
  threads: ThreadSummary[] | undefined;
  isThreadsLoading: boolean;
  isThreadsError: boolean;
  startNewChat: () => void;
  selectThread: (threadId: string) => void;
}

// Registers no CopilotKit primitive — safe to call from any number of
// components. The active thread id is owned by the
// <CopilotChatConfigurationProvider> inside <CopilotKit> rather than by a store
// of our own: two sources of truth would fight, because writing our id back into
// <CopilotChat threadId=...> marks the thread explicit and kills the welcome
// screen before the first message. useThreadUrlSync mirrors the URL into it.
// Every other domain hook calls this one to resolve the current thread instead
// of receiving threadId as a prop.
export const useThreadSession = (): UseThreadSessionResult => {
  const { threadId, hasExplicitThreadId, setActiveThreadId, startNewThread } =
    useThreadConfig();
  const { session } = useAuth();
  const resourceId = session!.user.id;
  const navigate = useNavigate();

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

  const draftThread = useDraftThreadStore((state) => state.draftThread);

  // Merged on read rather than written into the react-query cache: a cached
  // placeholder is wiped by the next refetch (and re-added by an effect that no
  // longer matches the server row), which is how the same thread ended up
  // listed twice. Derived this way the placeholder disappears by itself the
  // moment the server list contains its id.
  const mergedThreads = useMemo(() => {
    if (!draftThread) return threads;
    if (threads?.some((thread) => thread.id === draftThread.id)) return threads;
    return [draftThread, ...(threads ?? [])];
  }, [threads, draftThread]);

  return {
    threadId,
    isDraftThread: !hasExplicitThreadId,
    threads: mergedThreads,
    isThreadsLoading,
    isThreadsError,
    // No id is created here and nothing is written to the server: CopilotKit
    // mints a fresh non-explicit id, which clears the conversation and brings
    // the welcome screen back. The row appears in the sidebar only once the
    // first message is sent (use-thread-optimistic-row).
    startNewChat: () => {
      startNewThread();
      navigate(ROUTE_DASHBOARD);
    },
    // `explicit: true` is what makes CopilotChat connect to the stored thread
    // and load its history, instead of treating the id as a fresh draft.
    selectThread: (nextThreadId) => {
      setActiveThreadId(nextThreadId, { explicit: true });
      navigate(buildThreadPath(nextThreadId));
    },
  };
};
