---
date: 2026-09-24
branch: fix/disable-archive-when-archived
files: [src/components/release-notes/LivePreviewPanel.tsx]
severity: low
---

# Archive button stays clickable after the release is archived

## Summary

After archiving a draft from the Live Preview panel, the Archive button showed "Archived" but remained enabled, so the user could click it repeatedly and create duplicate History records for the same version.

## Root Cause

`src/components/release-notes/LivePreviewPanel.tsx:100` computed `disabled` from `!markdown || !canArchive || isArchiving` and ignored the `isArchived` prop. The prop was only used to pick the label in `renderArchiveContent()` (`LivePreviewPanel.tsx:53`).

## Explanation

`useArchiveRelease` marks the draft as archived on success (`markDraftArchived`), and `useReleaseDraftView` exposes `isArchived`, which `DashboardPage` passes down. The label switched to "Archived", but the button's `disabled` condition never included that state. Each further click called `archive(draft)` again; `SaveReleaseHistoryRequest` documents that archiving the same version again creates a new record.

## Solution

Include `isArchived` in the button's `disabled` condition, so the UI blocks re-archiving using state that already existed rather than adding new tracking.

## Solution Details

`LivePreviewPanel.tsx:100`:

```diff
-disabled={!markdown || !canArchive || isArchiving}
+disabled={!markdown || !canArchive || isArchiving || isArchived}
```

The existing "Archived" label (check icon) now displays on a disabled button. Limitation: `isArchived` comes from the session store (`archivedDraftKeys` in `src/store/draft-slice.ts`, keyed by exact draft JSON), so it resets on page reload or when the draft content changes. Checking against server-side release history is out of scope for this fix.

## Verification

- `pnpm lint` (eslint .) — completed with no errors or warnings.
- `pnpm build` (tsc -b + vite build) — succeeded ("✓ built in 1.36s"); only the existing chunk-size warning appeared.
- Not run: no unit tests (project policy is lint + build only); the disabled state was not exercised in a browser.

## Prevention

`LivePreviewPanel.stories.tsx` already has an `isArchived: true` story; reviewers should check that story shows a disabled button when touching archive logic. Cross-reload protection would need History-based detection (follow-up).
