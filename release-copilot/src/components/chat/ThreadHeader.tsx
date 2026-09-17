import { useState } from 'react';
import { Download, Link2, MoreHorizontal, PanelRightOpen, Pencil, Pin, Trash2 } from 'lucide-react';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import DropdownMenu from '@/components/common/DropdownMenu.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import { cn } from '@/lib/cn.ts';

interface ThreadHeaderProps {
  title: string;
  isPreviewOpen: boolean;
  onTogglePreview: () => void;
}

// Rename / Pin thread / Copy link / Export notes / Delete thread have no
// backend action yet (no rename/pin/export/delete endpoint on a thread) —
// their menu items close the menu only, same "build the surface, defer the
// behavior" pattern already used for the sidebar's thread row.
const ThreadHeader = ({ title, isPreviewOpen, onTogglePreview }: ThreadHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="border-outline-subtle flex h-14 shrink-0 items-center justify-between gap-4 border-b pr-4 pl-6">
      <h1 className="text-body-md text-on-surface min-w-0 truncate font-semibold">{title}</h1>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant={ButtonVariant.Secondary}
          onClick={onTogglePreview}
          aria-pressed={isPreviewOpen}
          className={cn(
            'text-body-sm inline-flex h-8 items-center gap-1.5 rounded-lg px-3 py-0 font-semibold',
            isPreviewOpen &&
              'bg-primary-soft border-primary-soft-strong text-on-primary-soft hover:bg-primary-soft',
          )}
        >
          <PanelRightOpen className="size-3.75" />
          Preview
        </Button>
        <div className="relative">
          <IconButton
            icon={<MoreHorizontal className="size-4.25" />}
            aria-label="Thread options"
            onClick={() => setIsMenuOpen((open) => !open)}
          />
          <DropdownMenu isOpen={isMenuOpen} onClose={closeMenu} align="end" className="top-9">
            <DropdownMenu.Item icon={<Pencil className="size-4" />} hint="R" onClick={closeMenu}>
              Rename
            </DropdownMenu.Item>
            <DropdownMenu.Item icon={<Pin className="size-4" />} onClick={closeMenu}>
              Pin thread
            </DropdownMenu.Item>
            <DropdownMenu.Item icon={<Link2 className="size-4" />} onClick={closeMenu}>
              Copy link
            </DropdownMenu.Item>
            <DropdownMenu.Item icon={<Download className="size-4" />} onClick={closeMenu}>
              Export notes
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item icon={<Trash2 className="size-4" />} onClick={closeMenu} danger>
              Delete thread
            </DropdownMenu.Item>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default ThreadHeader;
