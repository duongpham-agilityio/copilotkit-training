import { forwardRef } from 'react';
import {
  CopilotChat,
  useConfigureSuggestions,
  type CopilotChatAssistantMessage,
  type CopilotChatUserMessage,
} from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
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
