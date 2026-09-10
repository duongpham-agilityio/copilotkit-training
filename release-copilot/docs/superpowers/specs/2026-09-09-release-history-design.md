# Release History Persistence — Design

**Date:** 2026-09-09
**Status:** Approved, pending implementation

## Problem

`src/components/history/` (`ReleaseHistoryList`, `ReleaseHistoryListItem`,
`ReleaseVersionDetail`) already exists but only renders props passed in — there is no
persistence behind it. Every draft/edit the agent produces today lives purely in the
CopilotKit tool-call payload rendered into the Live Preview panel
(`render-release-notes-preview-tool`'s `execute()` is a no-op returning `{ ok: true }`);
nothing is saved once the chat moves on. The user wants every build the agent produces
saved automatically (no explicit "Save" button) so the History page can list and reopen
past builds the same way Live Preview shows the current one.

## Solution

Persist to the same Turso database the project already uses for Mastra agent state, via
`LibSQLFactoryStorage` (`@mastra/libsql`) — one connection, agent state (threads,
memory) through `getMastraStorage()`, and a new app-owned `releases` collection through
its generic `ops` query surface. A new, Agent-independent API route
(`save-release-history-route.ts`, same shape as the existing `slack-publish-route.ts`)
does the actual write; the render tool itself is untouched. The frontend calls that
route automatically right after CopilotKit renders a completed draft/edit tool call,
sending the currently-selected commit/PR entries it already holds in state. Version and
title are decided by the LLM as two new fields on `ReleaseNotesDraftSchema` (same tier
as the existing `releaseDate`/`titleOverride`), since only the model has the
conversational context to know whether a build continues the release in progress
(bump) or starts a new one (reset to `1.0.0`).

## Rejected alternatives

| Rejected | Reason |
| --- | --- |
| Write the history row inside `render-release-notes-preview-tool`'s `execute()` | Couples a DB write to the Agent tool-call lifecycle — a slow/failed write would surface as a tool-result error in the chat loop, and the tool would need `entries` re-stated by the LLM (see next row). Rejected per explicit feedback: persistence isn't an Agent concern. |
| Have the LLM re-emit the full `ReleaseEntry[]` it drafted from, as tool input | The exact entry list is already the client's own state (commit-list selection, source of truth per this project's "selection happens before generation" rule) — asking the model to copy it back adds tokens and a drift risk for no benefit. |
| Hand-rolled `@libsql/client` + own SQL migrations, bypassing Mastra storage entirely | Fully documented, standard path, but throws away the one-connection contract `LibSQLFactoryStorage` already gives this exact case (agent state + app table sharing one Turso DB) and means hand-writing/maintaining migrations. Considered explicitly (see "Storage backend" below) and rejected in favor of the Mastra-native mechanism. |
| App code computes the MAJOR.MINOR.PATCH bump deterministically from entry classification (breaking → major, feat → minor, fix → patch) | Rejected per feedback — a user can be mid-build on one release (add/remove commits, redraft) or start a completely unrelated one in the same day/session, and only conversational context (not the entries array alone) can tell which. Left to the LLM. |
| One saved row per explicit "Save" click | Rejected per feedback — every draft/edit call must save automatically, no manual step. |

## Storage backend: `LibSQLFactoryStorage`

Verified present and real (not assumed from training data, per this project's `mastra`
skill rule) by reading the installed package directly, since it is **not yet on the
public docs site** (`mastra.ai/llms.txt` / embedded `dist/docs/` — zero hits):

- Exported from `@mastra/libsql`'s root (`dist/index.d.ts` → `./storage/index.js` →
  `LibSQLFactoryStorage`), not an internal-only leak.
- `@mastra/libsql` CHANGELOG: added in `1.17.0` (installed: `1.19.0`, so available),
  with a follow-up bugfix release (`#20002`, schema-drift + unique-violation
  classification) — actively maintained, not a one-off experiment.
- `@mastra/core` CHANGELOG has a full usage example (`FactoryStorageDomain` +
  `LibSQLFactoryStorage`, PR `#19681`).

Risk accepted explicitly by the user: undocumented on the public site, so debugging an
issue means reading `node_modules/@mastra/libsql/dist/storage/factory-storage.d.ts`
and the CHANGELOG rather than a docs page.

## Data flow

```
User chat "build release notes for GitHub", 5 entries selected
        │
        ▼
release-copilot-agent — classify + draft (unchanged)
        │  calls render-release-notes-preview-tool
        │  (2 new fields: version, title — LLM-authored)
        ▼
Tool execute() — UNCHANGED, still returns { ok: true }
        │
        ▼
CopilotKit renders Live Preview from the tool-call args (unchanged)
        │
        ▼
Frontend component watching that tool call — auto-triggers, no Save button:
        │  calls src/services/save-release-history.ts
        │  sends: version, title, releaseDate, titleOverride,
        │  github, appStore, googlePlay, platforms
        │  + entries (from the commit-list selection state already held
        │    client-side — NOT re-requested from the LLM)
        ▼
POST src/mastra/api/save-release-history-route.ts
        │  owner_id read from MASTRA_RESOURCE_ID_KEY on the request context
        │  (same middleware the Supabase auth design already sets up)
        │  calls releases-repository.insertRelease(...)
        ▼
Turso — one new row in the "releases" collection (via ops, no raw SQL)
```

Reads mirror this: `ReleaseHistoryList` → `list-release-history` service → GET route →
`listReleases(ownerId)` → `ReleaseSummary[]`. Selecting an item → `get-release-history`
service → GET route → `getRelease(id, ownerId)` → the same `notesByPlatform` shape
`ReleaseVersionDetail` already takes.

## Schema — `releases` collection

Declared via `CollectionSchema` (`FactoryStorage.ensureCollections`), additive-only —
safe to re-run, never drops/retypes a column.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid-pk` | Generated by the ops layer on insert. The real lookup key. |
| `owner_id` | `text` NOT NULL | Supabase user id (`MASTRA_RESOURCE_ID_KEY`) — per-user scope. |
| `version` | `text` NOT NULL | LLM-authored, e.g. `"1.2.0"`. Not unique — a legitimate "new release" build can restart at `1.0.0` for the same user. |
| `title` | `text` NOT NULL | LLM-authored, distinguishes one release track from another built the same day. |
| `release_date` | `text` NOT NULL | `yyyymmdd`, same value/format as `ReleaseNotesDraft.releaseDate`. |
| `title_override` | `text` nullable | Mirrors the existing `titleOverride` field. |
| `status` | `text` NOT NULL, default `'draft'` | Maps the existing `ReleaseStatus` const enum (`draft`/`published`/`archived`). Nothing flips this yet beyond the default — see Out of scope. |
| `github_body` | `text` NOT NULL | |
| `app_store_body` | `text` nullable | |
| `google_play_body` | `text` nullable | |
| `platforms_json` | `json` NOT NULL, default `[]` | Dynamic `PlatformDraft[]` (Slack, changelog, ...). |
| `entries_json` | `json` NOT NULL | Full `ReleaseEntry[]` used to build this row. |
| `feat_count` | `integer` NOT NULL | Derived at write time (`entries.filter(type === 'feat').length`), cached for list rendering — matches `ReleaseSummary.featCount`. |
| `fix_count` | `integer` NOT NULL | Same, for `type === 'fix'` — matches `ReleaseSummary.fixCount`. |
| `created_at` | `timestamp` NOT NULL | Set at insert time. |

Index: `(owner_id, created_at desc)`, non-unique — list ordering per user. No unique
index on `(owner_id, version)`, per the "reset to 1.0.0" case above.

## Versioning semantics

`version`/`title` are decided by the model, not computed by app code (see Rejected
alternatives). For this to work reliably across a `lastMessages: 6`-windowed memory
(`release-copilot-agent.ts`), the agent needs durable state beyond the raw chat
transcript: extend `WorkingMemorySchema` with

```typescript
currentRelease: z
  .object({ version: z.string(), title: z.string() })
  .optional()
  .describe(
    'The release currently being iterated on in this conversation — the last ' +
    'version/title the agent produced. Read it before drafting to decide whether ' +
    'this build continues that release (bump) or starts a different one (reset to ' +
    '1.0.0, new title). Update it after every draft/edit call.',
  ),
```

Wiring the actual bump-vs-reset instructions into `buildReleaseCopilotInstructionsV2`
is prompt/agent-instructions work, not a DB concern — tracked as a follow-up, out of
scope for this spec.

## Files

### New

- `src/mastra/storage/factory-storage.ts` — singleton `LibSQLFactoryStorage`, same
  `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` env vars already used by the current
  `LibSQLStore`.
- `src/mastra/storage/releases-collection.ts` — the `CollectionSchema` above.
- `src/mastra/storage/releases-repository.ts` — `insertRelease` / `listReleases` /
  `getRelease`, plain functions over `FactoryStorageOps`, no Agent import. Validates
  `entries_json`/`platforms_json` against `ReleaseEntrySchema`/`PlatformDraftSchema` at
  the read boundary.
- `src/mastra/api/save-release-history-route.ts` — POST, Zod-validates the body,
  reads `owner_id` from `MASTRA_RESOURCE_ID_KEY`, calls `insertRelease`.
- `src/mastra/api/release-history-route.ts` — GET, list (`?cursor=`/`?limit=`) and
  single-record (`?id=`) lookup, both scoped to the authenticated `owner_id`.
- `src/services/save-release-history.ts` — client-side POST, mirrors
  `publish-to-slack.ts`.
- `src/services/list-release-history.ts`, `src/services/get-release-history.ts` —
  client-side GET, mirror `list-threads.ts`.
- `src/constants/endpoints.ts` — add `SAVE_RELEASE_HISTORY_ROUTE_PATH`,
  `RELEASE_HISTORY_ROUTE_PATH`.

### Modified

- `src/mastra/index.ts` — `LibSQLStore` → `LibSQLFactoryStorage.getMastraStorage()`;
  register the two new routes in `apiRoutes`.
- `src/types/release-notes-draft.ts` — add `version`, `title` to
  `ReleaseNotesDraftSchema`.
- `src/types/working-memory.ts` — add `currentRelease` to `WorkingMemorySchema`.
- `src/types/release.ts` — add `id: string` to `ReleaseSummary` (the real lookup key;
  `version` stays a display label only, since it isn't guaranteed unique per user).
- `src/components/history/ReleaseHistoryList.tsx`,
  `src/components/history/ReleaseVersionDetail.tsx` — switch `onSelectVersion`/lookup
  from `release.version` to `release.id`.
- The component that currently watches `render-release-notes-preview-tool`'s
  completion for Live Preview — add the auto-save call described in Data flow.

## Configuration

No new environment variables — reuses `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`, already
present for the current `LibSQLStore` in `src/mastra/index.ts`.

## Error handling

- `save-release-history-route`: Zod validation failure → 400. Missing `owner_id` (no
  authenticated request context) → 401, consistent with every other Mastra route once
  the Supabase auth design lands. A write failure (Turso unreachable, unique-violation
  from `LibSQLFactoryStorage`'s own error classification) → 502, logged; the Live
  Preview still rendered successfully from the tool call, so a save failure degrades to
  "this build won't appear in History" rather than blocking the chat response.
- `release-history-route` (GET): unknown/foreign `id` (belongs to a different
  `owner_id`) → 404, never leak another user's row.

## Verification

`pnpm lint` and `pnpm build` must pass clean. No unit tests or Storybook stories, per
this project's established verification approach.

Manual end-to-end:

1. Draft release notes for GitHub with a few entries selected — confirm a row appears
   in Turso (`releases` collection) with `version: "1.0.0"`.
2. Ask for an edit ("make it less technical") — confirm a new row is saved (per the
   "every draft/edit creates a row" requirement), version bumped by the model.
3. Change the commit selection entirely and ask for a fresh draft — confirm the model
   resets to a new version/title track rather than continuing the old one.
4. Open the History page — confirm the list shows all saved rows for the signed-in
   user only, ordered newest first.
5. Select one — confirm `ReleaseVersionDetail` renders the same per-platform content
   that was live-previewed at save time.
6. Sign in as a second account — confirm it sees an empty history, not the first
   account's rows (owner_id scoping).

## Out of scope

- Agent instructions for the actual bump/reset decision logic (prompt work, tracked as
  a follow-up on top of the `currentRelease` working-memory field this spec adds).
- Status transitions (`draft` → `published`/`archived`) — the column exists with a
  `draft` default; nothing (e.g. a successful Slack publish) flips it yet.
- Editing or deleting a saved history row from the UI.
- Retention/pruning of old history rows.
- Storage of `thread_id` linking a release back to its originating chat thread —
  considered, deferred; not required for the History page as designed.
