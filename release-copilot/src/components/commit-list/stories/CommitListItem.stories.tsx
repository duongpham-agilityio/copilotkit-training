import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import CommitListItem from '../CommitListItem.tsx';
import { CommitType, type Commit } from '@/types/commit.ts';

const meta: Meta<typeof CommitListItem> = {
  component: CommitListItem,
  title: 'commit-list/CommitListItem',
};

export default meta;

type Story = StoryObj<typeof CommitListItem>;

const COMMITS: Record<CommitType, Commit> = {
  [CommitType.Feat]: {
    hash: 'a1b2c3d4e5f6',
    type: CommitType.Feat,
    message: 'feat: add PlatformTabs component',
    author: 'Duong Pham',
    timestamp: '2026-08-13T09:00:00Z',
  },
  [CommitType.Fix]: {
    hash: 'b2c3d4e5f6a1',
    type: CommitType.Fix,
    message: 'fix: appstore-char-limit truncation',
    author: 'Duong Pham',
    timestamp: '2026-08-13T09:05:00Z',
  },
  [CommitType.Chore]: {
    hash: 'c3d4e5f6a1b2',
    type: CommitType.Chore,
    message: 'chore: bump eslint config',
    author: 'Duong Pham',
    timestamp: '2026-08-13T09:10:00Z',
  },
};

const CommitListItemStory = ({ commit }: { commit: Commit }) => {
  const [selected, setSelected] = useState(false);
  return (
    <CommitListItem
      commit={commit}
      selected={selected}
      onToggle={() => setSelected((current) => !current)}
    />
  );
};

export const Feat: Story = {
  render: () => <CommitListItemStory commit={COMMITS[CommitType.Feat]} />,
};

export const Fix: Story = {
  render: () => <CommitListItemStory commit={COMMITS[CommitType.Fix]} />,
};

export const Chore: Story = {
  render: () => <CommitListItemStory commit={COMMITS[CommitType.Chore]} />,
};
