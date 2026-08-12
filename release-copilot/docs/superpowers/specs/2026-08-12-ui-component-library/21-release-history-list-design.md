# `ReleaseHistoryList` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

The History screen's list panel: search `Input` + a `Card`-wrapped list of
`ReleaseHistoryListItem`. Owns the search-text filter state; `onSelectVersion` bubbles
the chosen release up to the caller (page-assembly layer, out of scope here) to drive
navigation to `ReleaseVersionDetail`.

## Depends on

`Card.tsx` + `CardEmphasis` (unit 7), `Input.tsx` (unit 10),
`ReleaseHistoryListItem.tsx` (unit 20), `ReleaseSummary` (unit 14).

## Files

- Create: `src/components/history/ReleaseHistoryList.tsx`

## API

```ts
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Input from '@/components/common/Input.tsx';
import ReleaseHistoryListItem from './ReleaseHistoryListItem.tsx';
import type { ReleaseSummary } from '@/types/release.ts';

interface ReleaseHistoryListProps {
  releases: ReleaseSummary[];
  onSelectVersion: (version: string) => void;
}

const ReleaseHistoryList = ({
  releases,
  onSelectVersion,
}: ReleaseHistoryListProps) => JSX.Element;
export default ReleaseHistoryList;
```

Internal `useState<string>('')` holds the search text; releases are filtered by
case-insensitive substring match on `title` before rendering — filter state stays
local since no sibling component needs it.

## Markup shape

```tsx
<Card emphasis={CardEmphasis.Outlined}>
  <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search releases..."
  />
  <div className="mt-4 flex flex-col gap-3">
    {filteredReleases.map((release) => (
      <ReleaseHistoryListItem
        key={release.version}
        release={release}
        onSelect={onSelectVersion}
      />
    ))}
  </div>
</Card>
```

## Composes

`Card`, `Input`, `ReleaseHistoryListItem`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render with 3+ releases. Type a partial title into the search
  box, confirm the list filters live. Clear the search, confirm all releases return.
  Click a row, confirm `onSelectVersion` fires with the right `version`.
