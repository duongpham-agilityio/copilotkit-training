import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseHistoryList from '../ReleaseHistoryList.tsx';
import { ReleaseStatus, type ReleaseSummary } from '@/types/release.ts';

const meta: Meta<typeof ReleaseHistoryList> = {
  component: ReleaseHistoryList,
  title: 'history/ReleaseHistoryList',
};

export default meta;

type Story = StoryObj<typeof ReleaseHistoryList>;

const RELEASES: ReleaseSummary[] = [
  {
    version: 'v2.4.0',
    status: ReleaseStatus.Published,
    title: 'Custom commit types',
    date: '2026-08-13',
    featCount: 4,
    fixCount: 2,
  },
  {
    version: 'v2.5.0',
    status: ReleaseStatus.Draft,
    title: 'History components',
    date: '2026-08-14',
    featCount: 3,
    fixCount: 0,
  },
  {
    version: 'v2.3.0',
    status: ReleaseStatus.Archived,
    title: 'Base UI primitives',
    date: '2026-08-10',
    featCount: 6,
    fixCount: 1,
  },
];

export const Default: Story = {
  args: {
    releases: RELEASES,
    selectedVersion: RELEASES[0].version,
    onSelectVersion: () => {},
  },
};
