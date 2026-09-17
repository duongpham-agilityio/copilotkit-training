import { useState } from 'react';
import { MoreHorizontal, Pencil, Pin, Trash2 } from 'lucide-react';
import DropdownMenu from '@/components/common/DropdownMenu.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import { cn } from '@/lib/cn.ts';
import type { ThreadSummary } from '@/types/thread.ts';

interface ThreadListItemProps {
  thread: ThreadSummary;
  isActive: boolean;
  time?: string;
  onSelect: (threadId: string) => void;
}

// Rename / Pin thread / Delete have no backend action yet (no rename/pin/
// delete endpoint on a thread) — their menu items close the menu only, same
// "build the surface, defer the behavior" pattern already used for
// ThreadHeader's options menu.
const ThreadListItem = ({ thread, isActive, time, onSelect }: ThreadListItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <li>
      <div
        className={cn(
          'group/thread flex h-8.5 items-center gap-2 rounded-lg pr-1 pl-2.5',
          isActive
            ? 'bg-surface-container-lowest ring-outline-subtle shadow-sm ring-1'
            : 'hover:bg-surface-container',
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(thread.id)}
          aria-current={isActive ? 'true' : undefined}
          className={cn(
            'text-body-sm min-w-0 flex-1 cursor-pointer truncate text-left',
            isActive
              ? 'text-on-surface font-semibold'
              : 'text-on-surface-variant group-hover/thread:text-on-surface',
          )}
        >
          {thread.title || thread.id}
        </button>

        {!isActive && time && (
          <span
            className={cn(
              'text-label-xs text-on-surface-muted shrink-0 pr-1.5 font-normal',
              isMenuOpen ? 'hidden' : 'group-hover/thread:hidden',
            )}
          >
            {time}
          </span>
        )}

        <div className="relative shrink-0">
          <IconButton
            icon={<MoreHorizontal className="size-3.75" />}
            aria-label="Thread actions"
            isActive={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className={cn(
              'size-6 rounded-md',
              isActive || isMenuOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover/thread:opacity-100',
            )}
          />
          <DropdownMenu isOpen={isMenuOpen} onClose={closeMenu} align="end" className="top-7 w-49">
            <DropdownMenu.Item icon={<Pencil className="size-3.75" />} onClick={closeMenu}>
              Rename
            </DropdownMenu.Item>
            <DropdownMenu.Item icon={<Pin className="size-3.75" />} onClick={closeMenu}>
              Pin thread
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item icon={<Trash2 className="size-3.75" />} onClick={closeMenu} danger>
              Delete
            </DropdownMenu.Item>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
};

export default ThreadListItem;
