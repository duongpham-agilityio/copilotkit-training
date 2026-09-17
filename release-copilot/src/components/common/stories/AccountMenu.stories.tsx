import type { Meta, StoryObj } from '@storybook/react-vite';
import AccountMenu from '../AccountMenu.tsx';

const meta: Meta<typeof AccountMenu> = {
  component: AccountMenu,
  title: 'common/AccountMenu',
  args: {
    userName: 'Duong Pham',
    onSignOut: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof AccountMenu>;

export const Default: Story = {
  render: (args) => (
    <div className="bg-surface-container-lowest w-68 rounded-lg pt-16 pb-2">
      <AccountMenu {...args} />
    </div>
  ),
};
