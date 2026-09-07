import { Outlet } from 'react-router';
import { Download, HelpCircle, Settings } from 'lucide-react';
import AppShell from '@/layouts/AppShell.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import Avatar from '@/components/common/Avatar.tsx';
import DisconnectBanner from '@/components/common/DisconnectBanner.tsx';
import ErrorBoundary, {
  ErrorBoundaryVariant,
} from '@/components/common/ErrorBoundary.tsx';
import { useReleaseExport } from '@/hooks/use-release-export.ts';
import { ExportFormat } from '@/types/export-format.ts';

const HeaderActions = () => {
  const { canExport, exportDraft } = useReleaseExport();

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={ButtonVariant.Primary}
        className="flex items-center gap-2"
        disabled={!canExport}
        onClick={() => exportDraft({ format: ExportFormat.Markdown })}
      >
        <Download className="size-4" aria-hidden="true" />
        Export
      </Button>
      <IconButton icon={<Settings className="size-5" />} aria-label="Settings" />
      <IconButton icon={<HelpCircle className="size-5" />} aria-label="Help" />
      <Avatar name="You" />
    </div>
  );
};

const App = () => (
  <AppShell
    banner={<DisconnectBanner />}
    headerActions={
      <ErrorBoundary title="Export unavailable" variant={ErrorBoundaryVariant.Inline}>
        <HeaderActions />
      </ErrorBoundary>
    }
  >
    <Outlet />
  </AppShell>
);

export default App;
