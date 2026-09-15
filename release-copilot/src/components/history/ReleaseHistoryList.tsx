import { useState } from 'react';
import { Search } from 'lucide-react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Input from '@/components/common/Input.tsx';
import ReleaseHistoryListItem from './ReleaseHistoryListItem.tsx';
import type { ReleaseSummary } from '@/types/release.ts';

interface ReleaseHistoryListProps {
  releases: ReleaseSummary[];
  selectedReleaseId: string;
  onSelectRelease: (id: string) => void;
}

const ReleaseHistoryList = ({
  releases,
  selectedReleaseId,
  onSelectRelease,
}: ReleaseHistoryListProps) => {
  const [search, setSearch] = useState('');
  const filteredReleases = releases.filter(
    (release) =>
      release.title.toLowerCase().includes(search.toLowerCase()) ||
      release.version.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card
      emphasis={CardEmphasis.Outlined}
      className="flex h-full flex-col overflow-hidden"
    >
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search versions..."
        icon={<Search className="size-4" />}
      />
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {filteredReleases.map((release) => (
            <ReleaseHistoryListItem
              key={release.id}
              release={release}
              isLatest={release.id === releases[0]?.id}
              isSelected={release.id === selectedReleaseId}
              onSelect={onSelectRelease}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ReleaseHistoryList;
