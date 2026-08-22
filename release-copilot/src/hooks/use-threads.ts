import { useQuery } from '@tanstack/react-query';
import { listThreads } from '@/services/list-threads.ts';

// Threads rarely change; avoid refetching every time the dropdown reopens.
const THREADS_STALE_TIME_MS = 30_000;

export const THREADS_QUERY_KEY = ['threads'];

export const useThreads = () =>
  useQuery({
    queryKey: THREADS_QUERY_KEY,
    queryFn: listThreads,
    staleTime: THREADS_STALE_TIME_MS,
  });
