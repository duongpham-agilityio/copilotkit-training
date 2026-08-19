export const SLACK_PUBLISH_ROUTE_PATH = '/slack/publish';

export const SLACK_ERROR_MESSAGES = {
  MISSING_WEBHOOK_URL:
    'Missing required env var: SLACK_WEBHOOK_URL. Set it in .env, then restart the Mastra server.',
  INVALID_REQUEST: 'Invalid publish request',
  SLACK_REJECTED: 'Slack rejected the message',
} as const;
