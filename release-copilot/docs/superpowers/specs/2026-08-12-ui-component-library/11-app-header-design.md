# `AppHeader` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Top bar: app title, Dashboard/History nav (via `Tabs`, `Underline` variant), a
right-side `actions` slot (header user avatar, future icon buttons). Route-agnostic —
takes `activeNav`/`onNavigate` as controlled props, renders no `react-router`
`Link`/`Route` (page assembly/routing is out of scope for this pass).

## Depends on

`Tabs.tsx` + `TabsVariant` (unit 8).

## Files

- Create: `src/layouts/AppHeader.tsx`

## API

```ts
import Tabs, { TabsVariant } from '@/components/common/Tabs.tsx';

export const enum AppNav {
  Dashboard = 'dashboard',
  History = 'history',
}

interface AppHeaderProps {
  activeNav: AppNav;
  onNavigate: (nav: AppNav) => void;
  actions?: React.ReactNode;
}

const NAV_ITEMS = [
  { value: AppNav.Dashboard, label: 'Dashboard' },
  { value: AppNav.History, label: 'History' },
];

const AppHeader = ({ activeNav, onNavigate, actions }: AppHeaderProps) =>
  JSX.Element;
export default AppHeader;
```

`NAV_ITEMS` is a local, module-level constant (not extracted to `src/constants/`) — it's
used only inside `AppHeader.tsx`, single-use per the no-premature-abstraction rule in
`.agents/rules/code-style.md`.

## Markup shape

```tsx
<header className="border-outline-variant bg-surface-container-lowest flex items-center justify-between border-b px-6 py-4">
  <span className="text-headline-sm text-on-surface font-semibold">
    Release Copilot
  </span>
  <Tabs
    items={NAV_ITEMS}
    value={activeNav}
    onChange={(v) => onNavigate(v as AppNav)}
    variant={TabsVariant.Underline}
  />
  <div className="flex items-center gap-3">{actions}</div>
</header>
```

## Composes

`Tabs` (`TabsVariant.Underline`).

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render with `activeNav={AppNav.Dashboard}`, confirm the
  Dashboard tab shows the violet underline and History does not. Pass an `Avatar` as
  `actions`, confirm it renders right-aligned. Click the History tab, confirm
  `onNavigate(AppNav.History)` fires.
