import { useState } from 'react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Input from '@/components/common/Input.tsx';
import ReleaseHistoryListItem from './ReleaseHistoryListItem.tsx';
import type { ReleaseSummary } from '@/types/release.ts';

interface ReleaseHistoryListProps {
  releases: ReleaseSummary[];
  onSelectVersion: (version: string) => void;
}

const ReleaseHistoryList = ({
  releases,
  onSelectVersion,
}: ReleaseHistoryListProps) => {
  const [search, setSearch] = useState('');
  const filteredReleases = releases.filter((release) =>
    release.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card emphasis={CardEmphasis.Outlined}>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search releases..."
      />
      <div className="mt-4 flex flex-col gap-3">
        {filteredReleases.map((release) => (
          <ReleaseHistoryListItem
            key={release.version}
            release={release}
            onSelect={onSelectVersion}
          />
        ))}
      </div>
    </Card>
  );
};

export default ReleaseHistoryList;
