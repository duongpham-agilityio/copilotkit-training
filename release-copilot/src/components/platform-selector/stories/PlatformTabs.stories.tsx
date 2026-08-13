import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import PlatformTabs from '../PlatformTabs.tsx';
import { Platform } from '@/types/platform.ts';

const meta: Meta<typeof PlatformTabs> = {
  component: PlatformTabs,
  title: 'platform-selector/PlatformTabs',
};

export default meta;

type Story = StoryObj<typeof PlatformTabs>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<Platform>(Platform.Github);
    return <PlatformTabs value={value} onChange={setValue} />;
  },
};
