import { useCallback, useEffect, useRef, useState } from 'react';
import { useCopilotKit } from '@copilotkit/react-core/v2';
import type { AbstractAgent } from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id.ts';

interface UseChatErrorResult {
  message: string | null;
  canRetry: boolean;
  retry: () => void;
  dismiss: () => void;
}

const readAgentId = (context: Record<string, unknown>): string | undefined => {
  const agentId = context.agentId;
  return typeof agentId === 'string' ? agentId : undefined;
};

export const useChatError = (): UseChatErrorResult => {
  const { copilotkit } = useCopilotKit();
  const [message, setMessage] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const lastAgentRef = useRef<AbstractAgent | null>(null);

  useEffect(() => {
    const subscription = copilotkit.subscribe({
      onAgentRunStarted: ({ agent }) => {
        if (agent.agentId !== RELEASE_COPILOT_AGENT_ID) return;

        lastAgentRef.current = agent;
        setCanRetry(true);
      },
      onError: ({ error, code, context }) => {
        const agentId = readAgentId(context);
        if (agentId !== undefined && agentId !== RELEASE_COPILOT_AGENT_ID) return;

        setMessage(`${error.message} (${code})`);
      },
    });

    return () => subscription.unsubscribe();
  }, [copilotkit]);

  const retry = useCallback(() => {
    const agent = lastAgentRef.current;
    if (!agent) return;

    setMessage(null);
    void copilotkit.runAgent({ agent }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : String(error));
    });
  }, [copilotkit]);

  const dismiss = useCallback(() => setMessage(null), []);

  return { message, canRetry, retry, dismiss };
};
