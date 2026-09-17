import type { Meta, StoryObj } from '@storybook/react-vite';
import { Inbox } from 'lucide-react';
import EmptyState from '../EmptyState.tsx';
import Button from '../Button.tsx';

const meta: Meta<typeof EmptyState> = {
  component: EmptyState,
  title: 'common/EmptyState',
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const TitleOnly: Story = {
  args: {
    icon: <Inbox className="size-5" />,
    title: 'No releases found',
  },
};

export const WithDescriptionAndAction: Story = {
  args: {
    icon: <Inbox className="size-5" />,
    title: 'Nothing archived yet',
    description: 'Releases you archive will show up here.',
    action: <Button>Create a release</Button>,
  },
};
