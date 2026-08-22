import type { ThreadSummary } from '@/types/thread.ts';
import ThreadListItem from './ThreadListItem.tsx';

interface ThreadListDropdownProps {
  threads: ThreadSummary[] | undefined;
  activeThreadId: string;
  isLoading: boolean;
  isError: boolean;
  onSelect: (threadId: string) => void;
}

const ThreadListDropdown = ({
  threads,
  activeThreadId,
  isLoading,
  isError,
  onSelect,
}: ThreadListDropdownProps) => (
  <ul className="bg-surface border-outline-variant absolute top-full right-0 z-10 mt-1 max-h-64 w-56 overflow-y-auto rounded border shadow-lg">
    {isLoading && (
      <li className="text-label-sm text-on-surface-variant px-3 py-2">
        Loading...
      </li>
    )}
    {isError && (
      <li className="text-label-sm text-error px-3 py-2">
        Failed to load threads.
      </li>
    )}
    {!isLoading && !isError && threads?.length === 0 && (
      <li className="text-label-sm text-on-surface-variant px-3 py-2">
        No threads yet.
      </li>
    )}
    {threads?.map((thread) => (
      <ThreadListItem
        key={thread.id}
        thread={thread}
        isActive={thread.id === activeThreadId}
        onSelect={onSelect}
      />
    ))}
  </ul>
);

export default ThreadListDropdown;
