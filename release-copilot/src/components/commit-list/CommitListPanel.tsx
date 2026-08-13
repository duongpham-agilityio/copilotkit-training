import { useMemo, useState } from 'react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Tabs, { TabsVariant, type TabItem } from '@/components/common/Tabs.tsx';
import CommitListItem from './CommitListItem.tsx';
import { type Commit, CommitType } from '@/types/commit.ts';

interface CommitListPanelProps {
  commits: Commit[];
  selectedHashes: Set<string>;
  onToggle: (hash: string) => void;
}

const FILTER_ALL = 'all';

const KNOWN_TYPE_LABEL: Record<CommitType, string> = {
  [CommitType.Feat]: 'Feat',
  [CommitType.Fix]: 'Fix',
  [CommitType.Chore]: 'Chore',
};

const filterLabelForType = (type: string): string =>
  (KNOWN_TYPE_LABEL as Record<string, string>)[type] ??
  `${type.charAt(0).toUpperCase()}${type.slice(1)}`;

const CommitListPanel = ({
  commits,
  selectedHashes,
  onToggle,
}: CommitListPanelProps) => {
  const [filter, setFilter] = useState<string>(FILTER_ALL);

  const filterItems = useMemo<TabItem[]>(() => {
    const types = Array.from(new Set(commits.map((commit) => commit.type)));
    return [
      { value: FILTER_ALL, label: 'All' },
      ...types.map((type) => ({ value: type, label: filterLabelForType(type) })),
    ];
  }, [commits]);

  const visibleCommits =
    filter === FILTER_ALL
      ? commits
      : commits.filter((commit) => commit.type === filter);

  return (
    <Card emphasis={CardEmphasis.Outlined}>
      <Card.Header>
        <div className="flex items-center justify-between gap-4">
          <span className="text-headline-md text-on-surface font-semibold">
            Parsed Commits
          </span>
          <Tabs
            items={filterItems}
            value={filter}
            onChange={setFilter}
            variant={TabsVariant.Pill}
          />
        </div>
      </Card.Header>
      <div className="flex flex-col gap-4">
        {visibleCommits.map((commit) => (
          <CommitListItem
            key={commit.hash}
            commit={commit}
            selected={selectedHashes.has(commit.hash)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </Card>
  );
};

export default CommitListPanel;
