import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseDraftCard from '../ReleaseDraftCard.tsx';

const meta: Meta<typeof ReleaseDraftCard> = {
  component: ReleaseDraftCard,
  title: 'release-notes/ReleaseDraftCard',
  args: {
    onOpen: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof ReleaseDraftCard>;

export const Generating: Story = {
  args: {
    title: 'Release notes',
    isGenerating: true,
  },
};

export const Ready: Story = {
  args: {
    title: 'Release notes · v2.5.0',
    subtitle: 'App Store · 4 changes',
    isGenerating: false,
  },
};

export const ReadyWithoutVersion: Story = {
  args: {
    title: 'Release notes',
    isGenerating: false,
  },
};
