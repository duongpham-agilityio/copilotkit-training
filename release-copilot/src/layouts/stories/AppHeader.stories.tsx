import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import AppHeader, { AppNav } from '../AppHeader.tsx';

const meta: Meta<typeof AppHeader> = {
  component: AppHeader,
  title: 'layouts/AppHeader',
};

export default meta;

type Story = StoryObj<typeof AppHeader>;

export const Dashboard: Story = {
  render: () => {
    const [activeNav, setActiveNav] = useState<AppNav>(AppNav.Dashboard);
    return <AppHeader activeNav={activeNav} onNavigate={setActiveNav} />;
  },
};
