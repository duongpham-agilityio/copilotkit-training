import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { History, Plus, Search, SquareChevronLeft, SquareChevronRight } from 'lucide-react';
import { ROUTE_DASHBOARD, ROUTE_HISTORY } from '@/constants/routings.ts';
import WorkspaceSwitch from '@/components/common/WorkspaceSwitch.tsx';
import AccountMenu from '@/components/common/AccountMenu.tsx';
import Avatar, { AvatarSize } from '@/components/common/Avatar.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import { cn } from '@/lib/cn.ts';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  workspaceName: string;
  workspaceSlug: string;
  newThreadHref?: string;
  userName: string;
  avatarSrc?: string;
  onSignOut: () => void;
  isHistoryActive: boolean;
  children?: ReactNode;
}

const AppSidebar = ({
  isCollapsed,
  onToggleCollapse,
  workspaceName,
  workspaceSlug,
  newThreadHref = ROUTE_DASHBOARD,
  userName,
  avatarSrc,
  onSignOut,
  isHistoryActive,
  children,
}: AppSidebarProps) => {
  if (isCollapsed) {
    return (
      <aside className="bg-surface-container-low border-outline-variant flex h-full w-16 shrink-0 flex-col items-center gap-2 overflow-hidden border-r px-0 py-3.5">
        <span className="bg-primary flex size-7 items-center justify-center rounded-lg text-white">
          <History className="size-3.5" />
        </span>
        <IconButton
          icon={<SquareChevronRight className="size-4.5" />}
          aria-label="Expand sidebar"
          onClick={onToggleCollapse}
        />
        <div className="bg-outline-variant my-1 h-px w-7" />
        <Link
          to={newThreadHref}
          aria-label="New thread"
          className="bg-primary hover:bg-primary/90 flex size-9 items-center justify-center rounded-xl text-white"
        >
          <Plus className="size-4" />
        </Link>
        <IconButton icon={<Search className="size-4.5" />} aria-label="Search threads" />
        <div className="flex-1" />
        <Link
          to={ROUTE_HISTORY}
          aria-label="Release history"
          className={cn(
            'flex size-9 items-center justify-center rounded-xl',
            isHistoryActive
              ? 'bg-surface-container text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-container',
          )}
        >
          <History className="size-4.5" />
        </Link>
        <Avatar name={userName} src={avatarSrc} size={AvatarSize.Sm} />
      </aside>
    );
  }

  return (
    <aside className="bg-surface-container-low border-outline-variant flex h-full w-68 shrink-0 flex-col overflow-hidden border-r">
      <div className="flex shrink-0 items-center gap-1 px-3 pt-3">
        <WorkspaceSwitch name={workspaceName} slug={workspaceSlug} />
        <IconButton
          icon={<SquareChevronLeft className="size-4.5" />}
          aria-label="Collapse sidebar"
          onClick={onToggleCollapse}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 px-3 pt-3.5 pb-1">
        <Link
          to={newThreadHref}
          className="bg-primary text-on-primary hover:bg-primary/90 flex h-9 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
        >
          <Plus className="size-4" />
          New thread
        </Link>
        <button
          type="button"
          className="border-outline-variant text-on-surface-variant flex h-8.5 items-center gap-2 rounded-lg border px-2.5 text-sm"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search threads</span>
          <span className="text-label-sm border-outline-variant rounded border px-1 font-mono">
            ⌘K
          </span>
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-1" aria-label="Threads">
        {children}
      </nav>

      <div className="border-outline-variant flex shrink-0 flex-col gap-1 border-t px-3 py-3">
        <Link
          to={ROUTE_HISTORY}
          className={cn(
            'flex h-8.5 items-center gap-2 rounded-lg px-2.5 text-sm font-medium',
            isHistoryActive
              ? 'bg-surface-container text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-container',
          )}
        >
          <History className="size-4" />
          Release history
        </Link>
        <AccountMenu userName={userName} avatarSrc={avatarSrc} onSignOut={onSignOut} />
      </div>
    </aside>
  );
};

export default AppSidebar;
