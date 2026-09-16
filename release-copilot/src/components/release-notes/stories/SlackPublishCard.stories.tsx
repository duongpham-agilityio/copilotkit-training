import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SlackPublishCard, { SlackPublishStatus } from '../SlackPublishCard.tsx';

const meta: Meta<typeof SlackPublishCard> = {
  component: SlackPublishCard,
  title: 'release-notes/SlackPublishCard',
};

export default meta;

type Story = StoryObj<typeof SlackPublishCard>;

const InteractiveCard = () => {
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );

  return (
    <SlackPublishCard
      status={status}
      onSubmit={() => setStatus(SlackPublishStatus.Sent)}
      onCancel={() => setStatus(SlackPublishStatus.Cancelled)}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveCard />,
};

export const Sending: Story = {
  args: {
    status: SlackPublishStatus.Sending,
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const Failed: Story = {
  args: {
    status: SlackPublishStatus.Failed,
    error: 'Slack rejected the message (404): no_service',
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const Posted: Story = {
  args: {
    status: SlackPublishStatus.Sent,
    onSubmit: () => {},
    onCancel: () => {},
  },
};
