import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import {
  Observability,
  MastraStorageExporter,
  MastraPlatformExporter,
  SensitiveDataFilter,
} from '@mastra/observability';
import { registerCopilotKit } from '@ag-ui/mastra/copilotkit';
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
import { MASTRA_BUNDLER_EXTERNALS } from '../constants/bundler';
import {
  COMPOSITE_STORAGE_ID,
  MASTRA_STORAGE_ID,
  MASTRA_DB_FALLBACK_URL,
} from '../constants/storage';
import { MASTRA_OBSERVABILITY_SERVICE_NAME } from '../constants/observability';

export const mastra = new Mastra({
  agents: {
    [RELEASE_COPILOT_AGENT_ID]: releaseCopilotAgent,
  },
  tools: {
    [RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME]: renderReleaseNotesPreviewTool,
  },
  server: {
    cors: MASTRA_CORS_CONFIG,
    apiRoutes: [
      registerCopilotKit({
        path: COPILOTKIT_ROUTE_PATH,
        resourceId: COPILOTKIT_RESOURCE_ID,
      }),
      slackPublishRoute,
    ],
  },
  bundler: {
    // The CopilotKit runtime handler pulls in @copilotkit/runtime; excluding it
    // from the server bundle avoids bundling it twice (also imported client-side).
    externals: MASTRA_BUNDLER_EXTERNALS,
  },
  storage: new MastraCompositeStore({
    id: COMPOSITE_STORAGE_ID,
    default: new LibSQLStore({
      id: MASTRA_STORAGE_ID,
      // Uses a hosted database when deployed (mastra env db create --kind turso),
      // and a local file during development.
      url: process.env.TURSO_DATABASE_URL ?? MASTRA_DB_FALLBACK_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  logger: new PinoLogger({
    name: MASTRA_LOGGER_NAME,
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: MASTRA_OBSERVABILITY_SERVICE_NAME,
        exporters: [
          new MastraStorageExporter(), // Persists observability events to Mastra Storage
          new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
