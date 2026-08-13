import type { CopilotChatAssistantMessageProps } from '@copilotkit/react-core/v2';
import { CopilotChatAssistantMessage } from '@copilotkit/react-core/v2';
import { Sparkles } from 'lucide-react';

const AssistantMessageBubble = ({
  message,
}: CopilotChatAssistantMessageProps) => (
  <div className="flex w-full max-w-[420px] flex-col items-start gap-3">
    <div className="flex items-center gap-2 pl-1">
      <span className="bg-primary text-on-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
        <Sparkles className="size-4" />
      </span>
      <span className="text-label-sm text-on-surface-variant">Copilot</span>
    </div>
    <div className="bg-surface-container-lowest border-outline-variant text-on-surface text-body-md rounded-tl-[2px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border p-[17px]">
      <CopilotChatAssistantMessage.MarkdownRenderer
        content={message.content ?? ''}
      />
    </div>
  </div>
);

export default AssistantMessageBubble;
