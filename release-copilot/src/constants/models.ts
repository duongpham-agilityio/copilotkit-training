const requireModelEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const SUPERVISOR_MODEL = requireModelEnv('SUPERVISOR_MODEL');
export const SUPPORT_MODEL = requireModelEnv('SUPPORT_MODEL');
export const ANALYZE_INPUT_MODEL = requireModelEnv('ANALYZE_INPUT_MODEL');
export const BUILD_RELEASE_MODEL = requireModelEnv('BUILD_RELEASE_MODEL');
export const CHECK_GRAMMAR_MODEL = requireModelEnv('CHECK_GRAMMAR_MODEL');
