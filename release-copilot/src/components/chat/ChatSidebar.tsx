import { CopilotSidebar } from '@copilotkit/react-core/v2';
import { SUPERVISOR_AGENT_ID } from '@/constants/agents';

const ChatSidebar = () => (
  <CopilotSidebar
    agentId={SUPERVISOR_AGENT_ID}
    defaultOpen
    labels={{
      modalHeaderTitle: 'Release Copilot',
    }}
  />
);

export default ChatSidebar;
