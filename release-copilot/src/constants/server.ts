// Wide open for local dev; tighten before deploying to a shared environment.
export const MASTRA_CORS_CONFIG = {
  origin: '*',
  allowMethods: ['*'],
  allowHeaders: ['*'],
};

export const MASTRA_LOGGER_NAME = 'Mastra';
