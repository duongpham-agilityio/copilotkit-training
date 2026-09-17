# App Sidebar Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four presentational/layout components (`ThreadListItem` restyle,
`WorkspaceSwitch`, `AccountMenu`, `AppSidebar`) with a Storybook story each, so the user can
review the new sidebar chrome in Storybook before any page or route file changes.

**Architecture:** Bottom-up: restyle the existing leaf component first, then two new
independent leaf components, then the layout component that composes both of them.
No route, page, or `AppShell`/`ThreadSidebar` file is touched — see the spec's Scope.

**Tech Stack:** React 19 + TypeScript strict, Tailwind v4, `lucide-react`, existing
`DropdownMenu`/`Avatar`/`IconButton`/`Button` primitives, `react-router`'s `Link` for
navigation-only rows, Storybook `@storybook/react-vite`.

**Spec:** `docs/superpowers/specs/2026-09-17-app-sidebar-components-design.md`

## Global Constraints

- No route, page, `AppShell.tsx`, `App.tsx`, `DashboardLayout.tsx`, or `ThreadSidebar.tsx`
  file is modified in this plan.
- No new theme tokens — every color already exists in `src/index.css`'s `@theme inline`.
- Stub affordances (search-threads button, `Settings`/`Keyboard shortcuts` menu items) get
  no `onClick` at all — do not write empty arrow functions `() => {}` for them; omit the
  prop/attribute entirely so there is nothing to accidentally wire to the wrong thing later.
- Files: kebab-case except `.tsx` files that default-export a React component, which are
  PascalCase (`.agents/rules/conventions.md`).
- `import type` for type-only imports; explicit `.ts`/`.tsx` extensions on relative imports;
  no `any`.
- `pnpm lint` and `pnpm build` must pass clean after every task.
- No git commit/push at any point in this plan — the user asks for that separately in their
  own words when ready.

---

### Task 1: Restyle `ThreadListItem` with an optional `time` column

**Files:**
- Modify: `src/components/chat/ThreadListItem.tsx`
- Create: `src/components/chat/stories/ThreadListItem.stories.tsx`

**Interfaces:**
- Produces: `ThreadListItemProps` gains `time?: string` (all other props unchanged:
  `thread: ThreadSummary`, `isActive: boolean`, `onSelect: (threadId: string) => void`).

- [ ] **Step 1: Add the `time` prop and row layout**

Read the current file first (`src/components/chat/ThreadListItem.tsx`) — it renders a
single truncated `<button>` with the thread title. Change it to a flex row so an optional
time string sits to the right of the truncated title, matching the design's
`.thread-title` + `.thread-time` pair (`Main.dc.html`/`History.dc.html`):

```tsx
import { cn } from '@/lib/cn.ts';
import type { ThreadSummary } from '@/types/thread.ts';

interface ThreadListItemProps {
  thread: ThreadSummary;
  isActive: boolean;
  time?: string;
  onSelect: (threadId: string) => void;
}

const ThreadListItem = ({ thread, isActive, time, onSelect }: ThreadListItemProps) => {
  const handleClick = () => onSelect(thread.id);

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'text-label-sm hover:bg-surface-container flex w-full items-center gap-2 px-3 py-2 text-left',
          isActive && 'bg-primary/10 text-primary font-medium',
        )}
      >
        <span className="flex-1 truncate">{thread.title || thread.id}</span>
        {time && (
          <span
            className={cn(
              'text-label-sm shrink-0',
              isActive ? 'text-primary/70' : 'text-on-surface-variant',
            )}
          >
            {time}
          </span>
        )}
      </button>
    </li>
  );
};

export default ThreadListItem;
```

- [ ] **Step 2: Write the Storybook story**

`ThreadSummary` requires `id`, `title`, `resourceId`, `createdAt`, `updatedAt` — build a
minimal fixture inline rather than importing real data.

```tsx
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ThreadListItem from '../ThreadListItem.tsx';
import type { ThreadSummary } from '@/types/thread.ts';

const meta: Meta<typeof ThreadListItem> = {
  component: ThreadListItem,
  title: 'chat/ThreadListItem',
};

export default meta;

type Story = StoryObj<typeof ThreadListItem>;

const makeThread = (id: string, title: string): ThreadSummary => ({
  id,
  title,
  resourceId: 'user-1',
  createdAt: '2026-09-17T10:00:00.000Z',
  updatedAt: '2026-09-17T10:00:00.000Z',
});

export const List: Story = {
  render: () => {
    const [activeId, setActiveId] = useState('t1');
    const items: Array<{ thread: ThreadSummary; time: string }> = [
      { thread: makeThread('t1', 'v2.5.0 · Slack digest & templates'), time: '' },
      { thread: makeThread('t2', 'Changelog parser dependency bump'), time: '2h' },
      { thread: makeThread('t3', 'App Store tone pass'), time: 'Tue' },
      { thread: makeThread('t4', 'v2.3.1 · duplicate tag hotfix'), time: 'Aug 26' },
    ];
    return (
      <ul className="bg-surface-container-lowest w-70 rounded-lg py-1">
        {items.map(({ thread, time }) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            time={time || undefined}
            isActive={thread.id === activeId}
            onSelect={setActiveId}
          />
        ))}
      </ul>
    );
  },
};

export const WithoutTime: Story = {
  args: {
    thread: makeThread('t1', 'A thread with no time shown'),
    isActive: false,
    onSelect: () => {},
  },
};
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean. `ThreadSidebar.tsx` still compiles — it doesn't pass `time`, which is
optional.

---

### Task 2: `WorkspaceSwitch` component

**Files:**
- Create: `src/components/common/WorkspaceSwitch.tsx`
- Create: `src/components/common/stories/WorkspaceSwitch.stories.tsx`

**Interfaces:**
- Produces: `WorkspaceSwitchProps { name: string; slug: string; onClick?: () => void }`,
  default export `WorkspaceSwitch`.

- [ ] **Step 1: Write the component**

```tsx
import { ArrowRight, ChevronsUpDown } from 'lucide-react';

interface WorkspaceSwitchProps {
  name: string;
  slug: string;
  onClick?: () => void;
}

const WorkspaceSwitch = ({ name, slug, onClick }: WorkspaceSwitchProps) => (
  <button
    type="button"
    onClick={onClick}
    className="hover:bg-surface-container -ml-1.5 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 text-left"
  >
    <span className="bg-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
      <ArrowRight className="size-3.5 text-white" strokeWidth={2.5} />
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-label-sm text-on-surface truncate font-semibold">{name}</span>
      <span className="text-on-surface-variant truncate font-mono text-[11px]">{slug}</span>
    </span>
    <ChevronsUpDown className="text-on-surface-variant size-3.5 shrink-0" />
  </button>
);

export default WorkspaceSwitch;
```

- [ ] **Step 2: Write the Storybook story**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import WorkspaceSwitch from '../WorkspaceSwitch.tsx';

const meta: Meta<typeof WorkspaceSwitch> = {
  component: WorkspaceSwitch,
  title: 'common/WorkspaceSwitch',
  args: {
    name: 'Release Builder',
    slug: 'acme/release-builder',
  },
};

export default meta;

type Story = StoryObj<typeof WorkspaceSwitch>;

export const Default: Story = {
  render: (args) => (
    <div className="w-68">
      <WorkspaceSwitch {...args} />
    </div>
  ),
};
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

---

### Task 3: `AccountMenu` component

**Files:**
- Create: `src/components/common/AccountMenu.tsx`
- Create: `src/components/common/stories/AccountMenu.stories.tsx`

**Interfaces:**
- Consumes: `DropdownMenu`/`DropdownMenu.Item`/`DropdownMenu.Separator`
  (`src/components/common/DropdownMenu.tsx`) — `isOpen: boolean`, `onClose: () => void`,
  `align?: 'start' | 'end'`; `Avatar`/`AvatarSize` (`src/components/common/Avatar.tsx`);
  `IconButton` (`src/components/common/IconButton.tsx`).
- Produces: `AccountMenuProps { userName: string; avatarSrc?: string; onSignOut: () => void }`,
  default export `AccountMenu`.

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react';
import { KeyRound, LogOut, Settings } from 'lucide-react';
import Avatar, { AvatarSize } from './Avatar.tsx';
import DropdownMenu from './DropdownMenu.tsx';

interface AccountMenuProps {
  userName: string;
  avatarSrc?: string;
  onSignOut: () => void;
}

const AccountMenu = ({ userName, avatarSrc, onSignOut }: AccountMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-2.5 px-1">
      <Avatar name={userName} src={avatarSrc} size={AvatarSize.Sm} />
      <span className="text-on-surface text-label-sm min-w-0 flex-1 truncate font-semibold">
        {userName}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Account menu"
        className="text-on-surface-variant hover:bg-surface-container flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)} className="bottom-9 left-0">
        <DropdownMenu.Item icon={<Settings className="size-4" />} onClick={() => setIsOpen(false)}>
          Settings
        </DropdownMenu.Item>
        <DropdownMenu.Item
          icon={<KeyRound className="size-4" />}
          hint="?"
          onClick={() => setIsOpen(false)}
        >
          Keyboard shortcuts
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item icon={<LogOut className="size-4" />} onClick={onSignOut} danger>
          Sign out
        </DropdownMenu.Item>
      </DropdownMenu>
    </div>
  );
};

export default AccountMenu;
```

The trigger is a hand-drawn `⋯` SVG, not a `lucide-react` icon — `lucide-react` has no
horizontal-ellipsis-as-three-separate-dots glyph matching the design exactly, same
reasoning as `GithubMark.tsx`'s precedent (no library icon, inline SVG instead).

`Settings`/`Keyboard shortcuts` stay real `DropdownMenu.Item`s (unlike the sidebar's bare
search stub) because `DropdownMenu.Item`'s `onClick` is a required prop — closing the menu
on click is the correct, real behavior for an item with no further action yet, not a stub.

- [ ] **Step 2: Write the Storybook story**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import AccountMenu from '../AccountMenu.tsx';

const meta: Meta<typeof AccountMenu> = {
  component: AccountMenu,
  title: 'common/AccountMenu',
  args: {
    userName: 'Duong Pham',
    onSignOut: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof AccountMenu>;

export const Default: Story = {
  render: (args) => (
    <div className="bg-surface-container-lowest w-68 rounded-lg pt-16 pb-2">
      <AccountMenu {...args} />
    </div>
  ),
};
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean — in particular, no `noUnusedLocals` failure from the placeholder
`IconButton` called out in Step 1.

---

### Task 4: `AppSidebar` layout component

**Files:**
- Create: `src/layouts/AppSidebar.tsx`
- Create: `src/layouts/stories/AppSidebar.stories.tsx`

**Interfaces:**
- Consumes: `WorkspaceSwitch` (Task 2), `AccountMenu` (Task 3), `IconButton`, `Avatar`/
  `AvatarSize`, `Button`/`ButtonVariant`, `ROUTE_DASHBOARD`/`ROUTE_HISTORY`
  (`src/constants/routings.ts`), `Link` (`react-router`).
- Produces: `AppSidebarProps` as specified below, default export `AppSidebar`.

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { History, Plus, Search, SquareChevronLeft, SquareChevronRight } from 'lucide-react';
import { ROUTE_DASHBOARD, ROUTE_HISTORY } from '@/constants/routings.ts';
import WorkspaceSwitch from '@/components/common/WorkspaceSwitch.tsx';
import AccountMenu from '@/components/common/AccountMenu.tsx';
import Avatar, { AvatarSize } from '@/components/common/Avatar.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import { cn } from '@/lib/cn.ts';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  workspaceName: string;
  workspaceSlug: string;
  newThreadHref?: string;
  userName: string;
  avatarSrc?: string;
  onSignOut: () => void;
  isHistoryActive: boolean;
  children?: ReactNode;
}

const AppSidebar = ({
  isCollapsed,
  onToggleCollapse,
  workspaceName,
  workspaceSlug,
  newThreadHref = ROUTE_DASHBOARD,
  userName,
  avatarSrc,
  onSignOut,
  isHistoryActive,
  children,
}: AppSidebarProps) => {
  if (isCollapsed) {
    return (
      <aside className="bg-surface-container-lowest border-outline-variant flex h-full w-16 shrink-0 flex-col items-center gap-2 overflow-hidden border-r px-0 py-3.5">
        <span className="bg-primary flex size-7 items-center justify-center rounded-lg text-white">
          <History className="size-3.5" />
        </span>
        <IconButton
          icon={<SquareChevronRight className="size-4.5" />}
          aria-label="Expand sidebar"
          onClick={onToggleCollapse}
        />
        <div className="bg-outline-variant my-1 h-px w-7" />
        <Link
          to={newThreadHref}
          aria-label="New thread"
          className="bg-primary hover:bg-primary/90 flex size-9 items-center justify-center rounded-xl text-white"
        >
          <Plus className="size-4" />
        </Link>
        <IconButton icon={<Search className="size-4.5" />} aria-label="Search threads" />
        <div className="flex-1" />
        <Link
          to={ROUTE_HISTORY}
          aria-label="Release history"
          className={cn(
            'flex size-9 items-center justify-center rounded-xl',
            isHistoryActive
              ? 'bg-surface-container text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-container',
          )}
        >
          <History className="size-4.5" />
        </Link>
        <Avatar name={userName} src={avatarSrc} size={AvatarSize.Sm} />
      </aside>
    );
  }

  return (
    <aside className="bg-surface-container-lowest border-outline-variant flex h-full w-68 shrink-0 flex-col overflow-hidden border-r">
      <div className="flex shrink-0 items-center gap-1 px-3 pt-3">
        <WorkspaceSwitch name={workspaceName} slug={workspaceSlug} />
        <IconButton
          icon={<SquareChevronLeft className="size-4.5" />}
          aria-label="Collapse sidebar"
          onClick={onToggleCollapse}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 px-3 pt-3.5 pb-1">
        <Link
          to={newThreadHref}
          className="bg-primary text-on-primary hover:bg-primary/90 flex h-9 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
        >
          <Plus className="size-4" />
          New thread
        </Link>
        <button
          type="button"
          className="border-outline-variant text-on-surface-variant flex h-8.5 items-center gap-2 rounded-lg border px-2.5 text-sm"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search threads</span>
          <span className="text-label-sm border-outline-variant rounded border px-1 font-mono">
            ⌘K
          </span>
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-1" aria-label="Threads">
        {children}
      </nav>

      <div className="border-outline-variant flex shrink-0 flex-col gap-1 border-t px-3 py-3">
        <Link
          to={ROUTE_HISTORY}
          className={cn(
            'flex h-8.5 items-center gap-2 rounded-lg px-2.5 text-sm font-medium',
            isHistoryActive
              ? 'bg-surface-container text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-container',
          )}
        >
          <History className="size-4" />
          Release history
        </Link>
        <AccountMenu userName={userName} avatarSrc={avatarSrc} onSignOut={onSignOut} />
      </div>
    </aside>
  );
};

export default AppSidebar;
```

- [ ] **Step 2: Write the Storybook story**

```tsx
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import AppSidebar from '../AppSidebar.tsx';

const meta: Meta<typeof AppSidebar> = {
  component: AppSidebar,
  title: 'layouts/AppSidebar',
  args: {
    workspaceName: 'Release Builder',
    workspaceSlug: 'acme/release-builder',
    userName: 'Duong Pham',
    isHistoryActive: false,
    onSignOut: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof AppSidebar>;

const SAMPLE_THREADS = [
  'v2.5.0 · Slack digest & templates',
  'Changelog parser dependency bump',
  'App Store tone pass',
];

export const Expanded: Story = {
  render: (args) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    return (
      <div className="h-140">
        <AppSidebar
          {...args}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((value) => !value)}
        >
          <ul className="flex flex-col gap-0.5 px-3">
            {SAMPLE_THREADS.map((title) => (
              <li key={title} className="text-body-md text-on-surface truncate px-2 py-1.5">
                {title}
              </li>
            ))}
          </ul>
        </AppSidebar>
      </div>
    );
  },
};

export const Collapsed: Story = {
  render: (args) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    return (
      <div className="h-140">
        <AppSidebar
          {...args}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((value) => !value)}
        />
      </div>
    );
  },
};

export const HistoryActive: Story = {
  args: { isHistoryActive: true },
  render: (args) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    return (
      <div className="h-140">
        <AppSidebar
          {...args}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((value) => !value)}
        />
      </div>
    );
  },
};
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

- [ ] **Step 4: Full Storybook build check**

Run: `pnpm build-storybook`
Expected: builds clean. Then run `rm -rf storybook-static` before the next `pnpm lint`
(the generated output is gitignored but pollutes lint if left on disk — this session's
established gotcha).

---

## Self-review notes (already applied above)

- Checked every prop name used in a later task against where it's defined: `AppSidebar`'s
  `WorkspaceSwitch`/`AccountMenu` prop names match Tasks 2–3 exactly.
- No placeholders — every step has real, complete code, including the story files.
- `AccountMenu`'s Step 1 flags its own leftover placeholder import inline rather than
  silently including broken code, since the account-menu markup went through two drafts
  before landing on the inline `⋯` SVG button matching the design's own icon exactly (the
  design has no `MoreVertical`-shaped icon in `lucide-react` for this row — it hand-draws
  the three dots — so the component does too, matching `GithubMark.tsx`'s precedent for
  "no equivalent in lucide-react, inline SVG instead").
