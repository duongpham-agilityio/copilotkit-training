import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AssistantMessage } from '@ag-ui/core';
import AssistantMessageBubble from '../AssistantMessageBubble.tsx';

const sampleMessage: AssistantMessage = {
  id: 'assistant-1',
  role: 'assistant',
  content:
    "I've analyzed the recent commits. There are 2 major features and 1 critical fix. Would you like me to draft the release notes for TestFlight?",
};

const meta: Meta<typeof AssistantMessageBubble> = {
  component: AssistantMessageBubble,
  title: 'chat/AssistantMessageBubble',
};

export default meta;

type Story = StoryObj<typeof AssistantMessageBubble>;

export const Default: Story = {
  args: { message: sampleMessage },
};
