import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, X } from 'lucide-react';
import Input from '../Input.tsx';

const meta: Meta<typeof Input> = {
  component: Input,
  title: 'common/Input',
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Plain: Story = {
  args: { placeholder: 'Search releases...' },
};

export const WithIcon: Story = {
  args: {
    placeholder: 'Search releases...',
    icon: <Search className="h-4 w-4" />,
  },
};

export const WithRightSlot: Story = {
  args: {
    placeholder: 'Search releases...',
    rightSlot: <X className="h-4 w-4" />,
  },
};
