import { useEffect, useState } from 'react';
import {
  CopilotChat,
  useAgent,
  type CopilotChatAssistantMessage,
  type CopilotChatUserMessage,
} from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { useClickOutside } from '@/hooks/use-click-outside.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { useFlowSuggestions } from '@/hooks/use-flow-suggestions.ts';
import { useChatError } from '@/hooks/use-chat-error.ts';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
import ChatErrorBar from './ChatErrorBar.tsx';
import ThreadListDropdown from './ThreadListDropdown.tsx';
import UserMessageBubble from './UserMessageBubble.tsx';
import WelcomeScreen from './WelcomeScreen.tsx';

const CopilotAssistantPanel = () => {
  const {
    threadId,
    threads,
    isThreadsLoading,
    isThreadsError,
    startNewChat,
    selectThread,
  } = useThreadSession();
  const [isThreadListOpen, setIsThreadListOpen] = useState(false);

  const handleToggleThreadList = () => setIsThreadListOpen((open) => !open);
  const handleCloseThreadList = () => setIsThreadListOpen(false);
  const handleSelectThread = (selectedThreadId: string) => {
    selectThread(selectedThreadId);
    setIsThreadListOpen(false);
  };

  const threadListRef = useClickOutside<HTMLSpanElement>(
    isThreadListOpen,
    handleCloseThreadList,
  );

  useFlowSuggestions();

  const { agent } = useAgent({ agentId: RELEASE_COPILOT_AGENT_ID });

  useEffect(() => {
    return () => {
      agent.setMessages([]);
    };
  }, [agent]);

  const hasMessages = agent.messages.length > 0;
  const {
    message: chatErrorMessage,
    canRetry,
    retry,
    dismiss: dismissChatError,
  } = useChatError();

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
            onClick={startNewChat}
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
        // CopilotChat's built-in welcomeScreen slot never renders once a
        // threadId is passed in (hasExplicitThreadId suppresses it
        // unconditionally), so the empty state below is rendered via the
        // messageView.children slot instead.
        welcomeScreen={false}
        labels={{
          chatInputPlaceholder: 'Ask Copilot about your release notes...',
        }}
        messageView={
          hasMessages
            ? {
                assistantMessage:
                  AssistantMessageBubble as typeof CopilotChatAssistantMessage,
                userMessage: UserMessageBubble as typeof CopilotChatUserMessage,
                className: 'flex flex-row gap-4 py-4 h-full',
              }
            : { children: () => <WelcomeScreen /> }
        }
      />
      {chatErrorMessage && (
        <ChatErrorBar
          message={chatErrorMessage}
          canRetry={canRetry}
          onRetry={retry}
          onDismiss={dismissChatError}
        />
      )}
    </div>
  );
};

export default CopilotAssistantPanel;
