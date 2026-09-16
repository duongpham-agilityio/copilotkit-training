import type { ReactNode } from 'react';
import AppHeader from './AppHeader.tsx';

interface AppShellProps {
  headerActions?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}

const AppShell = ({ headerActions, banner, children }: AppShellProps) => (
  <div className="bg-surface flex h-screen flex-col overflow-hidden">
    {banner}
    <AppHeader actions={headerActions} />
    <main className="min-h-0 flex-1 overflow-hidden">
      {children}
    </main>
  </div>
);

export default AppShell;
