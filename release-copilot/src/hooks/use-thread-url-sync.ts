import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { ROUTE_DASHBOARD, THREAD_SEARCH_PARAM } from '@/constants/routings.ts';
import { useThreadSessionStore } from '@/store/thread-session-store.ts';

// One-way sync, URL -> store: selecting or starting a thread navigates to
// `/?thread=<id>` (useThreadSession) and this effect moves the store after it.
// Writing both at once would let this effect see the new store id next to the
// old URL and switch back. A dashboard URL without the param (sidebar link,
// History -> Dashboard) is filled in with the current thread.
// Call once, from the component that owns the routes (App).
export const useThreadUrlSync = (): void => {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const threadId = useThreadSessionStore((state) => state.threadId);
  const setThreadId = useThreadSessionStore((state) => state.setThreadId);

  const urlThreadId = searchParams.get(THREAD_SEARCH_PARAM);
  const isDashboard = pathname === ROUTE_DASHBOARD;

  useEffect(() => {
    if (!isDashboard) return;

    if (!urlThreadId) {
      setSearchParams({ [THREAD_SEARCH_PARAM]: threadId }, { replace: true });
      return;
    }

    if (urlThreadId !== threadId) {
      setThreadId(urlThreadId);
    }
  }, [isDashboard, urlThreadId, threadId, setSearchParams, setThreadId]);
};
