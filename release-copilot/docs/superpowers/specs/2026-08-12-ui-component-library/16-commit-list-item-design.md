# `CommitListItem` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

One row in the commit pre-filter list: checkbox + commit type badge + message + author
avatar + hash. Maps `CommitType` to `BadgeVariant` (the only place this mapping lives).

## Depends on

`Checkbox.tsx` (unit 9), `Badge.tsx` + `BadgeVariant` (unit 2), `MonoTag.tsx` (unit 4),
`Avatar.tsx` (unit 3), `Commit` + `CommitType` (unit 14, `src/types/commit.ts`).

## Files

- Create: `src/components/commit-list/CommitListItem.tsx`

## API

```ts
import Checkbox from '@/components/common/Checkbox.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import MonoTag from '@/components/common/MonoTag.tsx';
import Avatar from '@/components/common/Avatar.tsx';
import { type Commit, CommitType } from '@/types/commit.ts';

interface CommitListItemProps {
  commit: Commit;
  selected: boolean;
  onToggle: (hash: string) => void;
}

const COMMIT_TYPE_BADGE_VARIANT: Record<CommitType, BadgeVariant> = {
  [CommitType.Feat]: BadgeVariant.Success,
  [CommitType.Fix]: BadgeVariant.Error,
  [CommitType.Chore]: BadgeVariant.Neutral,
};

const CommitListItem = ({ commit, selected, onToggle }: CommitListItemProps) =>
  JSX.Element;
export default CommitListItem;
```

`type Commit` imported with `import type`-style inline (`type Commit`) alongside the
value import `CommitType` from the same module — required by `verbatimModuleSyntax`
when mixing type-only and value imports from one file.

## Markup shape

```tsx
<div className="flex items-center gap-3 py-3">
  <Checkbox
    checked={selected}
    onChange={() => onToggle(commit.hash)}
    aria-label={`Select commit ${commit.hash}`}
  />
  <Badge variant={COMMIT_TYPE_BADGE_VARIANT[commit.type]}>{commit.type}</Badge>
  <span className="text-body-md text-on-surface flex-1 truncate">
    {commit.message}
  </span>
  <Avatar name={commit.author} />
  <MonoTag>{commit.hash.slice(0, 7)}</MonoTag>
</div>
```

## Composes

`Checkbox`, `Badge`, `MonoTag`, `Avatar`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render one `Commit` of each `CommitType`. Confirm `Feat` shows a
  `Success` (emerald) badge, `Fix` shows `Error` (rose), `Chore` shows `Neutral` (gray)
  — not a 1:1 color-name coincidence, an explicit mapping. Toggle the checkbox, confirm
  `onToggle` fires with `commit.hash`.
