import { LibSQLFactoryStorage } from '@mastra/libsql';
import { MASTRA_STORAGE_ID } from '../../constants/storages/storage-name';
import { MASTRA_DB_FALLBACK_URL } from '../../constants/storages/storage-path';
import { releasesCollectionSchema } from './releases-collection';

// Same Turso connection the previous LibSQLStore used — one connection powers
// both agent state (getMastraStorage(), wired into the Mastra instance) and
// this app-owned `releases` collection (via `.ops`). Initialized eagerly at
// module load (not lazily on first request) so a Turso connectivity problem
// fails server startup immediately instead of surfacing on a random first
// request.
export const releaseCopilotFactoryStorage = new LibSQLFactoryStorage({
  id: MASTRA_STORAGE_ID,
  url: process.env.TURSO_DATABASE_URL ?? MASTRA_DB_FALLBACK_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await releaseCopilotFactoryStorage.init();
await releaseCopilotFactoryStorage.ensureCollections([releasesCollectionSchema]);
