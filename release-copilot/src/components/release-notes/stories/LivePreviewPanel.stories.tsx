import type { Meta, StoryObj } from '@storybook/react-vite';
import LivePreviewPanel from '../LivePreviewPanel.tsx';

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

export const Default: Story = {
  args: {
    markdown: SAMPLE_MARKDOWN,
    onCopy: () => {},
  },
};

export const Empty: Story = {
  args: {
    markdown: null,
    onCopy: () => {},
  },
};
