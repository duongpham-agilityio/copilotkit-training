import { Outlet } from 'react-router';
import { HelpCircle, Settings } from 'lucide-react';
import AppShell from '@/layouts/AppShell.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import Avatar from '@/components/common/Avatar.tsx';
import DisconnectBanner from '@/components/common/DisconnectBanner.tsx';
import AppProviders from './providers/AppProviders';

const HeaderActions = () => (
  <div className="flex items-center gap-3">
    <IconButton icon={<Settings className="size-5" />} aria-label="Settings" />
    <IconButton icon={<HelpCircle className="size-5" />} aria-label="Help" />
    <Avatar name="You" />
  </div>
);

const App = () => (
  <AppProviders>
    <AppShell banner={<DisconnectBanner />} headerActions={<HeaderActions />}>
      <Outlet />
    </AppShell>
  </AppProviders>
);

export default App;
