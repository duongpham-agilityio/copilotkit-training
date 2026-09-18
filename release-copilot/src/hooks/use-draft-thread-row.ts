import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ThreadSummary } from '@/types/thread.ts';
import { THREADS_QUERY_KEY } from '@/constants/query-keys.ts';
import { useDraftThreadStore } from '@/store/draft-thread-store.ts';
import { useAuth } from './use-auth.ts';
import { useThreadConfig } from './use-thread-config.ts';

interface UseDraftThreadRowInput {
  agentThreadId: string;
  hasMessages: boolean;
  isRunning: boolean;
}
export const useDraftThreadRow = ({
  agentThreadId,
  hasMessages,
  isRunning,
}: UseDraftThreadRowInput): void => {
  const { threadId, hasExplicitThreadId } = useThreadConfig();
  const { session } = useAuth();
  const resourceId = session!.user.id;
  const setDraftThread = useDraftThreadStore((state) => state.setDraftThread);
  const queryClient = useQueryClient();

  const isDraftInProgress =
    !hasExplicitThreadId && agentThreadId === threadId && hasMessages;

  useEffect(() => {
    if (!isDraftInProgress) return;

    const now = new Date().toISOString();
    setDraftThread({
      id: threadId,
      title: threadId,
      resourceId,
      createdAt: now,
      updatedAt: now,
    });
  }, [isDraftInProgress, threadId, resourceId, setDraftThread]);

  useEffect(() => {
    if (!isDraftInProgress || isRunning) return;

    const threads =
      queryClient.getQueryData<ThreadSummary[]>(THREADS_QUERY_KEY);
    if (threads?.some((thread) => thread.id === threadId)) return;

    void queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
  }, [isDraftInProgress, isRunning, threadId, queryClient]);
};
