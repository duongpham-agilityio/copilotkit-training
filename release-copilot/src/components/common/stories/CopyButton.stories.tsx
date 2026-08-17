import type { Meta, StoryObj } from '@storybook/react-vite';
import CopyButton from '../CopyButton.tsx';
import { ButtonVariant } from '../Button.tsx';

const meta: Meta<typeof CopyButton> = {
  component: CopyButton,
  title: 'common/CopyButton',
};

export default meta;

type Story = StoryObj<typeof CopyButton>;

export const Ghost: Story = {
  args: { variant: ButtonVariant.Ghost, onCopy: () => {} },
};

export const Secondary: Story = {
  args: { variant: ButtonVariant.Secondary, onCopy: () => {} },
};

export const Disabled: Story = {
  args: { variant: ButtonVariant.Ghost, onCopy: () => {}, disabled: true },
};
