# Shared domain types — Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Domain types consumed by the feature components in units 15-22 (`PlatformTabs`,
`CommitListItem`, `CommitListPanel`, `ReleaseHistoryListItem`, `ReleaseHistoryList`,
`ReleaseVersionDetail`). Grouped as one push: three files, each a handful of lines of
pure type declarations with no independent behavior to review separately.

## Files

- Create: `src/types/commit.ts`
- Create: `src/types/platform.ts`
- Create: `src/types/release.ts`

## API

`src/types/commit.ts`:

```ts
export const enum CommitType {
  Feat = 'feat',
  Fix = 'fix',
  Chore = 'chore',
}

export interface Commit {
  hash: string;
  type: string;
  message: string;
  author: string;
  timestamp: string;
}
```

**Revised 2026-08-13:** `Commit.type` was originally `CommitType` (closed to the three
enum values). Widened to `string` at the user's request — teams may use custom commit
prefixes beyond `feat`/`fix`/`chore` (e.g. `hotfix:`), and the closed enum couldn't
represent them. `CommitType` itself is unchanged and still names the three well-known
values with dedicated badge colors in `CommitListItem` (Task 16); it's now a
recognized-subset helper rather than the exhaustive type. See `CommitListPanel`
(Task 17)'s spec for the consumer-side change (filter tabs derived from data).

`src/types/platform.ts`:

```ts
export const enum Platform {
  Github = 'github',
  AppStore = 'app-store',
  GooglePlay = 'google-play',
}
```

`src/types/release.ts`:

```ts
export const enum ReleaseStatus {
  Published = 'published',
  Draft = 'draft',
  Archived = 'archived',
}

export interface ReleaseSummary {
  version: string;
  status: ReleaseStatus;
  title: string;
  date: string;
  featCount: number;
  fixCount: number;
}
```

`timestamp`/`date` are `string` (ISO 8601), not `Date` — these types cross the
server/client boundary (Mastra tool output → React props) where `Date` doesn't
serialize; formatting to a display string happens at render time in the consuming
component, not in the type.

## Composes

Nothing — leaf type declarations, zero runtime dependencies.

## Verification

- `pnpm lint` and `pnpm build` clean. No visual check (types only) — correctness is
  proven by units 15-22 successfully importing and using these types without `any` or
  type-error workarounds.
