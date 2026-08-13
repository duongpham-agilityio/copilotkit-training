import type { Meta, StoryObj } from '@storybook/react-vite';
import Badge, { BadgeVariant } from '../Badge.tsx';

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: 'common/Badge',
};

export default meta;

type Story = StoryObj<typeof Badge>;

export const Success: Story = {
  args: { variant: BadgeVariant.Success, children: 'feat' },
};

export const Error: Story = {
  args: { variant: BadgeVariant.Error, children: 'fix' },
};

export const Warning: Story = {
  args: { variant: BadgeVariant.Warning, children: 'draft' },
};

export const Neutral: Story = {
  args: { variant: BadgeVariant.Neutral, children: 'chore' },
};
