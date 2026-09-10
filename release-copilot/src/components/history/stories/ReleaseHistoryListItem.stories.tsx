import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseHistoryListItem from '../ReleaseHistoryListItem.tsx';
import { ReleaseStatus, type ReleaseSummary } from '@/types/release.ts';

const meta: Meta<typeof ReleaseHistoryListItem> = {
  component: ReleaseHistoryListItem,
  title: 'history/ReleaseHistoryListItem',
};

export default meta;

type Story = StoryObj<typeof ReleaseHistoryListItem>;

const RELEASES: Record<ReleaseStatus, ReleaseSummary> = {
  [ReleaseStatus.Published]: {
    version: 'v2.4.0',
    status: ReleaseStatus.Published,
    title: 'Custom commit types',
    date: '2026-08-13',
    featCount: 4,
    fixCount: 2,
  },
  [ReleaseStatus.Draft]: {
    version: 'v2.5.0',
    status: ReleaseStatus.Draft,
    title: 'History components',
    date: '2026-08-14',
    featCount: 3,
    fixCount: 0,
  },
  [ReleaseStatus.Archived]: {
    version: 'v2.3.0',
    status: ReleaseStatus.Archived,
    title: 'Base UI primitives',
    date: '2026-08-10',
    featCount: 6,
    fixCount: 1,
  },
};

export const Latest: Story = {
  args: {
    release: RELEASES[ReleaseStatus.Published],
    isLatest: true,
    onSelect: () => {},
  },
};

export const Published: Story = {
  args: {
    release: RELEASES[ReleaseStatus.Published],
    isLatest: false,
    onSelect: () => {},
  },
};

export const Draft: Story = {
  args: {
    release: RELEASES[ReleaseStatus.Draft],
    isLatest: false,
    onSelect: () => {},
  },
};

export const Archived: Story = {
  args: {
    release: RELEASES[ReleaseStatus.Archived],
    isLatest: false,
    onSelect: () => {},
  },
};
