import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseHistoryList from '../ReleaseHistoryList.tsx';
import { ReleaseHistoryFilter } from '@/types/release.ts';
import { APP_STORE_ITEM, GITHUB_ITEM, GOOGLE_PLAY_ITEM } from './fixtures.ts';

const meta: Meta<typeof ReleaseHistoryList> = {
  component: ReleaseHistoryList,
  title: 'history/ReleaseHistoryList',
};

export default meta;

type Story = StoryObj<typeof ReleaseHistoryList>;

const BASE_ARGS = {
  isLoading: false,
  selectedItemId: GITHUB_ITEM.id,
  latestItemId: APP_STORE_ITEM.id,
  query: '',
  filter: ReleaseHistoryFilter.All,
  onQueryChange: () => {},
  onFilterChange: () => {},
  onClearFilters: () => {},
  onSelectItem: () => {},
};

export const Default: Story = {
  args: {
    ...BASE_ARGS,
    groups: [
      { label: 'September 2026', items: [APP_STORE_ITEM, GITHUB_ITEM] },
      { label: 'August 2026', items: [GOOGLE_PLAY_ITEM] },
    ],
  },
};

export const NoResults: Story = {
  args: { ...BASE_ARGS, groups: [], query: 'v9' },
};

export const Loading: Story = {
  args: { ...BASE_ARGS, groups: [], isLoading: true },
};
