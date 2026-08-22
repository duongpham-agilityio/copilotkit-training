import { cn } from '@/lib/cn.ts';
import type { ThreadSummary } from '@/types/thread.ts';

interface ThreadListItemProps {
  thread: ThreadSummary;
  isActive: boolean;
  onSelect: (threadId: string) => void;
}

const ThreadListItem = ({ thread, isActive, onSelect }: ThreadListItemProps) => {
  const handleClick = () => onSelect(thread.id);

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'text-label-sm hover:bg-surface-container w-full truncate px-3 py-2 text-left',
          isActive && 'bg-primary/10 text-primary font-medium',
        )}
      >
        {thread.title || thread.id}
      </button>
    </li>
  );
};

export default ThreadListItem;
