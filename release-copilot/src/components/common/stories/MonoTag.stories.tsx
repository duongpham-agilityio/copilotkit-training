import type { Meta, StoryObj } from '@storybook/react-vite';
import MonoTag from '../MonoTag.tsx';

const meta: Meta<typeof MonoTag> = {
  component: MonoTag,
  title: 'common/MonoTag',
};

export default meta;

type Story = StoryObj<typeof MonoTag>;

export const CommitHash: Story = {
  args: { children: 'a1b2c3d' },
};
