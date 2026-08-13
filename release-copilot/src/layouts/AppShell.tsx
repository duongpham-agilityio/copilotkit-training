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
  <div className="bg-surface flex h-screen flex-col overflow-hidden">
    <AppHeader
      activeNav={activeNav}
      onNavigate={onNavigate}
      actions={headerActions}
    />
    <main className="min-h-0 flex-1 overflow-hidden px-6 py-6">
      {children}
    </main>
  </div>
);

export default AppShell;
