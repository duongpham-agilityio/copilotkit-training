import type { Meta, StoryObj } from '@storybook/react-vite';
import IconButton from '../IconButton.tsx';
import { ButtonVariant } from '../Button.tsx';

const meta: Meta<typeof IconButton> = {
  component: IconButton,
  title: 'common/IconButton',
};

export default meta;

type Story = StoryObj<typeof IconButton>;

export const Ghost: Story = {
  args: { icon: <span>×</span>, 'aria-label': 'Close', variant: ButtonVariant.Ghost },
};

export const Primary: Story = {
  args: { icon: <span>×</span>, 'aria-label': 'Close', variant: ButtonVariant.Primary },
};

export const Disabled: Story = {
  args: { icon: <span>×</span>, 'aria-label': 'Close', disabled: true },
};
