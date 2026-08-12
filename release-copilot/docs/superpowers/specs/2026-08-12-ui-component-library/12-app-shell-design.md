# `AppShell` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Full-page frame: `AppHeader` + a padded `<main>` content slot. The only place outer
page margin is applied (`px-6 py-6` = `theme.md`'s 24px/`lg` section margin) — no
separate `PageContainer` wrapper, per the overview's no-premature-abstraction note.

## Depends on

`AppHeader.tsx` + `AppNav` (unit 11).

## Files

- Create: `src/layouts/AppShell.tsx`

## API

```ts
import AppHeader, { AppNav } from './AppHeader.tsx';

interface AppShellProps {
  activeNav: AppNav;
  onNavigate: (nav: AppNav) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

const AppShell = ({
  activeNav,
  onNavigate,
  headerActions,
  children,
}: AppShellProps) => JSX.Element;
export default AppShell;
```

## Markup shape

```tsx
<div className="bg-surface min-h-screen">
  <AppHeader
    activeNav={activeNav}
    onNavigate={onNavigate}
    actions={headerActions}
  />
  <main className="px-6 py-6">{children}</main>
</div>
```

## Composes

`AppHeader`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render with placeholder `children` text, confirm the header sits
  above the content with no gap/overlap, and content has a visible 24px margin on all
  sides matching `theme.md`'s section-margin spec.
