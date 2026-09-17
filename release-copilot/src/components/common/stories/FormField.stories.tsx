import type { Meta, StoryObj } from '@storybook/react-vite';
import FormField from '../FormField.tsx';
import Input from '../Input.tsx';
import PasswordInput from '../PasswordInput.tsx';

const meta: Meta<typeof FormField> = {
  component: FormField,
  title: 'common/FormField',
};

export default meta;

type Story = StoryObj<typeof FormField>;

export const Plain: Story = {
  render: () => (
    <FormField id="email" label="Email">
      <Input id="email" type="email" placeholder="you@example.com" />
    </FormField>
  ),
};

export const WithError: Story = {
  render: () => (
    <FormField id="password" label="Password" error="Password must be at least 8 characters">
      <PasswordInput id="password" placeholder="Password" />
    </FormField>
  ),
};
