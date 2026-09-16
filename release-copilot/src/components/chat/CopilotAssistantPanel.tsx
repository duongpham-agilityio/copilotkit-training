import { useEffect, type ReactNode } from 'react';
import {
  CopilotChat,
  useAgent,
  type CopilotChatAssistantMessage,
  type CopilotChatUserMessage,
} from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { useChatError } from '@/hooks/use-chat-error.ts';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
import ChatErrorBar from './ChatErrorBar.tsx';
import UserMessageBubble from './UserMessageBubble.tsx';
import WelcomeScreen from './WelcomeScreen.tsx';

interface CopilotAssistantPanelProps {
  leading?: ReactNode;
  trailing?: ReactNode;
}

const CopilotAssistantPanel = ({
  leading,
  trailing,
}: CopilotAssistantPanelProps) => {
  const { threadId } = useThreadSession();

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
      <div className="border-outline-variant flex shrink-0 items-center gap-2 border-b px-4 py-4">
        {leading}
        <span
          className="bg-success-emerald size-3 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-headline-md text-on-surface">
          Copilot Assistant
        </span>
        {trailing && <span className="ml-auto">{trailing}</span>}
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
