import { PanelLeftClose, Plus } from 'lucide-react';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import ThreadListItem from './ThreadListItem.tsx';

interface ThreadSidebarProps {
  onCollapse: () => void;
}

// useThreadSession() registers no CopilotKit primitive (see its own header
// comment), so calling it here AND in CopilotAssistantPanel is safe — no lifted
// state, no props threaded through DashboardPage.
const ThreadSidebar = ({ onCollapse }: ThreadSidebarProps) => {
  const {
    threadId,
    threads,
    isThreadsLoading,
    isThreadsError,
    startNewChat,
    selectThread,
  } = useThreadSession();

  return (
    <aside className="bg-surface-container-lowest border-outline-variant flex h-full w-full flex-col border-r">
      <div className="border-outline-variant flex shrink-0 items-center justify-between gap-2 border-b px-3 py-4">
        <span className="text-headline-md text-on-surface">Chats</span>
        <IconButton
          icon={<PanelLeftClose className="size-5" />}
          aria-label="Collapse thread sidebar"
          onClick={onCollapse}
        />
      </div>
      <div className="shrink-0 px-3 py-3">
        <Button
          variant={ButtonVariant.Secondary}
          onClick={startNewChat}
          className="flex w-full items-center justify-center gap-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          New thread
        </Button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto pb-3">
        {isThreadsLoading && (
          <li className="text-label-sm text-on-surface-variant px-3 py-2">
            Loading...
          </li>
        )}
        {isThreadsError && (
          <li className="text-label-sm text-error px-3 py-2">
            Failed to load threads.
          </li>
        )}
        {!isThreadsLoading && !isThreadsError && threads?.length === 0 && (
          <li className="text-label-sm text-on-surface-variant px-3 py-2">
            No threads yet.
          </li>
        )}
        {threads?.map((thread) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            isActive={thread.id === threadId}
            onSelect={selectThread}
          />
        ))}
      </ul>
    </aside>
  );
};

export default ThreadSidebar;
