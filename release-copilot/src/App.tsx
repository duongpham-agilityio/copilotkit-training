import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import AppShell from '@/layouts/AppShell.tsx';
import AppSidebar from '@/layouts/AppSidebar.tsx';
import ThreadListItem from '@/components/chat/ThreadListItem.tsx';
import DisconnectBanner from '@/components/common/DisconnectBanner.tsx';
import { useAuth } from '@/hooks/use-auth.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { groupThreadsByRecency } from '@/lib/group-threads-by-date.ts';
import { ROUTE_DASHBOARD, ROUTE_HISTORY } from '@/constants/routings.ts';
import AppProviders from './providers/AppProviders';

const WORKSPACE_NAME = 'Release Builder';
const WORKSPACE_SLUG = 'release-copilot';

// AppSidebar is shared chrome across Dashboard and History — this is the one
// place both routes mount under, so it owns collapse state and the thread
// list. History gets the same sidebar with an empty thread slot and
// isHistoryActive=true instead of a second, duplicated sidebar.
const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { threadId, threads, selectThread, startNewChat } = useThreadSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isHistoryActive = location.pathname === ROUTE_HISTORY;
  const isDashboardActive = location.pathname === ROUTE_DASHBOARD;

  const handleNewThread = () => {
    startNewChat();
    if (!isDashboardActive) navigate(ROUTE_DASHBOARD);
  };

  return (
    <AppShell
      banner={<DisconnectBanner />}
      sidebar={
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
          workspaceName={WORKSPACE_NAME}
          workspaceSlug={WORKSPACE_SLUG}
          onNewThread={handleNewThread}
          userName={session?.user.email ?? 'Signed in'}
          onSignOut={() => void signOut()}
          isHistoryActive={isHistoryActive}
        >
          {isDashboardActive && (
            <div className="flex flex-col px-3">
              {groupThreadsByRecency(threads ?? []).map((group) => (
                <div key={group.label}>
                  <div className="text-label-xs text-on-surface-muted px-2.5 pt-4 pb-1.5 font-semibold">
                    {group.label}
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {group.threads.map((thread) => (
                      <ThreadListItem
                        key={thread.id}
                        thread={thread}
                        isActive={thread.id === threadId}
                        time={thread.timeLabel}
                        onSelect={selectThread}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </AppSidebar>
      }
    >
      <Outlet />
    </AppShell>
  );
};

const App = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);

export default App;
