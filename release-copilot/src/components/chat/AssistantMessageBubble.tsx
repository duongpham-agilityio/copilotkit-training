import type { CopilotChatAssistantMessageProps } from '@copilotkit/react-core/v2';
import {
  CopilotChatAssistantMessage,
  CopilotChatToolCallsView,
} from '@copilotkit/react-core/v2';
import { Sparkles } from 'lucide-react';

// CopilotKit's default assistant message renders `CopilotChatToolCallsView`
// internally (see its `toolCallsView` slot) — that's what actually invokes
// `useRenderTool` renderers (e.g. useRenderReleaseNotesPreviewTool) for a given
// message's tool calls. This bubble fully replaces the default component, so it
// must render that view itself or tool-call renderers never fire, even though
// the tool call still streams from the agent correctly.
const AssistantMessageBubble = ({
  message,
  messages,
}: CopilotChatAssistantMessageProps) => {
  // A message can carry only tool calls (the agent renders a draft without saying
  // anything), so the bubble must survive an empty `content` — gating the whole
  // component on `content` is what silently swallowed the preview.
  if (!message.content && !message.toolCalls?.length) return null;

  return (
    <div className="flex w-full max-w-[420px] flex-col items-start gap-3">
      {message.content && (
        <>
          <div className="flex items-center gap-2 pl-1">
            <span className="bg-primary text-on-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
              <Sparkles className="size-4" />
            </span>
            <span className="text-label-sm text-on-surface-variant">
              Copilot
            </span>
          </div>
          <div className="bg-surface-container-lowest border-outline-variant text-on-surface text-body-md rounded-tl-[2px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border p-[17px]">
            <CopilotChatAssistantMessage.MarkdownRenderer
              content={message.content}
            />
          </div>
        </>
      )}
      <CopilotChatToolCallsView message={message} messages={messages} />
    </div>
  );
};

export default AssistantMessageBubble;
