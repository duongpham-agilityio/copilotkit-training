import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Tabs, { TabsVariant, type TabItem } from '../Tabs.tsx';

const meta: Meta<typeof Tabs> = {
  component: Tabs,
  title: 'common/Tabs',
};

export default meta;

type Story = StoryObj<typeof Tabs>;

const PILL_ITEMS: TabItem[] = [
  { value: 'all', label: 'All' },
  { value: 'feat', label: 'Feat' },
  { value: 'fix', label: 'Fix' },
];

const UNDERLINE_ITEMS: TabItem[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'history', label: 'History' },
];

export const Pill: Story = {
  render: () => {
    const [value, setValue] = useState('all');
    return (
      <Tabs items={PILL_ITEMS} value={value} onChange={setValue} variant={TabsVariant.Pill} />
    );
  },
};

export const Underline: Story = {
  render: () => {
    const [value, setValue] = useState('dashboard');
    return (
      <Tabs
        items={UNDERLINE_ITEMS}
        value={value}
        onChange={setValue}
        variant={TabsVariant.Underline}
      />
    );
  },
};
