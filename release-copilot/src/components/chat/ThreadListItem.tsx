import { cn } from '@/lib/cn.ts';
import type { ThreadSummary } from '@/types/thread.ts';

interface ThreadListItemProps {
  thread: ThreadSummary;
  isActive: boolean;
  time?: string;
  onSelect: (threadId: string) => void;
}

const ThreadListItem = ({ thread, isActive, time, onSelect }: ThreadListItemProps) => {
  const handleClick = () => onSelect(thread.id);

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'text-label-sm flex h-8.5 w-full items-center gap-2 rounded-lg px-2.5 text-left',
          isActive
            ? 'bg-surface-container-lowest text-on-surface ring-outline-variant font-semibold shadow-sm ring-1'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
        )}
      >
        <span className="flex-1 truncate">{thread.title || thread.id}</span>
        {time && (
          <span className="text-label-sm text-on-surface-variant shrink-0">{time}</span>
        )}
      </button>
    </li>
  );
};

export default ThreadListItem;
