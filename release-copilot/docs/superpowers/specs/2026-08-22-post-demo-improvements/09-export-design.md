# 09 — Export

Date: 2026-08-22
Estimate: 0.8h · Branch: `feat/export-release-notes` · Depends on: 02 (and 07 for the
card button)
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 7 of the source design

## Goal

Download the generated release notes. No new dependency — a Blob and an anchor cover
it.

`src/lib/export/` **already exists** as an empty folder holding a `.gitkeep`. This
task fills a slot that was left open rather than creating new structure.

## Files

**Create**
- `src/lib/export/download-text-file.ts`
- `src/lib/export/release-notes-filename.ts`

**Modify**
- `src/components/release-notes/LivePreviewPanel.tsx` — Export button beside
  `CopyButton`
- `src/components/release-notes/PlatformDraftCard.tsx` — wire the handler into the
  action bar's Export button (task 07 left the slot)

**Delete**
- `src/lib/export/.gitkeep`

## Design

### Two pure functions, kept apart

```ts
// download-text-file.ts — knows nothing about release notes
export const downloadTextFile = (filename: string, content: string): void => { ... }
```

Blob → `URL.createObjectURL` → click a hidden anchor → **`revokeObjectURL`**. Skipping
the revoke is a silent memory leak — the browser holds the blob until the tab closes.

```ts
// release-notes-filename.ts — knows nothing about the DOM
export const releaseNotesFilename = (
  platformId: string,
  releaseDate: string,
): string => ...
```

`release-notes-<platformId>-<releaseDate>.md` for GitHub (markdown), `.txt` for other
platforms (plain text) — consistent with the schema forbidding markdown on App Store
and Google Play.

`releaseDate` comes from the existing `buildReleaseTitle` logic (`draft.releaseDate ??
formatReleaseDate()`); do not re-derive the format.

Two files because one touches the DOM and one is pure string work — the second is
testable without jsdom.

### Where the buttons go

| Location | Exported content |
| --- | --- |
| `LivePreviewPanel` | `composeGithubContent(draft)` — the GitHub version, `.md` |
| `PlatformDraftCard` | `composePlatformContent(draft, platformDraft)` — `.txt` |
| `PlatformComparisonGrid` | one button per column, reusing task 07's **same** action bar |

The third row needs no code of its own: if task 07 extracted the action bar correctly,
the comparison grid gets export for free. If it needs extra code, task 07 drew the
boundary wrong — fix it there rather than patching here.

Exports **always include the title line** (`composeGithubContent` /
`composePlatformContent` already prepend it), matching exactly what the Copy button
produces. A downloaded file and the clipboard differing is a bug that is hard to spot.

## Acceptance criteria

- [ ] The `LivePreviewPanel` Export button downloads a `.md` whose content is
      **identical** to what Copy produces
- [ ] The `PlatformDraftCard` Export button downloads the right platform's `.txt`
- [ ] Filenames carry the correct `platformId` and `releaseDate`
- [ ] No draft → button disabled (matching the existing `CopyButton`)
- [ ] `URL.revokeObjectURL` is called
- [ ] No new dependency in `package.json`
- [ ] `.gitkeep` deleted
- [ ] Lint + build clean

## Out of scope

- Exporting several platforms into one zip
- PDF / HTML export
- Choosing a save directory (File System Access API) — uneven browser support

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Exported content diverges from copied content | Medium | Both call the **same** compose function. It is in the acceptance criteria |
| Task 07 has not merged, so there is no second button site | Medium | Do the `LivePreviewPanel` half first, the card half after. They do not depend on each other |
