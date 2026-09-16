import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  sidebar?: ReactNode;
  chat: ReactNode;
  preview?: ReactNode;
}

// Three regions, two of them optional. A collapsed sidebar and a closed preview
// are NOT rendered (no zero-width element), so the chat reflows to the full
// width instead of sitting next to an empty column. Below `sm` the sidebar
// overlays the chat and the preview stacks underneath it.
const DashboardLayout = ({ sidebar, chat, preview }: DashboardLayoutProps) => (
  <div className="relative flex h-full min-h-0">
    {sidebar && (
      <div className="bg-surface absolute inset-y-0 left-0 z-20 w-[260px] shrink-0 sm:static sm:z-auto">
        {sidebar}
      </div>
    )}
    <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:flex-row">
      <div className="min-h-0 min-w-0 flex-1">{chat}</div>
      {preview && (
        <div className="border-outline-variant min-h-0 shrink-0 overflow-y-auto border-t p-4 sm:w-[38%] sm:border-t-0 sm:border-l">
          {preview}
        </div>
      )}
    </div>
  </div>
);

export default DashboardLayout;
