import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseDetailHeader from '../ReleaseDetailHeader.tsx';
import { APP_STORE_ITEM, GITHUB_ITEM } from './fixtures.ts';

const meta: Meta<typeof ReleaseDetailHeader> = {
  component: ReleaseDetailHeader,
  title: 'history/ReleaseDetailHeader',
};

export default meta;

type Story = StoryObj<typeof ReleaseDetailHeader>;

const HANDLERS = {
  isSending: false,
  onSendToSlack: () => {},
  onExport: () => {},
  onCopy: () => {},
  onOpenInNewThread: () => {},
  onCopyLink: () => {},
  onRemove: () => {},
};

export const Sent: Story = {
  args: { item: GITHUB_ITEM, ...HANDLERS },
};

export const NotSent: Story = {
  args: { item: APP_STORE_ITEM, ...HANDLERS },
};

export const Sending: Story = {
  args: { item: APP_STORE_ITEM, ...HANDLERS, isSending: true },
};
