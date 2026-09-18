import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseDetailBody from '../ReleaseDetailBody.tsx';
import { APP_STORE_ITEM, GITHUB_ITEM, GOOGLE_PLAY_ITEM } from './fixtures.ts';

const meta: Meta<typeof ReleaseDetailBody> = {
  component: ReleaseDetailBody,
  title: 'history/ReleaseDetailBody',
};

export default meta;

type Story = StoryObj<typeof ReleaseDetailBody>;

export const SectionsWithHashes: Story = {
  args: { markdown: GITHUB_ITEM.markdown },
};

export const BulletsWithoutHeading: Story = {
  args: { markdown: APP_STORE_ITEM.markdown },
};

export const PlainTextFallback: Story = {
  args: { markdown: GOOGLE_PLAY_ITEM.markdown },
};
