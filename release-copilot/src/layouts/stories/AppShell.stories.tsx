import { MemoryRouter } from 'react-router';
import type { Meta, StoryObj } from '@storybook/react-vite';
import AppShell from '../AppShell.tsx';
import { ROUTE_DASHBOARD } from '@/constants/routings.ts';

const meta: Meta<typeof AppShell> = {
  component: AppShell,
  title: 'layouts/AppShell',
};

export default meta;

type Story = StoryObj<typeof AppShell>;

export const Dashboard: Story = {
  render: () => (
    <MemoryRouter initialEntries={[ROUTE_DASHBOARD]}>
      <AppShell>
        <div className="text-body-md text-on-surface">Content</div>
      </AppShell>
    </MemoryRouter>
  ),
};
