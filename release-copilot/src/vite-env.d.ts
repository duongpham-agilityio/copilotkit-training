/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COPILOTKIT_RUNTIME_URL: string;
  readonly VITE_MASTRA_SERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
