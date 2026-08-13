# `CommitListPanel` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

The Dashboard's commit pre-filter panel: a `Card` containing a type filter (`Tabs`,
`Pill`) and the filtered list of `CommitListItem` rows. Owns the "all vs. one type"
filter state; selection state (`selectedHashes`) is lifted to the caller (controlled),
since the caller needs it to drive the release-notes generation request.

## Depends on

`Card.tsx` + `CardEmphasis` (unit 7), `Tabs.tsx` + `TabsVariant` (unit 8),
`CommitListItem.tsx` (unit 16), `Commit` + `CommitType` (unit 14).

## Files

- Create: `src/components/commit-list/CommitListPanel.tsx`

## API

```ts
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Tabs, { TabsVariant } from '@/components/common/Tabs.tsx';
import CommitListItem from './CommitListItem.tsx';
import { type Commit, CommitType } from '@/types/commit.ts';

interface CommitListPanelProps {
  commits: Commit[];
  selectedHashes: Set<string>;
  onToggle: (hash: string) => void;
}

const FILTER_ITEMS = [
  { value: 'all', label: 'All' },
  { value: CommitType.Feat, label: 'Feat' },
  { value: CommitType.Fix, label: 'Fix' },
  { value: CommitType.Chore, label: 'Chore' },
];

const CommitListPanel = ({
  commits,
  selectedHashes,
  onToggle,
}: CommitListPanelProps) => JSX.Element;
export default CommitListPanel;
```

Internal `useState<string>('all')` holds the active filter value; `commits.filter(...)`
derives the visible rows — not lifted to the caller, since no other component needs the
filter selection, only the final `selectedHashes`.

## Markup shape

```tsx
<Card emphasis={CardEmphasis.Raised}>
  <Card.Header>
    <Tabs
      items={FILTER_ITEMS}
      value={filter}
      onChange={setFilter}
      variant={TabsVariant.Pill}
    />
  </Card.Header>
  <div className="divide-outline-variant divide-y">
    {visibleCommits.map((commit) => (
      <CommitListItem
        key={commit.hash}
        commit={commit}
        selected={selectedHashes.has(commit.hash)}
        onToggle={onToggle}
      />
    ))}
  </div>
</Card>
```

## Composes

`Card`, `Tabs`, `CommitListItem`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render with a mixed list of `feat`/`fix`/`chore` commits.
  Confirm "All" shows every row; clicking "Feat" filters to only `feat` commits.
  Toggle a checkbox, confirm `onToggle` bubbles up with the correct hash.

## Revised 2026-08-13: data-driven filter tabs

Requested by the user: some teams use custom commit-type prefixes beyond
`feat`/`fix`/`chore` (e.g. `hotfix:`) — a hardcoded `FILTER_ITEMS` list can't
represent an arbitrary one. Depends on the `Commit.type: string` widening in unit 14.

`FILTER_ITEMS` (module-level constant) replaced with `filterItems`, a
`useMemo`-derived value computed from the distinct `type` values present in the
`commits` prop:

```tsx
const KNOWN_TYPE_LABEL: Record<CommitType, string> = {
  [CommitType.Feat]: 'Feat',
  [CommitType.Fix]: 'Fix',
  [CommitType.Chore]: 'Chore',
};

const filterLabelForType = (type: string): string =>
  (KNOWN_TYPE_LABEL as Record<string, string>)[type] ??
  `${type.charAt(0).toUpperCase()}${type.slice(1)}`;

const filterItems = useMemo<TabItem[]>(() => {
  const types = Array.from(new Set(commits.map((commit) => commit.type)));
  return [
    { value: 'all', label: 'All' },
    ...types.map((type) => ({ value: type, label: filterLabelForType(type) })),
  ];
}, [commits]);
```

The three well-known `CommitType` values still get their canonical label
(`Feat`/`Fix`/`Chore`); any other type present in the data gets an auto-capitalized
tab (`hotfix` → `Hotfix`) with no code change required per new prefix.

Verification addendum: render with a `hotfix:` commit added to the mixed
`feat`/`fix`/`chore` fixture. Confirm a "Hotfix" tab appears automatically and
filtering to it shows only that commit (screenshot-verified via Playwright against
the `CustomType` story in `CommitListPanel.stories.tsx`).
