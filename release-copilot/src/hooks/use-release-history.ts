import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listReleaseHistory } from '@/services/list-release-history.ts';
import {
  formatReleaseDateDisplay,
  formatReleaseMonthDisplay,
  formatReleaseShortDateDisplay,
} from '@/lib/release-notes/release-title.ts';
import { groupReleaseHistoryByMonth } from '@/lib/release-notes/group-release-history-by-month.ts';
import type { ReleaseHistoryRecord } from '@/types/release-history-record.ts';
import {
  ReleaseHistoryFilter,
  ReleaseSendStatus,
  ReleaseStatus,
  type ReleaseHistoryGroup,
  type ReleaseHistoryItem,
} from '@/types/release.ts';
import { KnownPlatformId } from '@/types/platform.ts';

export const RELEASE_HISTORY_QUERY_KEY = ['release-history'];

interface PlatformContent {
  platformId: string;
  label: string;
  content: string | null;
}

// A stored release still carries three named platform bodies plus a
// `platforms` array; History lists one row per platform that has content.
// Send status is derived from the release status until History records a
// real per-platform "sent" flag.
const mapRecordToItems = (record: ReleaseHistoryRecord): ReleaseHistoryItem[] => {
  const {
    id,
    version,
    title,
    releaseDate,
    status,
    github,
    appStore,
    googlePlay,
    platforms,
  } = record;

  const platformContents: PlatformContent[] = [
    { platformId: KnownPlatformId.Github, label: 'GitHub', content: github },
    { platformId: KnownPlatformId.AppStore, label: 'App Store', content: appStore },
    { platformId: KnownPlatformId.GooglePlay, label: 'Google Play', content: googlePlay },
    ...platforms.map(({ platform, label, content }) => ({
      platformId: platform,
      label,
      content,
    })),
  ];

  return platformContents.flatMap(({ platformId, label, content }) =>
    content
      ? [
          {
            id: `${id}:${platformId}`,
            version,
            title,
            platformId,
            platformLabel: label,
            sendStatus:
              status === ReleaseStatus.Published
                ? ReleaseSendStatus.Sent
                : ReleaseSendStatus.NotSent,
            date: formatReleaseDateDisplay(releaseDate),
            shortDate: formatReleaseShortDateDisplay(releaseDate),
            monthLabel: formatReleaseMonthDisplay(releaseDate),
            markdown: content,
          },
        ]
      : [],
  );
};

const matchesFilter = (item: ReleaseHistoryItem, filter: ReleaseHistoryFilter): boolean => {
  switch (filter) {
    case ReleaseHistoryFilter.All:
      return true;
    case ReleaseHistoryFilter.Sent:
      return item.sendStatus === ReleaseSendStatus.Sent;
    case ReleaseHistoryFilter.NotSent:
      return item.sendStatus === ReleaseSendStatus.NotSent;
  }
};

const matchesQuery = (item: ReleaseHistoryItem, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const { version, title, platformLabel } = item;
  return `${version} ${title} ${platformLabel}`.toLowerCase().includes(normalizedQuery);
};

interface UseReleaseHistoryResult {
  groups: ReleaseHistoryGroup[];
  selectedItem: ReleaseHistoryItem | undefined;
  selectedItemId: string;
  latestItemId: string | undefined;
  totalCount: number;
  filteredCount: number;
  query: string;
  filter: ReleaseHistoryFilter;
  isLoading: boolean;
  isError: boolean;
  selectItem: (id: string) => void;
  setQuery: (query: string) => void;
  setFilter: (filter: ReleaseHistoryFilter) => void;
  clearFilters: () => void;
}

export const useReleaseHistory = (): UseReleaseHistoryResult => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReleaseHistoryFilter>(ReleaseHistoryFilter.All);

  const { data, isLoading, isError } = useQuery({
    queryKey: RELEASE_HISTORY_QUERY_KEY,
    queryFn: () => listReleaseHistory(),
  });

  const items = data?.releases.flatMap(mapRecordToItems) ?? [];
  const filteredItems = items.filter(
    (item) => matchesFilter(item, filter) && matchesQuery(item, query),
  );

  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? items.at(0);

  return {
    groups: groupReleaseHistoryByMonth(filteredItems),
    selectedItem,
    selectedItemId: selectedItem?.id ?? '',
    latestItemId: items.at(0)?.id,
    totalCount: items.length,
    filteredCount: filteredItems.length,
    query,
    filter,
    isLoading,
    isError,
    selectItem: setSelectedItemId,
    setQuery,
    setFilter,
    clearFilters: () => {
      setQuery('');
      setFilter(ReleaseHistoryFilter.All);
    },
  };
};
