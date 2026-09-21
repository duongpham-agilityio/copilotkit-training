import { LibSQLVector } from '@mastra/libsql';
import { MASTRA_VECTOR_ID } from '../../constants/storages/storage-name';
import { MASTRA_DB_FALLBACK_URL } from '../../constants/storages/storage-path';

// Same Turso database as releaseCopilotFactoryStorage — LibSQLFactoryStorage exposes
// no vector accessor, so semantic recall needs its own LibSQLVector client pointed at
// the same url. Kept in a separate module (not inside factory-storage.ts) so that
// file's eager `await init()` top-level awaits stay the only startup work there.
export const releaseCopilotVectorStore = new LibSQLVector({
  id: MASTRA_VECTOR_ID,
  url: process.env.TURSO_DATABASE_URL ?? MASTRA_DB_FALLBACK_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
