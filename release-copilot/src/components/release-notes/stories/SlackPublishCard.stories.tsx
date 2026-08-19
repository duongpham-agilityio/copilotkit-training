import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SlackPublishCard, {
  SlackPublishStatus,
} from '../SlackPublishCard.tsx';
import { Platform } from '@/types/platform.ts';

const meta: Meta<typeof SlackPublishCard> = {
  component: SlackPublishCard,
  title: 'release-notes/SlackPublishCard',
};

export default meta;

type Story = StoryObj<typeof SlackPublishCard>;

const SAMPLE_PREVIEW = `## Features

- ✨ Add JSON export for release drafts \`a1b2c3d\`

## Fixes

- 🐛 Correct App Store character count \`e4f5g6h\`
`;

const InteractiveCard = () => {
  const [platform, setPlatform] = useState<Platform>(Platform.Github);
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );

  return (
    <SlackPublishCard
      preview={SAMPLE_PREVIEW}
      platform={platform}
      status={status}
      onPlatformChange={setPlatform}
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
    preview: SAMPLE_PREVIEW,
    platform: Platform.Github,
    status: SlackPublishStatus.Sending,
    onPlatformChange: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};

export const Failed: Story = {
  args: {
    preview: SAMPLE_PREVIEW,
    platform: Platform.GooglePlay,
    status: SlackPublishStatus.Failed,
    error: 'Slack rejected the message (404): no_service',
    onPlatformChange: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};

export const Posted: Story = {
  args: {
    preview: SAMPLE_PREVIEW,
    platform: Platform.Github,
    status: SlackPublishStatus.Sent,
    onPlatformChange: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};
