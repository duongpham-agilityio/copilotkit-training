import type { Meta, StoryObj } from '@storybook/react-vite';
import Toast from '../Toast.tsx';
import { ToastKind } from '@/store/toast-store.ts';

const meta: Meta<typeof Toast> = {
  component: Toast,
  title: 'common/Toast',
};

export default meta;

type Story = StoryObj<typeof Toast>;

export const Success: Story = {
  args: {
    toast: { id: '1', kind: ToastKind.Success, title: 'Release notes published' },
    onDismiss: () => {},
  },
};

export const Progress: Story = {
  args: {
    toast: { id: '2', kind: ToastKind.Progress, title: 'Publishing to Slack...' },
    onDismiss: () => {},
  },
};

export const Warning: Story = {
  args: {
    toast: {
      id: '3',
      kind: ToastKind.Warning,
      title: 'Draft has unresolved commits',
      description: 'Review before publishing.',
    },
    onDismiss: () => {},
  },
};

export const ErrorVariant: Story = {
  name: 'Error',
  args: {
    toast: { id: '4', kind: ToastKind.Error, title: 'Failed to publish to Slack' },
    onDismiss: () => {},
  },
};

export const WithAction: Story = {
  args: {
    toast: {
      id: '5',
      kind: ToastKind.Success,
      title: 'Thread deleted',
      actionLabel: 'Undo',
      onAction: () => {},
    },
    onDismiss: () => {},
  },
};
