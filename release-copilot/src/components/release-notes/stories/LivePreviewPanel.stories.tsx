import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import LivePreviewPanel from '../LivePreviewPanel.tsx';
import { Platform } from '@/types/platform.ts';

const meta: Meta<typeof LivePreviewPanel> = {
  component: LivePreviewPanel,
  title: 'release-notes/LivePreviewPanel',
};

export default meta;

type Story = StoryObj<typeof LivePreviewPanel>;

const SAMPLE_MARKDOWN = `# v2.4.0

## Features

- Add \`PlatformTabs\` component for selecting release destinations
- Support custom commit-type prefixes like \`hotfix:\`

## Fixes

- Fix App Store character-limit truncation on export
`;

const LivePreviewPanelStory = () => {
  const [platform, setPlatform] = useState<Platform>(Platform.Github);
  return (
    <LivePreviewPanel
      markdown={SAMPLE_MARKDOWN}
      platform={platform}
      onPlatformChange={setPlatform}
      onCopy={() => {}}
    />
  );
};

export const Default: Story = {
  render: () => <LivePreviewPanelStory />,
};
