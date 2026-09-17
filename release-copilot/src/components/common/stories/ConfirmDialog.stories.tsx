import type { Meta, StoryObj } from '@storybook/react-vite';
import { Trash2 } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog.tsx';

const meta: Meta<typeof ConfirmDialog> = {
  component: ConfirmDialog,
  title: 'common/ConfirmDialog',
};

export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

export const Open: Story = {
  args: {
    isOpen: true,
    icon: <Trash2 className="size-5" />,
    title: 'Delete thread?',
    description: 'This will permanently delete this thread and its messages.',
    confirmLabel: 'Delete',
    onConfirm: () => {},
    onCancel: () => {},
  },
};
