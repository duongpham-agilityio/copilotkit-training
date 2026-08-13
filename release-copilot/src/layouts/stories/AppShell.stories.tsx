import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import AppShell from '../AppShell.tsx';
import { AppNav } from '../AppHeader.tsx';

const meta: Meta<typeof AppShell> = {
  component: AppShell,
  title: 'layouts/AppShell',
};

export default meta;

type Story = StoryObj<typeof AppShell>;

export const Dashboard: Story = {
  render: () => {
    const [activeNav, setActiveNav] = useState<AppNav>(AppNav.Dashboard);
    return (
      <AppShell activeNav={activeNav} onNavigate={setActiveNav}>
        <div className="text-body-md text-on-surface">Content</div>
      </AppShell>
    );
  },
};
