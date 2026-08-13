import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Checkbox from '../Checkbox.tsx';

const meta: Meta<typeof Checkbox> = {
  component: Checkbox,
  title: 'common/Checkbox',
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Unchecked: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return <Checkbox checked={checked} onChange={setChecked} aria-label="Select item" />;
  },
};

export const Checked: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return <Checkbox checked={checked} onChange={setChecked} aria-label="Select item" />;
  },
};
