import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pencil, Trash2 } from 'lucide-react';
import DropdownMenu from '../DropdownMenu.tsx';
import Button from '../Button.tsx';

const meta: Meta<typeof DropdownMenu> = {
  component: DropdownMenu,
  title: 'common/DropdownMenu',
};

export default meta;

type Story = StoryObj<typeof DropdownMenu>;

export const Open: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <div className="relative">
        <Button onClick={() => setIsOpen((open) => !open)}>Actions</Button>
        <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <DropdownMenu.Item icon={<Pencil className="size-4" />} onClick={() => {}}>
            Rename
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            icon={<Trash2 className="size-4" />}
            danger
            onClick={() => {}}
          >
            Delete
          </DropdownMenu.Item>
        </DropdownMenu>
      </div>
    );
  },
};

export const AlignEnd: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <div className="relative flex justify-end">
        <Button onClick={() => setIsOpen((open) => !open)}>Actions</Button>
        <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)} align="end">
          <DropdownMenu.Item hint="⌘K" onClick={() => {}}>
            Search
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => {}}>Settings</DropdownMenu.Item>
        </DropdownMenu>
      </div>
    );
  },
};
