import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import PlatformTabs from '../PlatformTabs.tsx';
import type { TabItem } from '@/components/common/Tabs.tsx';
import { KnownPlatformId } from '@/types/platform.ts';

const meta: Meta<typeof PlatformTabs> = {
  component: PlatformTabs,
  title: 'platform-selector/PlatformTabs',
};

export default meta;

type Story = StoryObj<typeof PlatformTabs>;

const ITEMS: TabItem[] = [
  { value: KnownPlatformId.Github, label: 'GitHub' },
  { value: KnownPlatformId.AppStore, label: 'App Store' },
  { value: KnownPlatformId.GooglePlay, label: 'Google Play' },
  { value: 'slack', label: 'Slack' },
];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string>(KnownPlatformId.Github);
    return <PlatformTabs items={ITEMS} value={value} onChange={setValue} />;
  },
};
