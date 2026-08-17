// Must stay in sync with the `/copilotkit` suffix baked into VITE_COPILOTKIT_RUNTIME_URL (see .env.example).
export const COPILOTKIT_ROUTE_PATH = '/copilotkit';

export const COPILOTKIT_RESOURCE_ID = 'release-copilot';

// localStorage key holding this browser's persisted CopilotKit threadId. Without an
// explicit threadId, CopilotChat mints a fresh UUID on every mount, so past messages
// (though saved server-side) are unreachable from the UI.
export const COPILOTKIT_THREAD_ID_STORAGE_KEY = 'release-copilot-thread-id';
