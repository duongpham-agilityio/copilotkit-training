# `ReleaseVersionDetail` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

The History screen's detail view for one release: header (version/title/status
`Badge`), a `PlatformTabs` picker, and the per-platform release notes rendered via
`MarkdownPreview`, plus a "Copy" `Button`. Purely presentational — receives the release
data and a per-platform markdown map as props.

## Depends on

`Card.tsx` + `CardEmphasis` (unit 7), `Button.tsx` + `ButtonVariant` (unit 5),
`Badge.tsx` + `BadgeVariant` (unit 2), `PlatformTabs.tsx` (unit 15),
`MarkdownPreview.tsx` (unit 18), `ReleaseSummary` + `ReleaseStatus` (unit 14,
`src/types/release.ts`), `Platform` (unit 14, `src/types/platform.ts`).

## Files

- Create: `src/components/history/ReleaseVersionDetail.tsx`

## API

```ts
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';
import MarkdownPreview from '@/components/release-notes/MarkdownPreview.tsx';
import { type ReleaseSummary, ReleaseStatus } from '@/types/release.ts';
import { Platform } from '@/types/platform.ts';

interface ReleaseVersionDetailProps {
  release: ReleaseSummary;
  notesByPlatform: Record<Platform, string>;
  onCopy: (platform: Platform) => void;
}

const RELEASE_STATUS_BADGE_VARIANT: Record<ReleaseStatus, BadgeVariant> = {
  [ReleaseStatus.Published]: BadgeVariant.Success,
  [ReleaseStatus.Draft]: BadgeVariant.Warning,
  [ReleaseStatus.Archived]: BadgeVariant.Neutral,
};

const ReleaseVersionDetail = ({
  release,
  notesByPlatform,
  onCopy,
}: ReleaseVersionDetailProps) => JSX.Element;
export default ReleaseVersionDetail;
```

`RELEASE_STATUS_BADGE_VARIANT` is duplicated from `ReleaseHistoryListItem` (unit 20)
rather than imported from it — both are small module-local constants derived from the
same `ReleaseStatus` enum, and `ReleaseHistoryListItem` doesn't export it (it's not part
of that component's public API). If a third consumer needs this mapping, promote it to
a shared helper at that point, not preemptively here.

Internal `useState<Platform>(Platform.Github)` holds the active platform tab; renders
`notesByPlatform[activePlatform]`.

## Markup shape

```tsx
<Card emphasis={CardEmphasis.Raised}>
  <Card.Header>
    <div className="flex items-center justify-between">
      <div>
        <span className="text-headline-md text-on-surface font-semibold">
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
  </Card.Header>
  <div className="mb-4 flex items-center justify-between">
    <PlatformTabs value={activePlatform} onChange={setActivePlatform} />
    <Button
      variant={ButtonVariant.Secondary}
      onClick={() => onCopy(activePlatform)}
    >
      Copy
    </Button>
  </div>
  <MarkdownPreview markdown={notesByPlatform[activePlatform]} />
</Card>
```

## Composes

`Card`, `Button`, `Badge`, `PlatformTabs`, `MarkdownPreview`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render with sample `notesByPlatform` for all 3 platforms.
  Switch platform tabs, confirm the markdown preview updates to that platform's notes.
  Click "Copy", confirm `onCopy(activePlatform)` fires with the currently active
  platform.
