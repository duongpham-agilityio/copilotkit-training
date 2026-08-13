import type { Meta, StoryObj } from '@storybook/react-vite';
import Avatar, { AvatarSize } from '../Avatar.tsx';

const meta: Meta<typeof Avatar> = {
  component: Avatar,
  title: 'common/Avatar',
};

export default meta;

type Story = StoryObj<typeof Avatar>;

export const InitialMd: Story = {
  args: { name: 'Ada Lovelace', size: AvatarSize.Md },
};

export const InitialSm: Story = {
  args: { name: 'Ada Lovelace', size: AvatarSize.Sm },
};

export const PhotoMd: Story = {
  args: { name: 'Ada Lovelace', src: 'https://placekitten.com/64/64', size: AvatarSize.Md },
};
