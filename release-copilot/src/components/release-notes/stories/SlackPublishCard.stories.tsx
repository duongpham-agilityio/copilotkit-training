import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SlackPublishCard, {
  SlackPublishStatus,
  type PublishOption,
} from '../SlackPublishCard.tsx';
import { KnownPlatformId } from '@/types/platform.ts';

const meta: Meta<typeof SlackPublishCard> = {
  component: SlackPublishCard,
  title: 'release-notes/SlackPublishCard',
};

export default meta;

type Story = StoryObj<typeof SlackPublishCard>;

const SAMPLE_OPTIONS: PublishOption[] = [
  {
    platformId: KnownPlatformId.Github,
    label: 'GitHub',
    content: `## Features

- ✨ Add JSON export for release drafts \`a1b2c3d\`

## Fixes

- 🐛 Correct App Store character count \`e4f5g6h\`
`,
  },
  {
    platformId: KnownPlatformId.AppStore,
    label: 'App Store',
    content: `New:
- JSON export for release drafts

Fixed:
- App Store character count
`,
  },
  {
    platformId: 'slack',
    label: 'Slack',
    content: `:sparkles: Add JSON export for release drafts\n:bug: Correct App Store character count`,
  },
];

const InteractiveCard = () => {
  const [platformId, setPlatformId] = useState(KnownPlatformId.Github);
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const selected =
    SAMPLE_OPTIONS.find((option) => option.platformId === platformId) ??
    SAMPLE_OPTIONS[0];

  return (
    <SlackPublishCard
      options={SAMPLE_OPTIONS}
      selectedPlatformId={selected.platformId}
      preview={selected.content}
      status={status}
      onPlatformChange={(value) => setPlatformId(value as KnownPlatformId)}
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
    options: SAMPLE_OPTIONS,
    selectedPlatformId: KnownPlatformId.Github,
    preview: SAMPLE_OPTIONS[0].content,
    status: SlackPublishStatus.Sending,
    onPlatformChange: () => {},
    onCopy: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};

export const Failed: Story = {
  args: {
    options: SAMPLE_OPTIONS,
    selectedPlatformId: KnownPlatformId.AppStore,
    preview: SAMPLE_OPTIONS[1].content,
    status: SlackPublishStatus.Failed,
    error: 'Slack rejected the message (404): no_service',
    onPlatformChange: () => {},
    onCopy: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};

export const Posted: Story = {
  args: {
    options: SAMPLE_OPTIONS,
    selectedPlatformId: KnownPlatformId.Github,
    preview: SAMPLE_OPTIONS[0].content,
    status: SlackPublishStatus.Sent,
    onPlatformChange: () => {},
    onCopy: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};
