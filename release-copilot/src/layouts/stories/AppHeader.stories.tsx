import { MemoryRouter } from 'react-router';
import type { Meta, StoryObj } from '@storybook/react-vite';
import AppHeader from '../AppHeader.tsx';
import { ROUTE_DASHBOARD } from '@/constants/routes.ts';

const meta: Meta<typeof AppHeader> = {
  component: AppHeader,
  title: 'layouts/AppHeader',
};

export default meta;

type Story = StoryObj<typeof AppHeader>;

export const Dashboard: Story = {
  render: () => (
    <MemoryRouter initialEntries={[ROUTE_DASHBOARD]}>
      <AppHeader />
    </MemoryRouter>
  ),
};
