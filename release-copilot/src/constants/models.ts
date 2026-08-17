const requireModelEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const RELEASE_COPILOT_MODEL = requireModelEnv('RELEASE_COPILOT_MODEL');

// Point this at a different model than RELEASE_COPILOT_MODEL — setting both to the
// same value leaves the agent with no fallback at all, which nothing here can catch
// for you.
export const RELEASE_COPILOT_FALLBACK_MODEL = requireModelEnv(
  'RELEASE_COPILOT_FALLBACK_MODEL',
);
