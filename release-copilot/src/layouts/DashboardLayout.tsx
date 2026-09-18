import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  chat: ReactNode;
  preview?: ReactNode;
}

// A closed preview is NOT rendered (no zero-width element), so the chat
// reflows to the full width instead of sitting next to an empty column. The
// open panel is a flush 480px column with its own header bars — it owns its
// padding, so nothing is added around it here. Below `sm` it stacks under the
// chat instead of beside it.
const DashboardLayout = ({ chat, preview }: DashboardLayoutProps) => (
  <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
    <div className="min-h-0 min-w-0 flex-1">{chat}</div>
    {preview && (
      <div className="border-outline-subtle flex min-h-0 shrink-0 flex-col border-t sm:w-120 sm:border-t-0 sm:border-l">
        {preview}
      </div>
    )}
  </div>
);

export default DashboardLayout;
