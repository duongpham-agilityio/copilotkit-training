import { useEffect } from 'react';
import {
  CopilotChat,
  useAgent,
  type CopilotChatAssistantMessage,
  type CopilotChatUserMessage,
} from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id';
import { useChatError } from '@/hooks/use-chat-error.ts';
import { useDraftThreadRow } from '@/hooks/use-draft-thread-row.ts';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
import ChatErrorBar from './ChatErrorBar.tsx';
import UserMessageBubble from './UserMessageBubble.tsx';
import WelcomeScreen from './WelcomeScreen.tsx';

// No header of its own — ThreadHeader (rendered by DashboardPage, above this
// panel) owns the thread title, Preview toggle, and options menu that the
// design puts in a single row above the conversation.
const CopilotAssistantPanel = () => {
  const { agent } = useAgent({ agentId: RELEASE_COPILOT_AGENT_ID });

  useEffect(() => {
    return () => {
      agent.setMessages([]);
    };
  }, [agent]);

  useDraftThreadRow({
    agentThreadId: agent.threadId,
    hasMessages: agent.messages.length > 0,
    isRunning: agent.isRunning,
  });

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
        className="min-h-0 flex-1"
        welcomeScreen={WelcomeScreen}
        labels={{
          chatInputPlaceholder: 'Ask Copilot about your release notes...',
          chatDisclaimerText: '',
        }}
        messageView={{
          assistantMessage:
            AssistantMessageBubble as typeof CopilotChatAssistantMessage,
          userMessage: UserMessageBubble as typeof CopilotChatUserMessage,

          className: 'mx-auto flex h-full w-full flex-col gap-6 px-8 pt-7 pb-3',
        }}
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
