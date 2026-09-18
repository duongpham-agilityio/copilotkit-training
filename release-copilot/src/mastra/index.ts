import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import {
  Observability,
  MastraStorageExporter,
  MastraPlatformExporter,
  SensitiveDataFilter,
} from '@mastra/observability';
import { MastraAuthSupabase } from '@mastra/auth-supabase';
import { releaseCopilotAgent } from './agents/release-copilot-agent';
import { renderReleaseNotesPreviewTool } from './tools/render-release-notes-preview-tool';
import { publishReleaseNotesToSlackTool } from './tools/publish-release-notes-to-slack-tool';
import { RELEASE_COPILOT_AGENT_ID } from '../constants/agent-tools/agent-id';
import {
  RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME,
  PUBLISH_RELEASE_NOTES_TO_SLACK_TOOL_NAME,
} from '../constants/agent-tools/tools-name';
import {
  MASTRA_CORS_CONFIG,
  MASTRA_LOGGER_NAME,
  MASTRA_OBSERVABILITY_SERVICE_NAME,
} from '../constants/config/lib-config';
import { getRequiredEnv } from '../lib/env';
import { releaseCopilotFactoryStorage } from './storage/factory-storage';
import { copilotKitRoute } from './api/copilotkit-route';
import { slackPublishRoute } from './api/slack-publish-route';
import { saveReleaseHistoryRoute } from './api/save-release-history-route';
import {
  listReleaseHistoryRoute,
  getReleaseHistoryRoute,
} from './api/release-history-route';
import { SimpleAuth } from '@mastra/core/server';

// `dev:mastra` sets MASTRA_AUTH_MODE=simple for Studio testing without Supabase
// credentials; every other entrypoint (`dev:all`, production build) leaves it unset
// and gets real Supabase auth. Auth is picked before construction, not built as two
// instances, so the simple-auth path never requires SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY.
const auth =
  process.env.MASTRA_AUTH_MODE === 'simple'
    ? new SimpleAuth({
        tokens: {
          'local-testing-token': {
            id: 'user-1',
            name: 'Duong Pham',
            role: 'admin',
          },
        },
        mapUserToResourceId: (user) => user.id,
      })
    : new MastraAuthSupabase({
        url: getRequiredEnv(process.env.SUPABASE_URL, 'SUPABASE_URL'),
        anonKey: getRequiredEnv(
          process.env.SUPABASE_PUBLISHABLE_KEY,
          'SUPABASE_PUBLISHABLE_KEY',
        ),
        authorizeUser: () => true,
        mapUserToResourceId: (user) => user.id,
      });

export const mastra = new Mastra({
  agents: {
    [RELEASE_COPILOT_AGENT_ID]: releaseCopilotAgent,
  },
  tools: {
    [RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME]: renderReleaseNotesPreviewTool,
    [PUBLISH_RELEASE_NOTES_TO_SLACK_TOOL_NAME]: publishReleaseNotesToSlackTool,
  },
  server: {
    cors: MASTRA_CORS_CONFIG,
    auth,
    apiRoutes: [
      copilotKitRoute,
      slackPublishRoute,
      saveReleaseHistoryRoute,
      listReleaseHistoryRoute,
      getReleaseHistoryRoute,
    ],
  },
  bundler: {
    externals: true,
  },
  storage: releaseCopilotFactoryStorage.getMastraStorage(),
  logger: new PinoLogger({
    name: MASTRA_LOGGER_NAME,
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: MASTRA_OBSERVABILITY_SERVICE_NAME,
        exporters: [new MastraStorageExporter(), new MastraPlatformExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
