# `PlatformTabs` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Platform picker (GitHub / App Store / Google Play) — the only component in
`src/components/platform-selector/`. Thin domain wrapper around `Tabs`: maps `Platform`
enum values to display labels.

## Depends on

`Tabs.tsx` + `TabsVariant` (unit 8), `Platform` (unit 14, `src/types/platform.ts`).

## Files

- Create: `src/components/platform-selector/PlatformTabs.tsx`

## API

```ts
import Tabs, { TabsVariant } from '@/components/common/Tabs.tsx';
import { Platform } from '@/types/platform.ts';

interface PlatformTabsProps {
  value: Platform;
  onChange: (platform: Platform) => void;
}

const PLATFORM_ITEMS = [
  { value: Platform.Github, label: 'GitHub' },
  { value: Platform.AppStore, label: 'App Store' },
  { value: Platform.GooglePlay, label: 'Google Play' },
];

const PlatformTabs = ({ value, onChange }: PlatformTabsProps) => JSX.Element;
export default PlatformTabs;
```

`PLATFORM_ITEMS` is a local, module-level constant — used only inside
`PlatformTabs.tsx`, not extracted to `src/constants/` (single-use, no cross-module
coupling risk, per `.agents/rules/conventions.md`'s constants-extraction rule).

## Markup

```tsx
<Tabs
  items={PLATFORM_ITEMS}
  value={value}
  onChange={(v) => onChange(v as Platform)}
  variant={TabsVariant.Pill}
/>
```

## Composes

`Tabs` (`TabsVariant.Pill`), `Platform`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render with `value={Platform.Github}`, confirm "GitHub" shows as
  the active pill. Click "App Store", confirm `onChange(Platform.AppStore)` fires and
  the active pill moves.
