import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listReleaseHistory } from '@/services/list-release-history.ts';
import { formatReleaseDateDisplay } from '@/lib/release-notes/release-title.ts';
import type { ReleaseHistoryRecord } from '@/types/release-history-record.ts';
import type { ReleaseSummary } from '@/types/release.ts';
import { KnownPlatformId } from '@/types/platform.ts';

const RELEASE_HISTORY_QUERY_KEY = ['release-history'];

const mapRecordToReleaseSummary = (
  record: ReleaseHistoryRecord,
): ReleaseSummary => ({
  id: record.id,
  version: record.version,
  status: record.status,
  title: record.title,
  date: formatReleaseDateDisplay(record.releaseDate),
  featCount: record.featCount,
  fixCount: record.fixCount,
});

const mapRecordToMarkdown = (
  record: ReleaseHistoryRecord,
  platform: KnownPlatformId,
): string | null => {
  switch (platform) {
    case KnownPlatformId.Github:
      return record.github;
    case KnownPlatformId.AppStore:
      return record.appStore;
    case KnownPlatformId.GooglePlay:
      return record.googlePlay;
  }
};

interface UseReleaseHistoryResult {
  releases: ReleaseSummary[] | undefined;
  selectedRelease: ReleaseSummary | undefined;
  selectedReleaseId: string;
  activePlatform: KnownPlatformId;
  markdown: string | null;
  isReleasesLoading: boolean;
  isReleasesError: boolean;
  selectRelease: (id: string) => void;
  setActivePlatform: (platform: KnownPlatformId) => void;
}

export const useReleaseHistory = (): UseReleaseHistoryResult => {
  const [selectedReleaseId, setSelectedReleaseId] = useState('');
  const [activePlatform, setActivePlatform] = useState<KnownPlatformId>(
    KnownPlatformId.AppStore,
  );

  const {
    data,
    isLoading: isReleasesLoading,
    isError: isReleasesError,
  } = useQuery({
    queryKey: RELEASE_HISTORY_QUERY_KEY,
    queryFn: () => listReleaseHistory(),
  });

  const effectiveReleaseId = data?.releases.some(
    (release) => release.id === selectedReleaseId,
  )
    ? selectedReleaseId
    : (data?.releases[0]?.id ?? '');

  const selectedRecord = data?.releases.find(
    (release) => release.id === effectiveReleaseId,
  );

  return {
    releases: data?.releases.map(mapRecordToReleaseSummary),
    selectedRelease: selectedRecord
      ? mapRecordToReleaseSummary(selectedRecord)
      : undefined,
    selectedReleaseId: effectiveReleaseId,
    activePlatform,
    markdown: selectedRecord
      ? mapRecordToMarkdown(selectedRecord, activePlatform)
      : null,
    isReleasesLoading,
    isReleasesError,
    selectRelease: setSelectedReleaseId,
    setActivePlatform,
  };
};
