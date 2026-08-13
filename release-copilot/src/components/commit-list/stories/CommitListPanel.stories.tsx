import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import CommitListPanel from '../CommitListPanel.tsx';
import { CommitType, type Commit } from '@/types/commit.ts';

const meta: Meta<typeof CommitListPanel> = {
  component: CommitListPanel,
  title: 'commit-list/CommitListPanel',
};

export default meta;

type Story = StoryObj<typeof CommitListPanel>;

const COMMITS: Commit[] = [
  {
    hash: 'a1b2c3d4e5f6',
    type: CommitType.Feat,
    message: 'feat: add PlatformTabs component',
    author: 'Duong Pham',
    timestamp: '2026-08-13T09:00:00Z',
  },
  {
    hash: 'b2c3d4e5f6a1',
    type: CommitType.Fix,
    message: 'fix: appstore-char-limit truncation',
    author: 'Duong Pham',
    timestamp: '2026-08-13T09:05:00Z',
  },
  {
    hash: 'c3d4e5f6a1b2',
    type: CommitType.Chore,
    message: 'chore: bump eslint config',
    author: 'Duong Pham',
    timestamp: '2026-08-13T09:10:00Z',
  },
  {
    hash: 'd4e5f6a1b2c3',
    type: CommitType.Feat,
    message: 'feat: add CommitListItem component',
    author: 'Duong Pham',
    timestamp: '2026-08-13T09:15:00Z',
  },
];

const COMMITS_WITH_CUSTOM_TYPE: Commit[] = [
  ...COMMITS,
  {
    hash: 'e5f6a1b2c3d4',
    type: 'hotfix',
    message: 'hotfix: patch release pipeline crash',
    author: 'Duong Pham',
    timestamp: '2026-08-13T09:20:00Z',
  },
];

const CommitListPanelStory = ({ commits }: { commits: Commit[] }) => {
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(
    new Set(),
  );
  const handleToggle = (hash: string) => {
    setSelectedHashes((current) => {
      const next = new Set(current);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });
  };
  return (
    <CommitListPanel
      commits={commits}
      selectedHashes={selectedHashes}
      onToggle={handleToggle}
    />
  );
};

export const Default: Story = {
  render: () => <CommitListPanelStory commits={COMMITS} />,
};

export const CustomType: Story = {
  render: () => <CommitListPanelStory commits={COMMITS_WITH_CUSTOM_TYPE} />,
};
