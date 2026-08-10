import { CopilotSidebar } from '@copilotkit/react-core/v2';
import { WEATHER_AGENT_ID } from '../../constants/agents';

const ChatSidebar = () => (
  <CopilotSidebar
    agentId={WEATHER_AGENT_ID}
    defaultOpen
    labels={{
      modalHeaderTitle: 'Release Copilot',
      welcomeMessageText: 'Hỏi mình về thời tiết để thử kết nối với Mastra server.',
    }}
  />
);

export default ChatSidebar;
