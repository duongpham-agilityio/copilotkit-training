import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ThreadHeader from '../ThreadHeader.tsx';

const meta: Meta<typeof ThreadHeader> = {
  component: ThreadHeader,
  title: 'chat/ThreadHeader',
  args: {
    title: 'v2.5.0 · Slack digest & templates',
    onExportNotes: () => {},
    canExportNotes: true,
  },
};

export default meta;

type Story = StoryObj<typeof ThreadHeader>;

export const Default: Story = {
  render: (args) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    return (
      <ThreadHeader
        {...args}
        isPreviewOpen={isPreviewOpen}
        onTogglePreview={() => setIsPreviewOpen((open) => !open)}
      />
    );
  },
};

export const PreviewOpen: Story = {
  args: { isPreviewOpen: true, onTogglePreview: () => {} },
};

export const LongTitle: Story = {
  args: {
    title: 'A very long thread title that should truncate instead of pushing the actions off screen',
    isPreviewOpen: false,
    onTogglePreview: () => {},
  },
};
