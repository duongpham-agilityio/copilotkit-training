import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import type { Meta, StoryObj } from '@storybook/react-vite';
import AppShell from '../AppShell.tsx';
import AppSidebar from '../AppSidebar.tsx';
import { ROUTE_DASHBOARD } from '@/constants/routings.ts';

const meta: Meta<typeof AppShell> = {
  component: AppShell,
  title: 'layouts/AppShell',
};

export default meta;

type Story = StoryObj<typeof AppShell>;

export const Dashboard: Story = {
  render: () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    return (
      <MemoryRouter initialEntries={[ROUTE_DASHBOARD]}>
        <div className="h-140">
          <AppShell
            sidebar={
              <AppSidebar
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed((value) => !value)}
                workspaceName="Release Builder"
                onNewThread={() => {}}
                userName="Duong Pham"
                onSignOut={() => Promise.resolve()}
                isHistoryActive={false}
              />
            }
          >
            <div className="text-body-md text-on-surface p-6">Content</div>
          </AppShell>
        </div>
      </MemoryRouter>
    );
  },
};
