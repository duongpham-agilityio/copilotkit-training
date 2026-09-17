import type { Meta, StoryObj } from '@storybook/react-vite';
import RawMarkdownView from '../RawMarkdownView.tsx';

const meta: Meta<typeof RawMarkdownView> = {
  component: RawMarkdownView,
  title: 'release-notes/RawMarkdownView',
};

export default meta;

type Story = StoryObj<typeof RawMarkdownView>;

const SAMPLE_MARKDOWN = `# v2.4.0

## Features

- Add \`PlatformTabs\` component for selecting release destinations
- Support custom commit-type prefixes like \`hotfix:\`

## Fixes

- Fix App Store character-limit truncation on export
`;

export const Default: Story = {
  args: { markdown: SAMPLE_MARKDOWN },
};

export const Empty: Story = {
  args: { markdown: null },
};
