import type { Meta, StoryObj } from '@storybook/react-vite';
import Button, { ButtonVariant } from '../Button.tsx';

const meta: Meta<typeof Button> = {
  component: Button,
  title: 'common/Button',
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: ButtonVariant.Primary,
    children: 'Primary',
  },
};

export const Secondary: Story = {
  args: { variant: ButtonVariant.Secondary, children: 'Secondary' },
};

export const Ghost: Story = {
  args: {
    variant: ButtonVariant.Ghost,
    children: 'Ghost',
  },
};

export const Danger: Story = {
  args: { variant: ButtonVariant.Danger, children: 'Delete' },
};

export const Disabled: Story = {
  args: {
    variant: ButtonVariant.Primary,
    children: 'Disabled',
    disabled: true,
  },
};
