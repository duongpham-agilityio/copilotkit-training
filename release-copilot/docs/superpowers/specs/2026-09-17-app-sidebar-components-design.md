# App Sidebar Components — Design

**Date:** 2026-09-17
**Status:** Approved, pending implementation

## Problem

The Claude Design artifact `https://claude.ai/artifact/QN8jW4LoRZCzqcPwrhypLx` ("Release
Builder — UI Redesign") puts all app-wide navigation — workspace switch, New thread,
search, the Release history link, and the account menu — inside a single persistent left
sidebar shared by the Dashboard (`Main.dc.html`) and Release History (`History.dc.html`)
boards, and drops the top header/tab bar entirely.

The current app splits this chrome across two places: `AppHeader.tsx` (Dashboard/History
tabs, Settings/Help/Avatar icon buttons) mounted once in `AppShell.tsx`, and
`ThreadSidebar.tsx` (New thread + a flat thread list, no grouping, no row actions, no
account/workspace affordances) mounted only inside `DashboardLayout` on the Dashboard
route. `HistoryPage.tsx` has no sidebar at all.

`docs/superpowers/specs/2026-09-16-dashboard-ui-v2-design.md` explicitly rejected moving
Dashboard/History nav into the sidebar ("wider blast radius for no gain in this pass").
The user has now explicitly signed off on reversing that call to match the new design.

## Scope

This spec — and its plan — build the **components only**: `AppSidebar`, `WorkspaceSwitch`,
`AccountMenu`, and a restyled `ThreadListItem`, each with a Storybook story. **No page or
route file is touched** (`AppShell.tsx`, `App.tsx`, `DashboardLayout.tsx`,
`DashboardPage.tsx`, `HistoryPage.tsx`, `ThreadSidebar.tsx` are all unchanged in this
pass). Wiring these components into the actual page chrome — replacing `AppHeader`,
lifting sidebar collapse state, grouping the thread list by day — is a follow-up plan the
user reviews against the rendered Storybook UI first.

**Explicitly out of scope**, same reasons as `2026-09-17-design-system-foundation-design.md`:

- Thread row 3-dot menu (Rename / Pin / Delete) — no backend action exists for any of the
  three; `useThreadSession()` exposes only `startNewChat`/`selectThread`. Building menu UI
  with no handler behind it is dead weight, not a stub worth keeping.
- Release-history platform badge and Sent/Not-sent status — `ReleaseSummary` has no
  `platform`/`sent` field (confirmed by reading `src/types/release.ts`); adding either is a
  storage-layer change, already deferred once.
- Search-threads and Rename/Keyboard-shortcuts affordances that have no real handler stay
  visual stubs with no `onClick` — the same pattern already in production for the
  `Settings`/`Help` icon buttons in `App.tsx`'s `HeaderActions`. This is an accepted
  existing convention, not new scope-cutting.

## Global decisions

- **`AppSidebar` takes `children` as a slot**, not a `threads` prop. The Dashboard route
  will later pass `ThreadSidebar`'s list content into it; the History route will pass
  nothing. `AppSidebar` itself knows nothing about threads — it only owns the chrome shared
  by both pages (workspace switch, new-thread action, search stub, history link, account
  menu) and the expanded/rail collapse visual state. This mirrors `DashboardLayout`'s
  existing "layout owns regions, caller owns content" contract.
- **Collapse state is a controlled prop** (`isCollapsed` + `onToggleCollapse`), not internal
  `useState` — matches `DashboardLayout`'s sidebar today (state lives in the page/shell that
  mounts it) and lets the Storybook story exercise both visual states without needing a
  wrapping page.
- **New thread is a `<Link>`, not a button with a click handler**, in both the expanded and
  rail rows. The design's own History board renders it as `<a href="Main.dc.html">`
  (navigate to Dashboard) — `AppSidebar` doesn't know whether it's already mounted on the
  Dashboard route, so it can't conditionally call `startNewChat()` itself. That decision
  (navigate vs. also reset the thread) belongs to whichever page composes `AppSidebar`,
  in the follow-up wiring plan. This spec's `AppSidebar` only accepts a `newThreadHref`
  prop (defaults to `ROUTE_DASHBOARD`) and renders the `<Link>`; per-route behavior is a
  wiring concern out of scope here.
- **`WorkspaceSwitch` is presentational only**, `onClick` optional, no dropdown. The app has
  exactly one workspace today; building a picker with one, unremovable option is the
  "hypothetical future requirement" the code-style rules warn against. It renders the mark,
  name, and repo slug from props so its story can demonstrate real content without a store.
- **`AccountMenu` composes the existing `DropdownMenu`**, trigger is the avatar+name row
  (matches the design's account row exactly — avatar, name, a `⋯` icon button that opens the
  menu). Items: `Settings` and `Keyboard shortcuts` are stub `DropdownMenu.Item`s with an
  empty `onClick` (same convention as `Settings`/`Help` today); `Sign out` is real — it's
  the first place in the app that surfaces `useAuth().signOut()` in the UI. `AccountMenu`
  takes `userName`, `avatarSrc?`, and `onSignOut` as props; it does not call `useAuth()`
  itself, keeping it a pure presentational component usable from Storybook without an auth
  context.
- **`ThreadListItem` gains an optional `time?: string` prop** (pre-formatted, e.g. `"2h"`,
  `"Tue"`, `"Aug 26"`), not a `Date`/`updatedAt` passed through. Formatting a timestamp into
  the design's relative/day format and grouping rows under `Today`/`Yesterday`/`Previous 30
  days` headers are list-composition concerns that belong to whichever component assembles
  the list (`ThreadSidebar`, in the follow-up plan) — `ThreadListItem` stays a dumb row that
  renders whatever string it's given, unaffected by how that string was computed. No 3-dot
  menu is added (see Scope).
- **No new theme tokens.** Every color/spacing value used by these four components already
  exists (`--color-primary`, `on-surface-variant`, `outline-variant`, etc.), confirmed
  against `src/index.css`'s `@theme inline` block.
- **Storybook stories are in scope for this pass** — the user explicitly asked for them,
  reversing the "no Storybook" convention from `2026-09-16-dashboard-ui-v2-design.md` for
  this component set specifically (the user wants to review the built UI via Storybook
  before any page is touched). Follows the existing pattern: `.stories.tsx` beside each
  component's folder, `render:` with local `useState` for the two components with open/closed
  or collapsed/expanded state (`AccountMenu`, `AppSidebar`), plain `args` otherwise.

## Components

### `src/layouts/AppSidebar.tsx`

```tsx
interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  workspaceName: string;
  workspaceSlug: string;
  newThreadHref?: string; // defaults to ROUTE_DASHBOARD
  userName: string;
  avatarSrc?: string;
  onSignOut: () => void;
  isHistoryActive: boolean; // highlights the Release history nav row
  children?: ReactNode; // thread list slot — empty on History
}
```

- Expanded (`!isCollapsed`, width `w-[272px]`, matches the design's `272px`): header row
  (`WorkspaceSwitch` + collapse `IconButton`), New thread `Button` (as `Link`), a
  search-threads stub button (`⌘K` hint, no handler), the `children` slot
  (`min-h-0 flex-1 overflow-y-auto`), then a bottom block: Release history `Link`
  (`nav-item`, `on` state from `isHistoryActive`) and `AccountMenu`.
- Rail (`isCollapsed`, width `w-16`): mark, expand `IconButton`, a divider, New thread
  icon-only `Link`, search icon-only stub button, `flex-1` spacer, Release history icon-only
  `Link`, and a bare `Avatar` (no menu — the design's own collapsed rail drops the account
  menu trigger, showing only the avatar).
- Root: `<aside>`, `h-full flex-shrink-0 flex flex-col`, `bg-surface-container-lowest`,
  `border-outline-variant border-r`, `overflow-hidden` — same shell classes
  `ThreadSidebar.tsx` uses today, so swapping it in during the wiring plan is a drop-in
  width/content change, not a restyle.

### `src/components/common/WorkspaceSwitch.tsx`

```tsx
interface WorkspaceSwitchProps {
  name: string;
  slug: string;
  onClick?: () => void;
}
```

Button (not `<div>` — it's interactive per the design's own `<button class="ws-switch">`,
even with no handler wired yet, so it stays keyboard-focusable): a `primary`-colored mark
square holding an `ArrowRight` icon from `lucide-react` (the design's own mark glyph is a
generic merge-style arrow, not a brand icon — no need for a custom SVG like `GithubMark`),
`name` (bold) over `slug` (muted, `font-mono`, truncated), and a `ChevronsUpDown` icon at
the end.

### `src/components/common/AccountMenu.tsx`

```tsx
interface AccountMenuProps {
  userName: string;
  avatarSrc?: string;
  onSignOut: () => void;
}
```

Row: `Avatar` (`AvatarSize.Sm`) + `userName` (truncated, flex-1) + an `IconButton` (`⋯`,
`aria-label="Account menu"`) that toggles a `DropdownMenu` (`align="start"`, positioned
`bottom` via a wrapping `relative` element — matches the design's account menu, which opens
upward from the bottom of the sidebar). Menu content: `Settings` (`Settings` icon, stub),
`Keyboard shortcuts` (hint `?`, stub), a `Separator`, `Sign out` (`LogOut` icon, calls
`onSignOut`). Internal `isOpen` state — no external control needed, this is a
self-contained interactive unit like `ConfirmDialog`.

### `src/components/chat/ThreadListItem.tsx` (modified)

Adds `time?: string`. Layout becomes a flex row: title (`flex-1 truncate`) + time
(`shrink-0`, muted, hidden when absent). No other prop or behavior change — `isActive`,
`onSelect` stay as-is. Existing callers (`ThreadSidebar.tsx`) keep compiling unchanged
since `time` is optional.

## Rejected alternatives

| Rejected | Reason |
| --- | --- |
| Build the thread row 3-dot menu now, handlers as no-ops | No backend action exists for Rename/Pin/Delete; a menu that opens and does nothing on every click is the "half-finished implementation" the code-style rules forbid, not a stub. |
| `AppSidebar` accepts a `threads: ThreadSummary[]` prop directly | Couples a shared-chrome component to the Dashboard's domain type; History has no threads. A `children` slot keeps `AppSidebar` route-agnostic. |
| `AppSidebar` calls `startNewChat()` itself via `useThreadSession()` | Would silently reset the active thread even when rendered from the History route, where "New thread" should just navigate. Per-route behavior is the composing page's job. |
| `WorkspaceSwitch` includes a real dropdown/picker | One workspace exists today; a picker with a single, unremovable item is speculative scope. |
| Pass `updatedAt`/`Date` into `ThreadListItem` and format inside it | Pushes list-grouping logic (Today/Yesterday/Previous 30 days needs to compare across rows, not one row in isolation) into a per-row component that can't see its siblings. Formatting belongs to whoever assembles the list. |
| Wire pages/`AppShell` in this same pass | User explicitly asked to see the components (via Storybook) before any page changes — reduces the risk of rebuilding page chrome twice if feedback changes a component's shape. |

## Testing

Per the user's explicit ask this pass: add a Storybook story per new/changed component
(`AppSidebar`, `WorkspaceSwitch`, `AccountMenu`, `ThreadListItem`) under each component's
`stories/` folder, following the existing `render: () => { useState(...); ... }` pattern for
the two with internal/controlled open state. Verification is `pnpm lint` + `pnpm build`
(`tsc -b`) clean, plus `pnpm build-storybook` clean (remembering to `rm -rf
storybook-static` afterward before the next lint run, per this session's earlier
convention) — no unit tests, matching the project's standing decision.
