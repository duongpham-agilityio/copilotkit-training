import type { Meta, StoryObj } from '@storybook/react-vite';
import IconButton, { IconButtonSize } from '../IconButton.tsx';

const meta: Meta<typeof IconButton> = {
  component: IconButton,
  title: 'common/IconButton',
};

export default meta;

type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  args: { icon: <span>×</span>, 'aria-label': 'Close' },
};

export const Small: Story = {
  args: { icon: <span>×</span>, 'aria-label': 'Close', size: IconButtonSize.Sm },
};

export const Large: Story = {
  args: { icon: <span>×</span>, 'aria-label': 'Close', size: IconButtonSize.Lg },
};

export const Active: Story = {
  args: { icon: <span>×</span>, 'aria-label': 'Close', isActive: true },
};

export const Disabled: Story = {
  args: { icon: <span>×</span>, 'aria-label': 'Close', disabled: true },
};
