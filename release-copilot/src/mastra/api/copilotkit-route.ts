import { registerApiRoute } from '@mastra/core/server';
import { COPILOTKIT_ROUTE_PATH } from '../../constants/slack';
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
  type CopilotRuntimeOptions,
} from '@copilotkit/runtime/v2';
import { MastraAgent } from '@ag-ui/mastra';
import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';

export const copilotKitRoute = registerApiRoute(COPILOTKIT_ROUTE_PATH, {
  method: 'ALL',
  handler: async (c) => {
    const mastra = c.get('mastra');
    const requestContext = c.get('requestContext');

    const aguiAgents = MastraAgent.getLocalAgents({
      mastra,
      resourceId:
        requestContext.get<typeof MASTRA_RESOURCE_ID_KEY, string | undefined>(
          MASTRA_RESOURCE_ID_KEY,
        ) ?? '',
      requestContext,
    });

    const runtime = new CopilotRuntime({
      agents: aguiAgents as unknown as CopilotRuntimeOptions['agents'],
    });

    const handler = createCopilotRuntimeHandler({
      runtime,
      basePath: COPILOTKIT_ROUTE_PATH,
      mode: 'single-route',
    });

    const headers = new Headers(c.req.raw.headers);
    headers.delete('authorization');

    return handler(new Request(c.req.raw, { headers }));
  },
});
