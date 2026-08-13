import type { Meta, StoryObj } from '@storybook/react-vite';
import SplitPane from '../SplitPane.tsx';

const meta: Meta<typeof SplitPane> = {
  component: SplitPane,
  title: 'layouts/SplitPane',
};

export default meta;

type Story = StoryObj<typeof SplitPane>;

const Placeholder = ({ label }: { label: string }) => (
  <div className="bg-surface-container text-on-surface-variant text-body-md rounded-xl p-6">
    {label}
  </div>
);

export const Default: Story = {
  args: {
    left: <Placeholder label="Left (65%)" />,
    right: <Placeholder label="Right (35%)" />,
  },
};

export const EvenSplit: Story = {
  args: {
    left: <Placeholder label="Left (50%)" />,
    right: <Placeholder label="Right (50%)" />,
    leftWidthPercent: 50,
  },
};
