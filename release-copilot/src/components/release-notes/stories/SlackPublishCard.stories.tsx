import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SlackPublishCard, { SlackPublishStatus } from '../SlackPublishCard.tsx';

const meta: Meta<typeof SlackPublishCard> = {
  component: SlackPublishCard,
  title: 'release-notes/SlackPublishCard',
};

export default meta;

type Story = StoryObj<typeof SlackPublishCard>;

const SAMPLE_LABEL = 'GitHub';
const SAMPLE_CONTENT = `## Features

- ✨ Add JSON export for release drafts \`a1b2c3d\`

## Fixes

- 🐛 Correct App Store character count \`e4f5g6h\`
`;

const InteractiveCard = () => {
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );

  return (
    <SlackPublishCard
      label={SAMPLE_LABEL}
      content={SAMPLE_CONTENT}
      status={status}
      onCopy={() => {}}
      onSend={() => setStatus(SlackPublishStatus.Sent)}
      onCancel={() => setStatus(SlackPublishStatus.Cancelled)}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveCard />,
};

export const Sending: Story = {
  args: {
    label: SAMPLE_LABEL,
    content: SAMPLE_CONTENT,
    status: SlackPublishStatus.Sending,
    onCopy: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};

export const Failed: Story = {
  args: {
    label: SAMPLE_LABEL,
    content: SAMPLE_CONTENT,
    status: SlackPublishStatus.Failed,
    error: 'Slack rejected the message (404): no_service',
    onCopy: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};

export const Posted: Story = {
  args: {
    label: SAMPLE_LABEL,
    content: SAMPLE_CONTENT,
    status: SlackPublishStatus.Sent,
    onCopy: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};
