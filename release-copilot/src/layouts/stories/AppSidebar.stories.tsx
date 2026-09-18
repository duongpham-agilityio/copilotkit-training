import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import type { Meta, StoryObj } from '@storybook/react-vite';
import AppSidebar from '../AppSidebar.tsx';
import { ROUTE_DASHBOARD } from '@/constants/routings.ts';

const meta: Meta<typeof AppSidebar> = {
  component: AppSidebar,
  title: 'layouts/AppSidebar',
  args: {
    workspaceName: 'Release Builder',
    workspaceSlug: 'acme/release-builder',
    userName: 'Duong Pham',
    isHistoryActive: false,
    onSignOut: () => Promise.resolve(),
    onNewThread: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof AppSidebar>;

const SAMPLE_THREADS = [
  'v2.5.0 · Slack digest & templates',
  'Changelog parser dependency bump',
  'App Store tone pass',
];

export const Expanded: Story = {
  render: (args) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    return (
      <MemoryRouter initialEntries={[ROUTE_DASHBOARD]}>
        <div className="h-140">
          <AppSidebar
            {...args}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((value) => !value)}
          >
            <ul className="flex flex-col gap-0.5 px-3">
              {SAMPLE_THREADS.map((title) => (
                <li key={title} className="text-body-md text-on-surface truncate px-2 py-1.5">
                  {title}
                </li>
              ))}
            </ul>
          </AppSidebar>
        </div>
      </MemoryRouter>
    );
  },
};

export const Collapsed: Story = {
  render: (args) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    return (
      <MemoryRouter initialEntries={[ROUTE_DASHBOARD]}>
        <div className="h-140">
          <AppSidebar
            {...args}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((value) => !value)}
          />
        </div>
      </MemoryRouter>
    );
  },
};

export const HistoryActive: Story = {
  args: { isHistoryActive: true },
  render: (args) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    return (
      <MemoryRouter initialEntries={[ROUTE_DASHBOARD]}>
        <div className="h-140">
          <AppSidebar
            {...args}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((value) => !value)}
          />
        </div>
      </MemoryRouter>
    );
  },
};
