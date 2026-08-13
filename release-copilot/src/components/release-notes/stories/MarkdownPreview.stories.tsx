import type { Meta, StoryObj } from '@storybook/react-vite';
import MarkdownPreview from '../MarkdownPreview.tsx';

const meta: Meta<typeof MarkdownPreview> = {
  component: MarkdownPreview,
  title: 'release-notes/MarkdownPreview',
};

export default meta;

type Story = StoryObj<typeof MarkdownPreview>;

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
  },
};
