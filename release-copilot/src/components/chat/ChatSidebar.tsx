import { CopilotSidebar } from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';

const ChatSidebar = () => (
  <CopilotSidebar
    agentId={RELEASE_COPILOT_AGENT_ID}
    defaultOpen
    labels={{
      modalHeaderTitle: 'Release Copilot',
    }}
  />
);

export default ChatSidebar;
