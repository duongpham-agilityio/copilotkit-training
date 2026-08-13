import type { Meta, StoryObj } from '@storybook/react-vite';
import type { UserMessage } from '@ag-ui/core';
import UserMessageBubble from '../UserMessageBubble.tsx';

const sampleMessage: UserMessage = {
  id: 'user-1',
  role: 'user',
  content:
    'Yes, but group the biometric auth changes together and make it sound user-friendly, not too technical.',
};

const meta: Meta<typeof UserMessageBubble> = {
  component: UserMessageBubble,
  title: 'chat/UserMessageBubble',
};

export default meta;

type Story = StoryObj<typeof UserMessageBubble>;

export const Default: Story = {
  args: { message: sampleMessage },
};
