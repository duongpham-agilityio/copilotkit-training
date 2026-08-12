# `Tabs` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Segmented control. Controlled component (`value`/`onChange`), generic over an `items`
list — powers both pill filters (All/Feat/Fix, platform picker) and underline nav
(Dashboard/History) via the `variant` prop. Does not know about commits, platforms, or
routes — feature layers (`PlatformTabs`, `AppHeader`) supply `items`.

## Files

- Create: `src/components/common/Tabs.tsx`

## API

```ts
export const enum TabsVariant {
  Pill = 'pill',
  Underline = 'underline',
}

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: TabsVariant;
}

const Tabs = ({
  items,
  value,
  onChange,
  variant = TabsVariant.Pill,
}: TabsProps) => JSX.Element;
export default Tabs;
```

## Variant styling

| `TabsVariant` | Container                                                 | Active tab                                                           | Inactive tab                   |
| ------------- | --------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------ |
| `Pill`        | `inline-flex gap-1 bg-surface-container rounded-full p-1` | `bg-surface-container-lowest text-on-surface rounded-full shadow-sm` | `text-on-surface-variant`      |
| `Underline`   | `flex gap-6 border-b border-outline-variant`              | `text-primary border-b-2 border-primary pb-3`                        | `text-on-surface-variant pb-3` |

Every tab is a `<button type="button">`, `onClick={() => onChange(item.value)}`,
`aria-selected={item.value === value}`.

## Composes

`cn` for per-tab active/inactive class selection.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render one `Pill` instance with 3 items (confirm active pill has
  a white background + shadow, matching the Dashboard filter chips) and one
  `Underline` instance with 2 items (confirm active tab shows a violet
  `--color-primary` underline, not the Figma mock's orange). Click through items,
  confirm `value` updates and the active indicator moves.
