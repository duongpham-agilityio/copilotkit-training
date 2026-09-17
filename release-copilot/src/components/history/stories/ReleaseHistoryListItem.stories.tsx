import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseHistoryListItem from '../ReleaseHistoryListItem.tsx';
import { APP_STORE_ITEM, GITHUB_ITEM } from './fixtures.ts';

const meta: Meta<typeof ReleaseHistoryListItem> = {
  component: ReleaseHistoryListItem,
  title: 'history/ReleaseHistoryListItem',
};

export default meta;

type Story = StoryObj<typeof ReleaseHistoryListItem>;

export const Latest: Story = {
  args: { item: APP_STORE_ITEM, isLatest: true, isSelected: false, onSelect: () => {} },
};

export const Selected: Story = {
  args: { item: GITHUB_ITEM, isLatest: false, isSelected: true, onSelect: () => {} },
};

export const Sent: Story = {
  args: { item: GITHUB_ITEM, isLatest: false, isSelected: false, onSelect: () => {} },
};

export const NotSent: Story = {
  args: { item: APP_STORE_ITEM, isLatest: false, isSelected: false, onSelect: () => {} },
};
