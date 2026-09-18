import type { Meta, StoryObj } from '@storybook/react-vite';
import PasswordInput from '../PasswordInput.tsx';

const meta: Meta<typeof PasswordInput> = {
  component: PasswordInput,
  title: 'common/PasswordInput',
};

export default meta;

type Story = StoryObj<typeof PasswordInput>;

export const Plain: Story = {
  args: { placeholder: 'Password' },
};

export const WithValue: Story = {
  args: { placeholder: 'Password', defaultValue: 'hunter2' },
};
