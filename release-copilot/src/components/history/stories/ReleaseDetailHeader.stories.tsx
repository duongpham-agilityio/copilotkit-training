import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseDetailHeader from '../ReleaseDetailHeader.tsx';
import { ReleaseStatus, type ReleaseSummary } from '@/types/release.ts';
import { KnownPlatformId } from '@/types/platform.ts';

const meta: Meta<typeof ReleaseDetailHeader> = {
  component: ReleaseDetailHeader,
  title: 'history/ReleaseDetailHeader',
};

export default meta;

type Story = StoryObj<typeof ReleaseDetailHeader>;

const RELEASE: ReleaseSummary = {
  version: 'v2.4.0',
  status: ReleaseStatus.Published,
  title: 'Custom commit types',
  date: '2026-08-13',
  featCount: 4,
  fixCount: 2,
};

export const Default: Story = {
  args: {
    release: RELEASE,
    activePlatform: KnownPlatformId.AppStore,
    onPlatformChange: () => {},
    onCopy: () => {},
    onSendToSlack: () => true,
  },
};
