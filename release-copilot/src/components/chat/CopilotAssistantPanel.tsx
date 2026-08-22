import { forwardRef, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CopilotChat,
  useConfigureSuggestions,
  type CopilotChatAssistantMessage,
  type CopilotChatUserMessage,
} from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { COPILOTKIT_RESOURCE_ID } from '@/constants/copilotkit.ts';
import { useClickOutside } from '@/hooks/use-click-outside.ts';
import { THREADS_QUERY_KEY, useThreads } from '@/hooks/use-threads.ts';
import { useThreadStore } from '@/hooks/use-thread-store.ts';
import { createUUID } from '@/lib/uuid.ts';
import type { ThreadSummary } from '@/types/thread.ts';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
import ThreadListDropdown from './ThreadListDropdown.tsx';
import UserMessageBubble from './UserMessageBubble.tsx';

const QUICK_ACTION_SUGGESTIONS = [
  { title: 'Make it shorter', message: 'Make it shorter' },
  { title: 'Translate to VI', message: 'Translate to VI' },
  { title: 'Add emojis', message: 'Add emojis' },
];

// TODO: Will add custom suggestion view later
const HideSuggestionView = forwardRef(function Component() {
  return null;
});

const CopilotAssistantPanel = () => {
  const threadId = useThreadStore((state) => state.threadId);
  const setThreadId = useThreadStore((state) => state.setThreadId);
  const [isThreadListOpen, setIsThreadListOpen] = useState(false);
  const {
    data: threads,
    isLoading: isThreadsLoading,
    isError: isThreadsError,
  } = useThreads();
  const queryClient = useQueryClient();

  const handleNewChat = () => setThreadId(createUUID());
  const handleToggleThreadList = () => setIsThreadListOpen((open) => !open);
  const handleCloseThreadList = () => setIsThreadListOpen(false);
  const handleSelectThread = (selectedThreadId: string) => {
    setThreadId(selectedThreadId);
    setIsThreadListOpen(false);
  };

  const threadListRef = useClickOutside<HTMLSpanElement>(
    isThreadListOpen,
    handleCloseThreadList,
  );

  // The active thread may not exist server-side yet (no message sent, title
  // not generated) — seed a placeholder so the list never shows nothing for it.
  useEffect(() => {
    if (!threadId) return;

    queryClient.setQueryData<ThreadSummary[]>(THREADS_QUERY_KEY, (current) => {
      if (current?.some((thread) => thread.id === threadId)) return current;

      const now = new Date().toISOString();
      return [
        {
          id: threadId,
          title: threadId,
          resourceId: COPILOTKIT_RESOURCE_ID,
          createdAt: now,
          updatedAt: now,
        },
        ...(current ?? []),
      ];
    });
  }, [threadId, queryClient]);

  useConfigureSuggestions({
    consumerAgentId: RELEASE_COPILOT_AGENT_ID,
    suggestions: QUICK_ACTION_SUGGESTIONS,
    available: 'always',
  });

  return (
    <div className="bg-surface-container-lowest border-outline-variant flex h-full w-full flex-col border-l">
      <div className="border-outline-variant flex shrink-0 items-center justify-between border-b px-4 py-4">
        <span className="flex items-center gap-2">
          <span
            className="bg-success-emerald size-3 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <span className="text-headline-md text-on-surface">
            Copilot Assistant
          </span>
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="text-label-sm rounded border px-2 py-1"
          >
            New Chat
          </button>
          <span ref={threadListRef} className="relative">
            <button
              type="button"
              onClick={handleToggleThreadList}
              className="text-label-sm rounded border px-2 py-1"
            >
              List chats
            </button>
            {isThreadListOpen && (
              <ThreadListDropdown
                threads={threads}
                activeThreadId={threadId}
                isLoading={isThreadsLoading}
                isError={isThreadsError}
                onSelect={handleSelectThread}
              />
            )}
          </span>
        </span>
        {/* TODO: Re-open in the future */}
        {/* <button
          type="button"
          onClick={() => agent.setMessages([])}
          className="text-label-sm text-on-surface-variant hover:text-on-surface flex cursor-pointer items-center gap-1"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Clear
        </button> */}
      </div>
      <CopilotChat
        agentId={RELEASE_COPILOT_AGENT_ID}
        threadId={threadId}
        className="min-h-0 flex-1"
        welcomeScreen={false}
        labels={{ chatInputPlaceholder: 'Ask Copilot to refine notes...' }}
        messageView={{
          assistantMessage:
            AssistantMessageBubble as typeof CopilotChatAssistantMessage,
          userMessage: UserMessageBubble as typeof CopilotChatUserMessage,
          className: 'flex flex-row gap-4 py-4 h-full',
        }}
        suggestionView={HideSuggestionView}
      />
    </div>
  );
};

export default CopilotAssistantPanel;
