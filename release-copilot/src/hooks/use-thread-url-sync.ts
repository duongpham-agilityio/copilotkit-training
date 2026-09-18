import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { ROUTE_DASHBOARD, THREAD_SEARCH_PARAM } from '@/constants/routings.ts';
import { useThreadConfig } from './use-thread-config.ts';

// One-way sync, URL -> CopilotKit. Selecting a thread already sets the active
// id and navigates (useThreadSession); this effect covers the paths that change
// the URL without going through it: a reload on `/?thread=<id>`, a pasted link,
// and the browser Back/Forward buttons.
//
// The reverse direction (writing the active id back into the URL) is
// deliberately absent: a draft thread has an id but no server-side thread, so
// putting it in the URL would produce a link that resolves to nothing.
//
// A dashboard URL *without* the param is left alone rather than reset to a new
// thread. `/` is reached both by starting a new chat and by coming back from
// History, and a draft conversation has no `?thread=` to return to — resetting
// here would throw away whatever the user had typed. Starting a thread stays an
// explicit action (startNewChat).
// Call once, from the component that owns the routes (App).
export const useThreadUrlSync = (): void => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { threadId, setActiveThreadId } = useThreadConfig();

  const urlThreadId = searchParams.get(THREAD_SEARCH_PARAM);
  const isDashboard = pathname === ROUTE_DASHBOARD;

  useEffect(() => {
    if (!isDashboard || !urlThreadId || urlThreadId === threadId) return;

    setActiveThreadId(urlThreadId, { explicit: true });
  }, [isDashboard, urlThreadId, threadId, setActiveThreadId]);
};
