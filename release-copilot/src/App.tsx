import { useState } from 'react';
import { Download, HelpCircle, Settings } from 'lucide-react';
import AppShell from '@/layouts/AppShell.tsx';
import { AppNav } from '@/layouts/AppHeader.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import Avatar from '@/components/common/Avatar.tsx';
import DashboardPage from '@/routes/DashboardPage.tsx';

const HeaderActions = () => (
  <div className="flex items-center gap-3">
    <Button variant={ButtonVariant.Primary} className="flex items-center gap-2">
      <Download className="size-4" aria-hidden="true" />
      Export
    </Button>
    <IconButton icon={<Settings className="size-5" />} aria-label="Settings" />
    <IconButton icon={<HelpCircle className="size-5" />} aria-label="Help" />
    <Avatar name="You" />
  </div>
);

const App = () => {
  const [activeNav, setActiveNav] = useState<AppNav>(AppNav.Dashboard);

  return (
    <AppShell
      activeNav={activeNav}
      onNavigate={setActiveNav}
      headerActions={<HeaderActions />}
    >
      {activeNav === AppNav.Dashboard ? (
        <DashboardPage />
      ) : (
        <div className="text-body-md text-on-surface-variant">
          History is coming soon.
        </div>
      )}
    </AppShell>
  );
};

export default App;
