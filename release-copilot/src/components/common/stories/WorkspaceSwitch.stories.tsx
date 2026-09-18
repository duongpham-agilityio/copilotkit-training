import type { Meta, StoryObj } from '@storybook/react-vite';
import WorkspaceSwitch from '../WorkspaceSwitch.tsx';

const meta: Meta<typeof WorkspaceSwitch> = {
  component: WorkspaceSwitch,
  title: 'common/WorkspaceSwitch',
  args: {
    name: 'Release Builder',
    slug: 'acme/release-builder',
  },
};

export default meta;

type Story = StoryObj<typeof WorkspaceSwitch>;

export const Default: Story = {
  render: (args) => (
    <div className="w-68">
      <WorkspaceSwitch {...args} />
    </div>
  ),
};
