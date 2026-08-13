import type { ReactNode } from 'react';
import AppHeader, { type AppNav } from './AppHeader.tsx';

interface AppShellProps {
  activeNav: AppNav;
  onNavigate: (nav: AppNav) => void;
  headerActions?: ReactNode;
  children: ReactNode;
}

const AppShell = ({
  activeNav,
  onNavigate,
  headerActions,
  children,
}: AppShellProps) => (
  <div className="bg-surface min-h-screen">
    <AppHeader
      activeNav={activeNav}
      onNavigate={onNavigate}
      actions={headerActions}
    />
    <main className="px-6 py-6">{children}</main>
  </div>
);

export default AppShell;
