import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ToastViewport from '../ToastViewport.tsx';
import { useToastStore, ToastKind } from '@/store/toast-store.ts';

const meta: Meta<typeof ToastViewport> = {
  component: ToastViewport,
  title: 'common/ToastViewport',
};

export default meta;

type Story = StoryObj<typeof ToastViewport>;

export const Mounted: Story = {
  render: () => {
    const showToast = useToastStore((state) => state.showToast);

    useEffect(() => {
      showToast({ kind: ToastKind.Success, title: 'Release notes published' });
    }, [showToast]);

    return <ToastViewport />;
  },
};
