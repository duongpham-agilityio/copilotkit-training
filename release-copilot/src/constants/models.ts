const requireModelEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const SUPERVISOR_MODEL = requireModelEnv('SUPERVISOR_MODEL');
export const SUPERVISOR_MODEL_FALLBACK = requireModelEnv(
  'SUPERVISOR_MODEL_FALLBACK',
);
export const SUPPORT_MODEL = requireModelEnv('SUPPORT_MODEL');
export const SUPPORT_MODEL_FALLBACK = requireModelEnv('SUPPORT_MODEL_FALLBACK');
export const ANALYZE_INPUT_MODEL = requireModelEnv('ANALYZE_INPUT_MODEL');
export const ANALYZE_INPUT_MODEL_FALLBACK = requireModelEnv(
  'ANALYZE_INPUT_MODEL_FALLBACK',
);
export const BUILD_RELEASE_MODEL = requireModelEnv('BUILD_RELEASE_MODEL');
export const BUILD_RELEASE_MODEL_FALLBACK = requireModelEnv(
  'BUILD_RELEASE_MODEL_FALLBACK',
);
