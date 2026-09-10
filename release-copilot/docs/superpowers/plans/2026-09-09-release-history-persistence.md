# Release History Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every release-notes draft/edit the agent produces is saved automatically as a
row in a new `releases` collection (Turso, via `LibSQLFactoryStorage`), and the History
page (already built, currently unwired) lists and reopens those rows.

**Architecture:** `LibSQLFactoryStorage` shares one Turso connection between Mastra
agent state and a new app-owned `releases` collection. A plain, Agent-independent API
route (`save-release-history-route.ts`, same shape as the existing
`slack-publish-route.ts`) does the write; the render tool itself is untouched. The
frontend auto-triggers that save right after CopilotKit renders a completed draft/edit
tool call, using the commit/PR selection it already holds client-side. `version`/`title`
are two new LLM-authored fields on the existing draft schema.

**Tech Stack:** `@mastra/libsql` (`LibSQLFactoryStorage`), `@mastra/core/server`
(`registerApiRoute`), `@mastra/core/request-context` (`MASTRA_RESOURCE_ID_KEY`), Zod,
`@tanstack/react-query`, Zustand.

**Spec:** `docs/superpowers/specs/2026-09-09-release-history-design.md`

## Global Constraints

- TypeScript strict; no `any`; `import type` for type-only imports; no `.js`/`.ts`
  weakening of `tsconfig.app.json`.
- Zod schema required on every new request/response shape — validate at the boundary
  (network response, HTTP request body), not inside pure helpers.
- Files under `src/mastra/**` (agents/tools/api/storage): relative imports, **no**
  file extension — matches every existing file in that tree
  (`src/mastra/agents/release-copilot-agent.ts`, `src/mastra/tools/*`,
  `src/mastra/api/*`).
- Files under `src/hooks/`, `src/services/`, `src/routes/`, `src/components/`, and new
  files in `src/lib/release-notes/`: `@/` alias imports with explicit `.ts`/`.tsx`
  extension — matches `use-release-draft.tsx`, `use-thread-session.ts`,
  `list-threads.ts`, `to-platform-drafts.ts`.
- Files under `src/types/`: relative imports, no extension — matches
  `release-notes-draft.ts` and `working-memory.ts` (both already shared
  cross-bundle).
- Single quotes, semicolons, 2-space indent, trailing commas on multiline. Named
  exports except default-exported React components.
- `pnpm lint` and `pnpm build` must pass clean after every task — this project has no
  unit tests or Storybook stories (established convention), so these two commands plus
  a manual check are the verification loop for every step, replacing the
  write-a-failing-test cycle this skill defaults to.
- **No git commits.** Per this session's standing instruction, checkpoints below are a
  pause-for-review point, not a `git commit` step — commit only if explicitly asked in
  a later turn.
- Custom Mastra routes cannot start with `/api` (default `apiPrefix`, reserved for
  built-in routes) — confirmed by reading `registerApiRoute`'s own reference doc. All
  new route paths here start with `/release-history`.
- Reuses existing env vars only: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
  `VITE_MASTRA_SERVER_URL`. No new configuration.

---

### Task 1: Shared types — draft version/title, working memory, ReleaseSummary.id, history record shape

**Files:**
- Modify: `src/types/release-notes-draft.ts`
- Modify: `src/types/working-memory.ts`
- Modify: `src/types/release.ts`
- Create: `src/types/release-history-record.ts`
- Create: `src/types/save-release-history-request.ts`

**Interfaces:**
- Produces: `ReleaseNotesDraftSchema` now includes optional `version: string`,
  `title: string`. `WorkingMemorySchema` now includes optional
  `currentRelease: { version: string; title: string }`. `ReleaseSummary` now includes
  `id: string`. `ReleaseHistoryRecordSchema` / `ReleaseHistoryRecord`.
  `ListReleaseHistoryResponseSchema`. `SaveReleaseHistoryRequestSchema` /
  `SaveReleaseHistoryRequest`.

- [ ] **Step 1: Add `version`/`title` to `ReleaseNotesDraftSchema`**

In `src/types/release-notes-draft.ts`, insert right after the existing
`titleOverride` field and before `github`:

```typescript
  version: z
    .string()
    .min(1)
    .optional()
    .describe(
      joinLines(
        'MAJOR.MINOR.PATCH for this release, decided by you from conversation',
        'context: bump the version last saved for the release currently in',
        'progress, or start over at "1.0.0" when this build is for a clearly',
        'different set of commits/PRs than the one you were just iterating on.',
        'Omit only when you have no basis yet to decide — omitting suppresses',
        'saving this build to History.',
      ),
    ),
  title: z
    .string()
    .min(1)
    .optional()
    .describe(
      joinLines(
        'A short label distinguishing this release from others built the same',
        'day (e.g. "Payment Gateway Update"). Required alongside `version` for',
        'this build to be saved to History — omit both together, never just one.',
      ),
    ),
```

- [ ] **Step 2: Add `currentRelease` to `WorkingMemorySchema`**

In `src/types/working-memory.ts`, add a new top-level field to
`WorkingMemorySchema`, after `platform` and before `language`:

```typescript
  currentRelease: z
    .object({
      version: z.string().min(1),
      title: z.string().min(1),
    })
    .optional()
    .describe(
      joinLines(
        'The release currently being iterated on in this conversation — the',
        'last version/title you produced. Read it before drafting to decide',
        'whether this build continues that release (bump the version) or starts',
        'a different one (reset to "1.0.0", new title). Update it after every',
        'draft/edit call that includes version/title.',
      ),
    ),
```

- [ ] **Step 3: Add `id` to `ReleaseSummary`**

Replace the full contents of `src/types/release.ts`:

```typescript
export const enum ReleaseStatus {
  Published = 'published',
  Draft = 'draft',
  Archived = 'archived',
}

export interface ReleaseSummary {
  id: string;
  version: string;
  status: ReleaseStatus;
  title: string;
  date: string;
  featCount: number;
  fixCount: number;
}
```

- [ ] **Step 4: Create the history record schema**

Create `src/types/release-history-record.ts`:

```typescript
import { z } from 'zod';
import { PlatformDraftSchema } from './release-notes-draft';
import { ReleaseEntrySchema } from './release-entry';
import { ReleaseStatus } from './release';

export const ReleaseHistoryRecordSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  releaseDate: z.string().regex(/^\d{8}$/),
  titleOverride: z.string().nullable(),
  status: z.enum([
    ReleaseStatus.Draft,
    ReleaseStatus.Published,
    ReleaseStatus.Archived,
  ]),
  github: z.string(),
  appStore: z.string().nullable(),
  googlePlay: z.string().nullable(),
  platforms: z.array(PlatformDraftSchema),
  entries: z.array(ReleaseEntrySchema),
  featCount: z.number().int(),
  fixCount: z.number().int(),
  createdAt: z.string(),
});

export type ReleaseHistoryRecord = z.infer<typeof ReleaseHistoryRecordSchema>;

export const ListReleaseHistoryResponseSchema = z.object({
  releases: z.array(ReleaseHistoryRecordSchema),
  nextCursor: z.string().nullable(),
});

export type ListReleaseHistoryResponse = z.infer<
  typeof ListReleaseHistoryResponseSchema
>;
```

- [ ] **Step 5: Create the save-request schema**

Create `src/types/save-release-history-request.ts`:

```typescript
import { z } from 'zod';
import { ReleaseNotesDraftSchema } from './release-notes-draft';
import { ReleaseEntrySchema } from './release-entry';

export const SaveReleaseHistoryRequestSchema = ReleaseNotesDraftSchema.extend({
  version: z.string().min(1),
  title: z.string().min(1),
  entries: z.array(ReleaseEntrySchema).min(1),
});

export type SaveReleaseHistoryRequest = z.infer<
  typeof SaveReleaseHistoryRequestSchema
>;
```

- [ ] **Step 6: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean. (No consumers reference the new fields yet, so nothing
should break.)

- [ ] **Step 7: Checkpoint — pause for review (no commit)**

---

### Task 2: Storage layer — collection schema, factory storage singleton, repository

**Files:**
- Create: `src/mastra/storage/releases-collection.ts`
- Create: `src/mastra/storage/factory-storage.ts`
- Create: `src/mastra/storage/releases-repository.ts`

**Interfaces:**
- Consumes: `MASTRA_STORAGE_ID`, `MASTRA_DB_FALLBACK_URL`
  (`src/constants/storages/*`), `ReleaseEntrySchema`/`ReleaseEntry`
  (`src/types/release-entry.ts`), `PlatformDraftSchema`/`PlatformDraft`
  (`src/types/release-notes-draft.ts`), `ReleaseStatus` (`src/types/release.ts`),
  `CommitType` (`src/types/commit.ts`).
- Produces: `releaseCopilotFactoryStorage: LibSQLFactoryStorage` (ready to use — init
  and `ensureCollections` already awaited at module load).
  `insertRelease(input: InsertReleaseInput): Promise<ReleaseRecord>`.
  `listReleases(input: ListReleasesInput): Promise<ListReleasesResult>`.
  `getRelease(input: { id: string; ownerId: string }): Promise<ReleaseRecord | null>`.

- [ ] **Step 1: Declare the collection schema**

Create `src/mastra/storage/releases-collection.ts`:

```typescript
import type { CollectionSchema } from '@mastra/core/storage';

export const RELEASES_COLLECTION_NAME = 'releases';

export const releasesCollectionSchema: CollectionSchema = {
  name: RELEASES_COLLECTION_NAME,
  columns: {
    id: { type: 'uuid-pk' },
    owner_id: { type: 'text' },
    version: { type: 'text' },
    title: { type: 'text' },
    release_date: { type: 'text' },
    title_override: { type: 'text', nullable: true },
    status: { type: 'text', default: 'draft' },
    github_body: { type: 'text' },
    app_store_body: { type: 'text', nullable: true },
    google_play_body: { type: 'text', nullable: true },
    platforms_json: { type: 'json', default: '[]' },
    entries_json: { type: 'json' },
    feat_count: { type: 'integer' },
    fix_count: { type: 'integer' },
    created_at: { type: 'timestamp' },
  },
  indexes: [
    { name: 'idx_releases_owner_created', columns: ['owner_id', 'created_at'] },
  ],
};
```

- [ ] **Step 2: Create the factory storage singleton**

Create `src/mastra/storage/factory-storage.ts`:

```typescript
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
```

- [ ] **Step 3: Create the repository**

Create `src/mastra/storage/releases-repository.ts`:

```typescript
import { releaseCopilotFactoryStorage } from './factory-storage';
import { RELEASES_COLLECTION_NAME } from './releases-collection';
import { ReleaseEntrySchema, type ReleaseEntry } from '../../types/release-entry';
import {
  PlatformDraftSchema,
  type PlatformDraft,
} from '../../types/release-notes-draft';
import { ReleaseStatus } from '../../types/release';
import { CommitType } from '../../types/commit';

interface ReleaseRow {
  id: string;
  owner_id: string;
  version: string;
  title: string;
  release_date: string;
  title_override: string | null;
  status: string;
  github_body: string;
  app_store_body: string | null;
  google_play_body: string | null;
  platforms_json: unknown;
  entries_json: unknown;
  feat_count: number;
  fix_count: number;
  created_at: Date;
}

export interface InsertReleaseInput {
  ownerId: string;
  version: string;
  title: string;
  releaseDate: string;
  titleOverride?: string;
  github: string;
  appStore?: string;
  googlePlay?: string;
  platforms: PlatformDraft[];
  entries: ReleaseEntry[];
}

export interface ReleaseRecord {
  id: string;
  version: string;
  title: string;
  releaseDate: string;
  titleOverride: string | null;
  status: ReleaseStatus;
  github: string;
  appStore: string | null;
  googlePlay: string | null;
  platforms: PlatformDraft[];
  entries: ReleaseEntry[];
  featCount: number;
  fixCount: number;
  createdAt: string;
}

const toReleaseRecord = (row: ReleaseRow): ReleaseRecord => ({
  id: row.id,
  version: row.version,
  title: row.title,
  releaseDate: row.release_date,
  titleOverride: row.title_override,
  status: row.status as ReleaseStatus,
  github: row.github_body,
  appStore: row.app_store_body,
  googlePlay: row.google_play_body,
  platforms: PlatformDraftSchema.array().parse(row.platforms_json),
  entries: ReleaseEntrySchema.array().parse(row.entries_json),
  featCount: row.feat_count,
  fixCount: row.fix_count,
  createdAt: row.created_at.toISOString(),
});

export const insertRelease = async (
  input: InsertReleaseInput,
): Promise<ReleaseRecord> => {
  const row = await releaseCopilotFactoryStorage.ops.insertOne<ReleaseRow>(
    RELEASES_COLLECTION_NAME,
    {
      owner_id: input.ownerId,
      version: input.version,
      title: input.title,
      release_date: input.releaseDate,
      title_override: input.titleOverride ?? null,
      status: ReleaseStatus.Draft,
      github_body: input.github,
      app_store_body: input.appStore ?? null,
      google_play_body: input.googlePlay ?? null,
      platforms_json: input.platforms,
      entries_json: input.entries,
      feat_count: input.entries.filter((entry) => entry.type === CommitType.Feat)
        .length,
      fix_count: input.entries.filter((entry) => entry.type === CommitType.Fix)
        .length,
      created_at: new Date(),
    },
  );

  return toReleaseRecord(row);
};

export interface ListReleasesInput {
  ownerId: string;
  limit?: number;
  cursor?: string;
}

export interface ListReleasesResult {
  releases: ReleaseRecord[];
  nextCursor: string | null;
}

const DEFAULT_LIST_LIMIT = 20;

export const listReleases = async ({
  ownerId,
  limit = DEFAULT_LIST_LIMIT,
  cursor,
}: ListReleasesInput): Promise<ListReleasesResult> => {
  const rows = await releaseCopilotFactoryStorage.ops.findMany<ReleaseRow>(
    RELEASES_COLLECTION_NAME,
    { owner_id: ownerId },
    {
      orderBy: [['created_at', 'desc']],
      limit,
      cursor: cursor ? { values: [new Date(cursor)] } : undefined,
    },
  );

  const releases = rows.map(toReleaseRecord);
  const last = releases.at(-1);

  return {
    releases,
    nextCursor: releases.length === limit && last ? last.createdAt : null,
  };
};

export const getRelease = async ({
  id,
  ownerId,
}: {
  id: string;
  ownerId: string;
}): Promise<ReleaseRecord | null> => {
  const row = await releaseCopilotFactoryStorage.ops.findOne<ReleaseRow>(
    RELEASES_COLLECTION_NAME,
    { id, owner_id: ownerId },
  );

  return row ? toReleaseRecord(row) : null;
};
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean. Nothing imports this module yet, so this only checks the
new files compile in isolation.

- [ ] **Step 5: Checkpoint — pause for review (no commit)**

---

### Task 3: Swap `LibSQLStore` for `LibSQLFactoryStorage` in the Mastra instance

**Files:**
- Modify: `src/mastra/index.ts`

**Interfaces:**
- Consumes: `releaseCopilotFactoryStorage` from `./storage/factory-storage` (Task 2).
- Produces: `mastra.storage` now backed by the shared factory storage — no change to
  any other export.

- [ ] **Step 1: Replace the storage import and construction**

In `src/mastra/index.ts`, remove:

```typescript
import { LibSQLStore } from '@mastra/libsql';
```

and:

```typescript
import { MASTRA_STORAGE_ID } from '../constants/storages/storage-name';
import { MASTRA_DB_FALLBACK_URL } from '../constants/storages/storage-path';
```

Add:

```typescript
import { releaseCopilotFactoryStorage } from './storage/factory-storage';
```

In the `new Mastra({ ... })` config, replace:

```typescript
  storage: new LibSQLStore({
    id: MASTRA_STORAGE_ID,
    url: process.env.TURSO_DATABASE_URL ?? MASTRA_DB_FALLBACK_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
```

with:

```typescript
  storage: releaseCopilotFactoryStorage.getMastraStorage(),
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 3: Manual verify — agent state still works**

Run: `pnpm dev:mastra`
Expected: server starts without error (confirms `LibSQLFactoryStorage.init()` +
`ensureCollections()` succeeded against Turso at boot). Open Mastra Studio
(`http://localhost:4111`), send one chat message to `releaseCopilotAgent`, confirm the
thread is created and the reply streams back — same as before this change, proving
agent memory still works on the new storage backend.

- [ ] **Step 4: Checkpoint — pause for review (no commit)**

---

### Task 4: API routes — save, list, get

**Files:**
- Create: `src/mastra/api/save-release-history-route.ts`
- Create: `src/mastra/api/release-history-route.ts`
- Modify: `src/constants/endpoints.ts`
- Modify: `src/mastra/index.ts`

**Interfaces:**
- Consumes: `insertRelease`, `listReleases`, `getRelease`
  (`src/mastra/storage/releases-repository.ts`, Task 2),
  `SaveReleaseHistoryRequestSchema` (`src/types/save-release-history-request.ts`,
  Task 1), `formatReleaseDate` (`src/lib/release-notes/release-title.ts`, existing).
- Produces: `saveReleaseHistoryRoute`, `listReleaseHistoryRoute`,
  `getReleaseHistoryRoute` — registered into `apiRoutes`.
  `RELEASE_HISTORY_ROUTE_PATH`, `RELEASE_HISTORY_DETAIL_ROUTE_PATH`,
  `buildReleaseHistoryDetailPath(id: string): string`.

- [ ] **Step 1: Add endpoint constants**

Append to `src/constants/endpoints.ts`:

```typescript
export const RELEASE_HISTORY_ROUTE_PATH = '/release-history';

export const RELEASE_HISTORY_DETAIL_ROUTE_PATH = '/release-history/:id';

export const buildReleaseHistoryDetailPath = (id: string): string =>
  `${RELEASE_HISTORY_ROUTE_PATH}/${id}`;
```

- [ ] **Step 2: Create the save route**

Create `src/mastra/api/save-release-history-route.ts`:

```typescript
import { registerApiRoute } from '@mastra/core/server';
import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';
import { SaveReleaseHistoryRequestSchema } from '../../types/save-release-history-request';
import { insertRelease } from '../storage/releases-repository';
import { RELEASE_HISTORY_ROUTE_PATH } from '../../constants/endpoints';
import { formatReleaseDate } from '../../lib/release-notes/release-title';

export const saveReleaseHistoryRoute = registerApiRoute(
  RELEASE_HISTORY_ROUTE_PATH,
  {
    method: 'POST',
    handler: async (context) => {
      const ownerId = context.get('requestContext').get(MASTRA_RESOURCE_ID_KEY);
      if (!ownerId) {
        return context.json({ error: 'Unauthorized.' }, 401);
      }

      let body: unknown;
      try {
        body = await context.req.json();
      } catch {
        return context.json({ error: 'Request body is not valid JSON.' }, 400);
      }

      const parsed = SaveReleaseHistoryRequestSchema.safeParse(body);
      if (!parsed.success) {
        return context.json({ error: parsed.error.message }, 400);
      }

      try {
        const release = await insertRelease({
          ownerId,
          version: parsed.data.version,
          title: parsed.data.title,
          releaseDate: parsed.data.releaseDate ?? formatReleaseDate(),
          titleOverride: parsed.data.titleOverride,
          github: parsed.data.github,
          appStore: parsed.data.appStore,
          googlePlay: parsed.data.googlePlay,
          platforms: parsed.data.platforms,
          entries: parsed.data.entries,
        });

        return context.json({ id: release.id }, 201);
      } catch (error) {
        return context.json(
          { error: error instanceof Error ? error.message : String(error) },
          502,
        );
      }
    },
  },
);
```

- [ ] **Step 3: Create the list + detail routes**

Create `src/mastra/api/release-history-route.ts`:

```typescript
import { registerApiRoute } from '@mastra/core/server';
import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';
import { listReleases, getRelease } from '../storage/releases-repository';
import {
  RELEASE_HISTORY_ROUTE_PATH,
  RELEASE_HISTORY_DETAIL_ROUTE_PATH,
} from '../../constants/endpoints';
import type { ReleaseHistoryRecord } from '../../types/release-history-record';
import type { ReleaseRecord } from '../storage/releases-repository';

const toHistoryRecord = (release: ReleaseRecord): ReleaseHistoryRecord => release;

export const listReleaseHistoryRoute = registerApiRoute(
  RELEASE_HISTORY_ROUTE_PATH,
  {
    method: 'GET',
    handler: async (context) => {
      const ownerId = context.get('requestContext').get(MASTRA_RESOURCE_ID_KEY);
      if (!ownerId) {
        return context.json({ error: 'Unauthorized.' }, 401);
      }

      const limitParam = context.req.query('limit');
      const cursor = context.req.query('cursor');

      const { releases, nextCursor } = await listReleases({
        ownerId,
        limit: limitParam ? Number(limitParam) : undefined,
        cursor,
      });

      return context.json({
        releases: releases.map(toHistoryRecord),
        nextCursor,
      });
    },
  },
);

export const getReleaseHistoryRoute = registerApiRoute(
  RELEASE_HISTORY_DETAIL_ROUTE_PATH,
  {
    method: 'GET',
    handler: async (context) => {
      const ownerId = context.get('requestContext').get(MASTRA_RESOURCE_ID_KEY);
      if (!ownerId) {
        return context.json({ error: 'Unauthorized.' }, 401);
      }

      const id = context.req.param('id');
      const release = await getRelease({ id, ownerId });

      if (!release) {
        return context.json({ error: 'Release not found.' }, 404);
      }

      return context.json(toHistoryRecord(release));
    },
  },
);
```

`ReleaseRecord` (repository) and `ReleaseHistoryRecord` (wire type) are structurally
identical by design — `toHistoryRecord` exists as the one place that fact is asserted,
so the two types can diverge later without every call site guessing.

- [ ] **Step 4: Register the three routes**

In `src/mastra/index.ts`, add imports:

```typescript
import { saveReleaseHistoryRoute } from './api/save-release-history-route';
import {
  listReleaseHistoryRoute,
  getReleaseHistoryRoute,
} from './api/release-history-route';
```

Update the `apiRoutes` array:

```typescript
    apiRoutes: [
      copilotKitRoute,
      slackPublishRoute,
      saveReleaseHistoryRoute,
      listReleaseHistoryRoute,
      getReleaseHistoryRoute,
    ],
```

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 6: Manual verify — routes respond**

Run: `pnpm dev:mastra`, then in another terminal (replace `TOKEN` with a valid bearer
token — `local-testing-token` works when `MASTRA_AUTH_MODE=simple`, which
`dev:mastra` already sets):

```bash
curl -s -X POST http://localhost:4111/release-history \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer local-testing-token' \
  -d '{
    "version": "1.0.0",
    "title": "Manual test release",
    "github": "## Features\n- did a thing",
    "entries": [{
      "source": "commit", "id": "abc1234", "author": "Duong",
      "timestamp": "2026-09-09T00:00:00Z", "title": "feat: did a thing",
      "type": "feat", "breaking": false
    }]
  }'
```

Expected: `201` with `{"id":"<uuid>"}`.

```bash
curl -s http://localhost:4111/release-history \
  -H 'Authorization: Bearer local-testing-token'
```

Expected: `{"releases":[{"id":"...","version":"1.0.0",...}],"nextCursor":null}`.

```bash
curl -s http://localhost:4111/release-history/<id-from-above> \
  -H 'Authorization: Bearer local-testing-token'
```

Expected: the full record, `featCount: 1`, `fixCount: 0`.

Also confirm a request with no `Authorization` header returns `401` on all three
routes.

- [ ] **Step 7: Checkpoint — pause for review (no commit)**

---

### Task 5: Client data layer — services + view mappers

**Files:**
- Create: `src/services/save-release-history.ts`
- Create: `src/services/list-release-history.ts`
- Create: `src/services/get-release-history.ts`
- Create: `src/lib/release-notes/to-release-summary.ts`
- Create: `src/lib/release-notes/to-notes-by-platform.ts`

**Interfaces:**
- Consumes: `getAuthHeader` (`src/services/get-auth-header.ts`, existing),
  `toNetworkErrorMessage` (`src/lib/network-error-message.ts`, existing),
  `getRequiredEnv` (`src/lib/env.ts`, existing), `RELEASE_HISTORY_ROUTE_PATH`,
  `buildReleaseHistoryDetailPath` (Task 4), `ReleaseHistoryRecordSchema`,
  `ListReleaseHistoryResponseSchema`, `ReleaseHistoryRecord` (Task 1).
- Produces: `saveReleaseHistory(args): Promise<{ ok: boolean; id?: string; error?:
  string }>`. `listReleaseHistory(queryParams?): Promise<{ releases:
  ReleaseHistoryRecord[]; nextCursor: string | null }>`. `getReleaseHistory(id):
  Promise<ReleaseHistoryRecord>`. `toReleaseSummary(record):
  ReleaseSummary`. `toNotesByPlatform(record): Record<KnownPlatformId, string>`.

- [ ] **Step 1: Save service**

Create `src/services/save-release-history.ts`:

```typescript
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';
import { RELEASE_HISTORY_ROUTE_PATH } from '@/constants/endpoints.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/time.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';

interface SaveReleaseHistoryArgs {
  draft: ReleaseNotesDraft & { version: string; title: string };
  entries: ReleaseEntry[];
}

interface SaveReleaseHistoryResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const TARGET = 'the release history save route';

export const saveReleaseHistory = async ({
  draft,
  entries,
}: SaveReleaseHistoryArgs): Promise<SaveReleaseHistoryResult> => {
  try {
    const baseUrl = getRequiredEnv(
      import.meta.env.VITE_MASTRA_SERVER_URL,
      'VITE_MASTRA_SERVER_URL',
    );

    const response = await fetch(`${baseUrl}${RELEASE_HISTORY_ROUTE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ...draft, entries }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const body: unknown = await response.json().catch(() => null);

    if (response.ok) {
      const id =
        typeof body === 'object' &&
        body !== null &&
        'id' in body &&
        typeof body.id === 'string'
          ? body.id
          : undefined;
      return { ok: true, id };
    }

    const error =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `Save failed with status ${response.status}.`;

    return { ok: false, error };
  } catch (error) {
    return { ok: false, error: toNetworkErrorMessage(error, TARGET) };
  }
};
```

- [ ] **Step 2: List service**

Create `src/services/list-release-history.ts`:

```typescript
import { RELEASE_HISTORY_ROUTE_PATH } from '@/constants/endpoints.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/time.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';
import {
  ListReleaseHistoryResponseSchema,
  type ListReleaseHistoryResponse,
} from '@/types/release-history-record.ts';

const TARGET = 'the release history list';

export const listReleaseHistory = async (
  queryParams: Record<string, string> = {},
): Promise<ListReleaseHistoryResponse> => {
  const baseUrl = getRequiredEnv(
    import.meta.env.VITE_MASTRA_SERVER_URL,
    'VITE_MASTRA_SERVER_URL',
  );

  const params = new URLSearchParams(queryParams);

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}${RELEASE_HISTORY_ROUTE_PATH}?${params.toString()}`,
      {
        headers: getAuthHeader(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
  } catch (error) {
    throw new Error(toNetworkErrorMessage(error, TARGET), { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Failed to list release history: ${response.status}`);
  }

  const parsed = ListReleaseHistoryResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      `The release history route returned an unexpected shape: ${parsed.error.message}`,
    );
  }

  return parsed.data;
};
```

- [ ] **Step 3: Get-detail service**

Create `src/services/get-release-history.ts`:

```typescript
import { buildReleaseHistoryDetailPath } from '@/constants/endpoints.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/time.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';
import {
  ReleaseHistoryRecordSchema,
  type ReleaseHistoryRecord,
} from '@/types/release-history-record.ts';

const TARGET = 'the release history detail';

export const getReleaseHistory = async (
  id: string,
): Promise<ReleaseHistoryRecord> => {
  const baseUrl = getRequiredEnv(
    import.meta.env.VITE_MASTRA_SERVER_URL,
    'VITE_MASTRA_SERVER_URL',
  );

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${buildReleaseHistoryDetailPath(id)}`, {
      headers: getAuthHeader(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(toNetworkErrorMessage(error, TARGET), { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Failed to load release ${id}: ${response.status}`);
  }

  const parsed = ReleaseHistoryRecordSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      `The release history route returned an unexpected shape: ${parsed.error.message}`,
    );
  }

  return parsed.data;
};
```

- [ ] **Step 4: View mappers**

Create `src/lib/release-notes/to-release-summary.ts`:

```typescript
import { ReleaseStatus } from '@/types/release.ts';
import type { ReleaseSummary } from '@/types/release.ts';
import type { ReleaseHistoryRecord } from '@/types/release-history-record.ts';

export const toReleaseSummary = (record: ReleaseHistoryRecord): ReleaseSummary => ({
  id: record.id,
  version: record.version,
  status: record.status as ReleaseStatus,
  title: record.title,
  date: record.releaseDate,
  featCount: record.featCount,
  fixCount: record.fixCount,
});
```

Create `src/lib/release-notes/to-notes-by-platform.ts`:

```typescript
import { KnownPlatformId } from '@/types/platform.ts';
import type { ReleaseHistoryRecord } from '@/types/release-history-record.ts';

export const toNotesByPlatform = (
  record: ReleaseHistoryRecord,
): Record<KnownPlatformId, string> => ({
  [KnownPlatformId.Github]: record.github,
  [KnownPlatformId.AppStore]: record.appStore ?? '',
  [KnownPlatformId.GooglePlay]: record.googlePlay ?? '',
});
```

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 6: Checkpoint — pause for review (no commit)**

---

### Task 6: Auto-save the draft on every completed render

**Files:**
- Modify: `src/hooks/use-release-draft.tsx`

**Interfaces:**
- Consumes: `useCommitEntriesView` (`src/hooks/use-commit-entries-view.ts`, existing —
  already documented as safe to call from any number of hooks/components).
  `saveReleaseHistory` (Task 5).
- Produces: no change to `useReleaseDraft`'s return type (`ReleaseDraftView`) — this
  task only adds a side effect inside the existing tool-render callback.

- [ ] **Step 1: Wire the auto-save call**

Replace the full contents of `src/hooks/use-release-draft.tsx`:

```tsx
import { Fragment, useEffect, useRef } from 'react';
import { useRenderTool, useAgentContext } from '@copilotkit/react-core/v2';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import {
  useReleaseDraftView,
  type ReleaseDraftView,
} from '@/hooks/use-release-draft-view.ts';
import { useCommitEntriesView } from '@/hooks/use-commit-entries-view.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import ToolErrorCard from '@/components/chat/ToolErrorCard.tsx';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id.ts';
import { RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME } from '@/constants/agent-tools/tools-name.ts';
import { joinLines } from '@/lib/text.ts';
import { saveReleaseHistory } from '@/services/save-release-history.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';
import {
  ReleaseNotesDraftSchema,
  type ReleaseNotesDraft,
} from '@/types/release-notes-draft.ts';

interface DraftSyncProps {
  draft: ReleaseNotesDraft;
  onSync: (draft: ReleaseNotesDraft) => void;
}

const DraftSync = ({ draft, onSync }: DraftSyncProps) => {
  useEffect(() => {
    onSync(draft);
  }, [draft, onSync]);
  return null;
};

// A draft without both version and title has no identity to save under yet
// (the agent hasn't decided them — see the bump/reset instructions follow-up
// noted in docs/superpowers/specs/2026-09-09-release-history-design.md). Live
// Preview still renders either way; History just gains no row for it.
const isSavable = (
  draft: ReleaseNotesDraft,
): draft is ReleaseNotesDraft & { version: string; title: string } =>
  Boolean(draft.version && draft.title);

// Owns the "Build release notes dynamic platform" domain end to end: registers
// the renderReleaseNotesPreview render tool — SINGLE CALL SITE, see Task 9 —
// and returns the full draft view via useReleaseDraftView underneath. Any
// OTHER hook or component that only needs to read the draft/platform content
// must call useReleaseDraftView() instead of this one.
export const useReleaseDraft = (): ReleaseDraftView => {
  const { threadId } = useThreadSession();
  const threadIdRef = useRef(threadId);
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const view = useReleaseDraftView();
  const setDraft = useReleaseWorkspaceStore((state) => state.setDraft);

  const { selectedEntries } = useCommitEntriesView();
  const selectedEntriesRef = useRef<ReleaseEntry[]>(selectedEntries);
  useEffect(() => {
    selectedEntriesRef.current = selectedEntries;
  }, [selectedEntries]);

  useRenderTool({
    name: RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME,
    parameters: ReleaseNotesDraftSchema,
    agentId: RELEASE_COPILOT_AGENT_ID,
    render: (props) => {
      if (props.status === 'inProgress') {
        return <Fragment />;
      }

      const result = ReleaseNotesDraftSchema.safeParse(props.parameters);

      if (!result.success) {
        console.warn('[useReleaseDraft] received invalid parameters', result.error);
        return (
          <ToolErrorCard
            toolName={RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME}
            detail={result.error.message}
          />
        );
      }

      return (
        <DraftSync
          draft={result.data}
          onSync={(draft) => {
            setDraft(threadIdRef.current, draft);

            const entries = selectedEntriesRef.current;
            if (isSavable(draft) && entries.length > 0) {
              void saveReleaseHistory({ draft, entries }).then((saveResult) => {
                if (!saveResult.ok) {
                  console.warn(
                    '[useReleaseDraft] history save failed',
                    saveResult.error,
                  );
                }
              });
            }
          }}
        />
      );
    },
  });

  useAgentContext({
    description: joinLines(
      'The release-notes draft currently shown in the Live Preview panel — the',
      'exact text an edit request applies to, and the text the Slack card will',
      'post. null means no draft has been generated yet. The title line is not',
      'part of these bodies: the app builds it from releaseDate/titleOverride.',
    ),
    value: { draft: view.draft },
  });

  return view;
};
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 3: Manual verify — end-to-end auto-save**

Run: `pnpm dev:all`. In the app, paste a small git log, let the agent classify and
draft release notes. Since agent instructions for `version`/`title` are not part of
this plan (explicit follow-up per the spec), the model will not fill those fields yet
— confirm in the browser console that no `[useReleaseDraft] history save failed`
warning appears (the `isSavable` guard should simply skip the save silently, which is
correct behavior for now).

To confirm the save call itself works end-to-end (independent of the model actually
populating `version`/`title`, which is the deferred follow-up), temporarily change one
line in `src/hooks/use-release-draft.tsx` to force the guard true:

```typescript
// Temporary — revert after this manual check:
if (entries.length > 0) {
```

(replacing the `if (isSavable(draft) && entries.length > 0) {` line). Reload, draft
release notes again, then run:

```bash
curl -s http://localhost:4111/release-history -H 'Authorization: Bearer local-testing-token'
```

Expected: the release you just drafted appears in `releases`, even though `version`
was `undefined` in the payload — since `SaveReleaseHistoryRequestSchema.version` is
`z.string().min(1)` (required), this specific case should instead show a `400` logged
via the console warning, confirming the client→route validation boundary works too.
Revert the temporary line change afterward.

- [ ] **Step 4: Checkpoint — pause for review (no commit)**

---

### Task 7: Wire the History page to real data

**Files:**
- Create: `src/hooks/use-release-history.ts`
- Modify: `src/routes/HistoryPage.tsx`
- Modify: `src/components/history/ReleaseHistoryList.tsx`
- Modify: `src/components/history/ReleaseHistoryListItem.tsx`

**Interfaces:**
- Consumes: `listReleaseHistory`, `getReleaseHistory` (Task 5), `toReleaseSummary`,
  `toNotesByPlatform` (Task 5), `copyText` (`src/lib/clipboard.ts`, existing).
- Produces: `useReleaseHistoryList(): { releases: ReleaseSummary[]; isLoading:
  boolean; isError: boolean }`. `useReleaseHistoryDetail(id: string | null): {
  release: ReleaseSummary | undefined; notesByPlatform: Record<KnownPlatformId,
  string> | undefined; isLoading: boolean; isError: boolean }`.
  `ReleaseHistoryList`'s prop renamed `onSelectVersion` → `onSelectRelease: (id:
  string) => void`.

- [ ] **Step 1: Create the history query hook**

Create `src/hooks/use-release-history.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { listReleaseHistory } from '@/services/list-release-history.ts';
import { getReleaseHistory } from '@/services/get-release-history.ts';
import { toReleaseSummary } from '@/lib/release-notes/to-release-summary.ts';
import { toNotesByPlatform } from '@/lib/release-notes/to-notes-by-platform.ts';
import type { ReleaseSummary } from '@/types/release.ts';
import type { KnownPlatformId } from '@/types/platform.ts';

const RELEASE_HISTORY_QUERY_KEY = ['release-history'];

export interface UseReleaseHistoryListResult {
  releases: ReleaseSummary[];
  isLoading: boolean;
  isError: boolean;
}

export const useReleaseHistoryList = (): UseReleaseHistoryListResult => {
  const { data, isLoading, isError } = useQuery({
    queryKey: RELEASE_HISTORY_QUERY_KEY,
    queryFn: () => listReleaseHistory(),
  });

  return {
    releases: data?.releases.map(toReleaseSummary) ?? [],
    isLoading,
    isError,
  };
};

export interface UseReleaseHistoryDetailResult {
  release: ReleaseSummary | undefined;
  notesByPlatform: Record<KnownPlatformId, string> | undefined;
  isLoading: boolean;
  isError: boolean;
}

export const useReleaseHistoryDetail = (
  id: string | null,
): UseReleaseHistoryDetailResult => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...RELEASE_HISTORY_QUERY_KEY, id],
    queryFn: () => getReleaseHistory(id as string),
    enabled: id !== null,
  });

  return {
    release: data ? toReleaseSummary(data) : undefined,
    notesByPlatform: data ? toNotesByPlatform(data) : undefined,
    isLoading,
    isError,
  };
};
```

- [ ] **Step 2: Rename the list's selection prop to use `id`**

Replace the full contents of `src/components/history/ReleaseHistoryList.tsx`:

```tsx
import { useState } from 'react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Input from '@/components/common/Input.tsx';
import ReleaseHistoryListItem from './ReleaseHistoryListItem.tsx';
import type { ReleaseSummary } from '@/types/release.ts';

interface ReleaseHistoryListProps {
  releases: ReleaseSummary[];
  onSelectRelease: (id: string) => void;
}

const ReleaseHistoryList = ({
  releases,
  onSelectRelease,
}: ReleaseHistoryListProps) => {
  const [search, setSearch] = useState('');
  const filteredReleases = releases.filter((release) =>
    release.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card emphasis={CardEmphasis.Outlined}>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search releases..."
      />
      <div className="mt-4 flex flex-col gap-3">
        {filteredReleases.map((release) => (
          <ReleaseHistoryListItem
            key={release.id}
            release={release}
            onSelect={onSelectRelease}
          />
        ))}
      </div>
    </Card>
  );
};

export default ReleaseHistoryList;
```

- [ ] **Step 3: Update the list item to select by `id`**

Replace the full contents of `src/components/history/ReleaseHistoryListItem.tsx`:

```tsx
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import { type ReleaseSummary, ReleaseStatus } from '@/types/release.ts';

interface ReleaseHistoryListItemProps {
  release: ReleaseSummary;
  onSelect: (id: string) => void;
}

const RELEASE_STATUS_BADGE_VARIANT: Record<ReleaseStatus, BadgeVariant> = {
  [ReleaseStatus.Published]: BadgeVariant.Success,
  [ReleaseStatus.Draft]: BadgeVariant.Warning,
  [ReleaseStatus.Archived]: BadgeVariant.Neutral,
};

const ReleaseHistoryListItem = ({
  release,
  onSelect,
}: ReleaseHistoryListItemProps) => (
  <Card emphasis={CardEmphasis.Outlined} onClick={() => onSelect(release.id)}>
    <div className="flex items-center justify-between">
      <div>
        <span className="text-body-lg text-on-surface font-medium">
          {release.title}
        </span>
        <span className="text-label-sm text-on-surface-variant ml-2">
          {release.version}
        </span>
      </div>
      <Badge variant={RELEASE_STATUS_BADGE_VARIANT[release.status]}>
        {release.status}
      </Badge>
    </div>
    <div className="text-label-sm text-on-surface-variant mt-2">
      {release.date} · {release.featCount} feat · {release.fixCount} fix
    </div>
  </Card>
);

export default ReleaseHistoryListItem;
```

- [ ] **Step 4: Wire the page itself**

Replace the full contents of `src/routes/HistoryPage.tsx`:

```tsx
import { useState } from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import ReleaseHistoryList from '@/components/history/ReleaseHistoryList.tsx';
import ReleaseVersionDetail from '@/components/history/ReleaseVersionDetail.tsx';
import {
  useReleaseHistoryList,
  useReleaseHistoryDetail,
} from '@/hooks/use-release-history.ts';
import { copyText } from '@/lib/clipboard.ts';
import type { KnownPlatformId } from '@/types/platform.ts';

const HistoryPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { releases } = useReleaseHistoryList();
  const { release, notesByPlatform } = useReleaseHistoryDetail(selectedId);

  return (
    <ErrorBoundary title="History unavailable">
      <div className="flex gap-4">
        <ReleaseHistoryList releases={releases} onSelectRelease={setSelectedId} />
        {release && notesByPlatform && (
          <ReleaseVersionDetail
            release={release}
            notesByPlatform={notesByPlatform}
            onCopy={(platformId: KnownPlatformId) =>
              void copyText(notesByPlatform[platformId])
            }
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default HistoryPage;
```

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 6: Manual verify — History page**

Run: `pnpm dev:all`. From the throwaway-edit save in Task 6 Step 3 (or after agent
instructions add real version/title later), navigate to `/history`. Confirm the saved
release appears in the list, search filters it by title, clicking it renders the
GitHub/App Store/Google Play tabs with the saved body text, and Copy copies the active
tab's content to the clipboard. Sign in as a second account and confirm the list is
empty there.

- [ ] **Step 7: Checkpoint — pause for review (no commit)**

---

## Follow-up (explicitly out of scope here, per the spec)

- Agent instructions (`buildReleaseCopilotInstructionsV2`) teaching the model to read
  `currentRelease` from working memory and decide bump vs. reset — without this,
  `version`/`title` stay unset and no row is auto-saved (Task 6's `isSavable` guard is
  exactly this fallback).
- Status transitions (`draft` → `published`/`archived`).
- Editing/deleting a saved history row.
- Retention/pruning.
