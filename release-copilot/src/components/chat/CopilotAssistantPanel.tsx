import { useEffect } from 'react';
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

// No header of its own — ThreadHeader (rendered by DashboardPage, above this
// panel) owns the thread title, Preview toggle, and options menu that the
// design puts in a single row above the conversation.
const CopilotAssistantPanel = () => {
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
    <div className="bg-surface-container-lowest flex h-full w-full flex-col">
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
          chatDisclaimerText: '',
        }}
        messageView={
          hasMessages
            ? {
                assistantMessage:
                  AssistantMessageBubble as typeof CopilotChatAssistantMessage,
                userMessage: UserMessageBubble as typeof CopilotChatUserMessage,
                // The design runs the conversation as one 680px column,
                // 24px between turns.
                className:
                  'mx-auto flex h-full w-full flex-col gap-6 px-8 pt-7 pb-3',
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
