import type { ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}

const AppShell = ({ sidebar, banner, children }: AppShellProps) => (
  <div className="bg-surface flex h-screen flex-col overflow-hidden">
    {banner}
    <div className="flex min-h-0 flex-1">
      {sidebar}
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  </div>
);

export default AppShell;
