import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import {
  Observability,
  MastraStorageExporter,
  MastraPlatformExporter,
  SensitiveDataFilter,
} from '@mastra/observability';
import { registerCopilotKit } from '@ag-ui/mastra/copilotkit';
import { MastraAuthSupabase } from '@mastra/auth-supabase';
import { releaseCopilotAgent } from './agents/release-copilot-agent';
import { renderReleaseNotesPreviewTool } from './tools/render-release-notes-preview-tool';
import { slackPublishRoute } from './api/slack-publish-route';
import { RELEASE_COPILOT_AGENT_ID } from '../constants/agents';
import { RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME } from '../constants/tools';
import {
  COPILOTKIT_ROUTE_PATH,
  COPILOTKIT_RESOURCE_ID,
} from '../constants/copilotkit';
import { MASTRA_CORS_CONFIG, MASTRA_LOGGER_NAME } from '../constants/server';
import {
  MASTRA_STORAGE_ID,
  MASTRA_DB_FALLBACK_URL,
} from '../constants/storage';
import { MASTRA_OBSERVABILITY_SERVICE_NAME } from '../constants/observability';
import { getRequiredEnv } from '../lib/env';

const supabaseAuth = new MastraAuthSupabase({
  url: getRequiredEnv(process.env.SUPABASE_URL, 'SUPABASE_URL'),
  anonKey: getRequiredEnv(
    process.env.SUPABASE_PUBLISHABLE_KEY,
    'SUPABASE_PUBLISHABLE_KEY',
  ),
});

export const mastra = new Mastra({
  agents: {
    [RELEASE_COPILOT_AGENT_ID]: releaseCopilotAgent,
  },
  tools: {
    [RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME]: renderReleaseNotesPreviewTool,
  },
  server: {
    cors: MASTRA_CORS_CONFIG,
    auth: supabaseAuth,
    apiRoutes: [
      registerCopilotKit({
        path: COPILOTKIT_ROUTE_PATH,
        resourceId: COPILOTKIT_RESOURCE_ID,
      }),
      slackPublishRoute,
    ],
  },
  bundler: {
    externals: true,
  },
  storage: new LibSQLStore({
    id: MASTRA_STORAGE_ID,
    url: process.env.TURSO_DATABASE_URL ?? MASTRA_DB_FALLBACK_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
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
