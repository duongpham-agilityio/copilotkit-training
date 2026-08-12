# `ReleaseHistoryListItem` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

One row in the History screen's release list: version, title, date, feat/fix counts,
and a status `Badge`. Maps `ReleaseStatus` to `BadgeVariant` (the only place this
mapping lives — a separate mapping from `CommitListItem`'s `CommitType` one, since the
two enums have different value sets).

## Depends on

`Card.tsx` + `CardEmphasis` (unit 7), `Badge.tsx` + `BadgeVariant` (unit 2),
`ReleaseSummary` + `ReleaseStatus` (unit 14, `src/types/release.ts`).

## Files

- Create: `src/components/history/ReleaseHistoryListItem.tsx`

## API

```ts
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import { type ReleaseSummary, ReleaseStatus } from '@/types/release.ts';

interface ReleaseHistoryListItemProps {
  release: ReleaseSummary;
  onSelect: (version: string) => void;
}

const RELEASE_STATUS_BADGE_VARIANT: Record<ReleaseStatus, BadgeVariant> = {
  [ReleaseStatus.Published]: BadgeVariant.Success,
  [ReleaseStatus.Draft]: BadgeVariant.Warning,
  [ReleaseStatus.Archived]: BadgeVariant.Neutral,
};

const ReleaseHistoryListItem = ({
  release,
  onSelect,
}: ReleaseHistoryListItemProps) => JSX.Element;
export default ReleaseHistoryListItem;
```

## Markup shape

```tsx
<Card
  emphasis={CardEmphasis.Outlined}
  onClick={() => onSelect(release.version)}
>
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
```

`Card`'s `onClick` prop (unit 7) handles both the click handler and the `cursor-pointer`
styling — no `className` override needed here.

## Composes

`Card`, `Badge`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render one release of each `ReleaseStatus`. Confirm `Published`
  shows `Success` (emerald), `Draft` shows `Warning` (violet-purple, not amber),
  `Archived` shows `Neutral` (gray). Click a row, confirm `onSelect` fires with
  `release.version`.
