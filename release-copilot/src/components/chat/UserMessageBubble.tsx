import type { CopilotChatUserMessageProps } from '@copilotkit/react-core/v2';
import { CopilotChatUserMessage } from '@copilotkit/react-core/v2';
import Avatar from '@/components/common/Avatar.tsx';

const UserMessageBubble = ({ message }: CopilotChatUserMessageProps) => {
  const content = typeof message.content === 'string' ? message.content : '';

  return (
    <div className="flex w-full flex-col items-end gap-3">
      <div className="flex items-center gap-2 pr-1">
        <span className="text-label-sm text-on-surface-variant">You</span>
        <Avatar name="You" />
      </div>
      <div className="bg-primary-container text-on-primary-container text-body-md max-w-[380px] rounded-tl-2xl rounded-tr-[2px] rounded-br-2xl rounded-bl-2xl p-[17px]">
        <CopilotChatUserMessage.MessageRenderer
          content={content}
          className="text-on-primary-container! max-w-none! rounded-none! bg-transparent! p-0!"
        />
      </div>
    </div>
  );
};

export default UserMessageBubble;
