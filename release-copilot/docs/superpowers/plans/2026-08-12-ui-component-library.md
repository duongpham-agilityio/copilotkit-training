# UI Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable UI component library (common primitives → layout chrome →
shared types → feature components) that the Figma-designed screens will later be
assembled from.

**Architecture:** Bottom-up, one component (or one trivial tightly-coupled group) per
task. Each task is sized to land as its own commit/push — see
`docs/superpowers/specs/2026-08-12-ui-component-library/00-overview-design.md` "Unit
index" for the full push-granularity rationale. Every task has a 1:1 companion spec file
in that folder; read the task's linked spec for the full rationale behind its API before
implementing — this plan repeats the code, not the reasoning.

**Tech Stack:** React 19, TypeScript (strict, `const enum` enabled — see Global
Constraints), Tailwind v4 (`@theme inline` tokens from `docs/design/theme.md`), no new
dependencies.

## Global Constraints

- No hardcoded hex or arbitrary Tailwind values anywhere a `theme.md` token exists —
  see spec `00-overview-design.md` "Design Correction".
- No unit-test framework. Storybook *is* used — reversed 2026-08-12 during
  implementation at the user's explicit request; see spec `00-overview-design.md`
  "Out of scope". Verification per task is `pnpm lint` + `pnpm build` (`tsc -b`)
  clean, plus a Storybook story (`<Component>.stories.tsx` under that component
  folder's `stories/` subfolder — e.g. `src/components/common/stories/Badge.stories.tsx`)
  with one export per prop-driven visual state, viewed via `pnpm storybook` — see spec
  `00-overview-design.md` "Verification strategy".
- Fixed sets of values used as both a type and a runtime value (`variant`, `size`,
  `emphasis`, status/mode constants) are `const enum`, not string-literal unions —
  `tsconfig.app.json`'s `erasableSyntaxOnly` is already off for this (see that file's
  inline comment and `.agents/rules/code-style.md`). Plain string-literal unions are
  still fine for values that are only ever a type, never constructed/compared as a
  value.
- Relative imports (`./`, `../`) carry explicit `.ts`/`.tsx` extensions; `@/`-alias
  imports do not (matches existing `src/components/chat/ChatSidebar.tsx` and
  `src/routes/router.tsx`).
- Arrow functions only, `const` by default, named exports except default-exported React
  components (`.agents/rules/code-style.md`).
- No `@tailwindcss/typography` — see spec `00-overview-design.md` "Out of scope" for
  why. (`clsx`/`tailwind-merge` *are* used, via `cn` in Task 1 — reversed 2026-08-12
  during implementation at the user's explicit request.)
- `text-label-md` and `text-headline-sm`, used in the original task code below for
  Avatar/Button/Tabs/AppHeader/LivePreviewPanel, do not exist in `theme.css`/
  `index.css`'s `@theme inline` map (confirmed 2026-08-12 during implementation —
  Tailwind v4 silently drops undefined `text-*` utilities). Substituted throughout:
  `text-label-md` → `text-body-md` (14px), `text-headline-sm` → `text-headline-md`
  (20px). Each affected task notes the substitution inline.
- Every task's final step is a commit. Conventional Commits, per
  `.agents/rules/git-rules.md`: `feat:` for every new component (net-new capability,
  even before it's wired into a page), `docs:` for the skill-doc-sync task.

---

### Task 1: `cn` util

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/01-cn-util-design.md`

**Files:**

- Create: `src/lib/cn.ts`

**Interfaces:**

- Produces: `cn(...classes: (string | false | null | undefined)[]): string` — used by
  every subsequent component task.

- [x] **Step 1: Install `clsx` and `tailwind-merge`, write `src/lib/cn.ts`**

Run: `pnpm add clsx tailwind-merge`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...classes: ClassValue[]): string => twMerge(clsx(classes));
```

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

- [ ] **Step 3: Commit** (pending — user commits each task themselves)

`feat: add cn classname join utility`

---

### Task 1.5: Storybook setup (inserted 2026-08-12 during implementation)

Not in the original plan — added at the user's explicit request. See spec
`00-overview-design.md` "Out of scope" and "Verification strategy" for full rationale.

- [x] Ran `storybook init`, then trimmed the scaffold to just `storybook`,
  `@storybook/react-vite`, `@storybook/addon-a11y`, `@storybook/addon-docs`,
  `eslint-plugin-storybook` — removed `@storybook/addon-vitest` (+ the `vitest`,
  `playwright`, `@vitest/browser-playwright`, `@vitest/coverage-v8` deps it pulled in),
  `@chromatic-com/storybook`, and `@storybook/addon-mcp` as unrelated scope creep.
  Reverted `vite.config.ts` to its original state (init had wired in the Vitest
  browser-testing config). Deleted the default demo content (`src/stories/`,
  `vitest.shims.d.ts`).
- [x] `.storybook/preview.tsx` imports `../src/index.css` so stories render with real
  theme tokens, not browser defaults.
- [x] Convention: `<Component>.stories.tsx` lives in a `stories/` subfolder inside that
  component's folder (e.g. `src/components/common/stories/Badge.stories.tsx`,
  importing `../Badge.tsx`), not co-located next to the component file.
- [x] Verified: `pnpm lint` / `pnpm build` clean; `pnpm storybook` serves and correctly
  renders theme-styled stories (screenshot-checked).
- [ ] **Commit** (pending — user commits themselves)

`feat: add Storybook with a11y and docs addons`

---

### Task 2: `Badge`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/02-badge-design.md`

**Files:**

- Create: `src/components/common/Badge.tsx`

**Interfaces:**

- Consumes: `cn` from `src/lib/cn.ts`.
- Produces: `BadgeVariant` const enum, default-exported `Badge` component — consumed by
  `CommitListItem` (Task 16) and `ReleaseHistoryListItem`/`ReleaseVersionDetail`
  (Tasks 20, 22).

- [ ] **Step 1: Write `src/components/common/Badge.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const enum BadgeVariant {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Neutral = 'neutral',
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  [BadgeVariant.Success]: 'bg-success-emerald/10 text-success-emerald',
  [BadgeVariant.Error]: 'bg-error-rose/10 text-error-rose',
  [BadgeVariant.Warning]: 'bg-warning-purple/10 text-warning-purple',
  [BadgeVariant.Neutral]: 'bg-surface-container text-on-surface-variant',
};

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

const Badge = ({ variant, children }: BadgeProps) => (
  <span
    className={cn(
      'text-label-sm inline-flex items-center rounded-full px-3 py-1',
      VARIANT_CLASSES[variant],
    )}
  >
    {children}
  </span>
);

export default Badge;
```

- [x] **Step 1.5: Add `src/components/common/stories/Badge.stories.tsx`** (backfilled
  2026-08-12; supersedes the ad-hoc-`App.tsx` check below — see Task 1.5)

One story per `BadgeVariant`: `Success` (`feat`), `Error` (`fix`), `Warning`
(`draft`), `Neutral` (`chore`).

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean. (Required disabling `react-refresh/only-export-components` in
`eslint.config.js` — co-locating a component with its const-enum export trips that
rule; confirmed with the user, applies project-wide since 5 more components in this
plan hit the same pattern.)

~~Manual visual check: in `src/App.tsx`, temporarily render...~~ superseded — verified
instead via the `stories/Badge.stories.tsx` above in the `pnpm storybook` dev server
(screenshot-checked): `Success` renders emerald, `Error` rose, `Warning`
`warning-purple` (not amber), `Neutral` gray.

- [ ] **Step 3: Commit** (pending — user commits themselves)

`feat: add Badge component`

---

### Task 3: `Avatar`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/03-avatar-design.md`

**Files:**

- Create: `src/components/common/Avatar.tsx`

**Interfaces:**

- Consumes: `cn`.
- Produces: `AvatarSize` const enum, default-exported `Avatar` — consumed by
  `CommitListItem` (Task 16).

- [x] **Step 1: Write `src/components/common/Avatar.tsx`**

`text-label-md` substituted with `text-body-md` (2026-08-12: `text-label-md` doesn't
exist in `theme.css`/`index.css`'s `@theme inline` map — confirmed with the user, see
Global Constraints note on the missing-token gap).

```tsx
import { cn } from '@/lib/cn';

export const enum AvatarSize {
  Sm = 'sm',
  Md = 'md',
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  [AvatarSize.Sm]: 'w-6 h-6 text-label-sm',
  [AvatarSize.Md]: 'w-8 h-8 text-body-md',
};

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
}

const Avatar = ({ name, src, size = AvatarSize.Md }: AvatarProps) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', SIZE_CLASSES[size])}
      />
    );
  }

  return (
    <span
      className={cn(
        'bg-secondary-container text-on-secondary-container inline-flex items-center justify-center rounded-full font-medium',
        SIZE_CLASSES[size],
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
};

export default Avatar;
```

- [x] **Step 1.5: Add `src/components/common/stories/Avatar.stories.tsx`**

Stories: `InitialMd`, `InitialSm` (both no `src`, so render the initials fallback),
`PhotoMd` (`src="https://placekitten.com/64/64"`).

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

~~Manual visual check: render...~~ superseded by the stories above, viewed via
`pnpm storybook` (screenshot-checked): `InitialMd`/`InitialSm` render a circular "A" on
a `secondary-container`-tinted background at the two sizes. `PhotoMd`'s `<img>` element
renders with the correct classes, but `placekitten.com` isn't reachable from this
sandbox — the actual photo crop/fit is unverified (network limitation, not a component
issue; the img tag and `object-cover`/`rounded-full` classes are identical to the
working fallback path).

- [ ] **Step 3: Commit** (pending — user commits themselves)

`feat: add Avatar component`

---

### Task 4: `MonoTag`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/04-mono-tag-design.md`

**Files:**

- Create: `src/components/common/MonoTag.tsx`

**Interfaces:**

- Produces: default-exported `MonoTag` — consumed by `CommitListItem` (Task 16).

- [x] **Step 1: Write `src/components/common/MonoTag.tsx`**

```tsx
interface MonoTagProps {
  children: string;
}

const MonoTag = ({ children }: MonoTagProps) => (
  <span className="text-label-sm bg-surface-container text-on-surface-variant rounded-md px-2 py-0.5 font-mono">
    {children}
  </span>
);

export default MonoTag;
```

- [x] **Step 1.5: Add `src/components/common/stories/MonoTag.stories.tsx`**

One story, `CommitHash` (`children: 'a1b2c3d'`).

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

~~Manual visual check: render...~~ superseded by the story above, viewed via
`pnpm storybook` (screenshot-checked): renders in JetBrains Mono, visibly distinct
from surrounding Inter text, on the `surface-container` gray pill background.

- [ ] **Step 3: Commit** (pending — user commits themselves)

`feat: add MonoTag component`

---

### Task 5: `Button`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/05-button-design.md`

**Files:**

- Create: `src/components/common/Button.tsx`

**Interfaces:**

- Consumes: `cn`.
- Produces: `ButtonVariant` const enum, `BUTTON_VARIANT_CLASSES` map (both re-exported
  and reused by `IconButton`, Task 6), default-exported `Button` — consumed by
  `LivePreviewPanel` (Task 19) and `ReleaseVersionDetail` (Task 22).

- [x] **Step 1: Write `src/components/common/Button.tsx`**

`text-label-md` substituted with `text-body-md` (see Global Constraints note).

```tsx
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const enum ButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Ghost = 'ghost',
}

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  [ButtonVariant.Primary]: 'bg-primary text-on-primary hover:bg-primary/90',
  [ButtonVariant.Secondary]:
    'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
  [ButtonVariant.Ghost]: 'bg-transparent text-primary hover:bg-primary/10',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const Button = ({
  variant = ButtonVariant.Primary,
  className,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={cn(
      'text-body-md cursor-pointer rounded-xl px-4 py-2 font-medium transition-colors disabled:pointer-events-none disabled:cursor-default disabled:opacity-50',
      BUTTON_VARIANT_CLASSES[variant],
      className,
    )}
    {...rest}
  />
);

export default Button;
```

- [x] **Step 1.5: Add `src/components/common/stories/Button.stories.tsx`**

Stories: `Primary`, `Secondary`, `Ghost`, `Disabled` (`variant: Primary, disabled: true`).

- [x] **Step 1.6: Fix cursor (post-review, 2026-08-12)**

User review caught: native `<button>` has no `cursor: pointer` by default (verified —
Tailwind v4's `preflight.css` only sets cursor for Safari's number-input spinner
buttons, nothing for general buttons). Added `cursor-pointer` to the base classes,
plus `disabled:cursor-default` so the disabled state doesn't look clickable. Verified
via computed style in the running Storybook (`getComputedStyle(button).cursor`):
`Primary` → `pointer`, `Disabled` → `default`. (This same gap applies to `IconButton`,
Task 6 — fix it there from the start rather than retrofitting.)

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

~~Manual visual check: render all 3 variants...~~ superseded by the stories above,
viewed via `pnpm storybook` (screenshot-checked): `Primary` background is violet
`#630ed4` (not orange), `Secondary` shows the tinted container, `Ghost` is transparent
with violet text, `Disabled` renders visibly dimmed (`opacity-50`) with a default
(non-pointer) cursor.

- [ ] **Step 3: Commit** (pending — user commits themselves)

`feat: add Button component`

---

### Task 6: `IconButton`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/06-icon-button-design.md`

**Files:**

- Create: `src/components/common/IconButton.tsx`

**Interfaces:**

- Consumes: `cn`, `ButtonVariant`, `BUTTON_VARIANT_CLASSES` from `./Button.tsx`
  (Task 5).
- Produces: default-exported `IconButton`.

- [x] **Step 1: Write `src/components/common/IconButton.tsx`**

`cursor-pointer` / `disabled:cursor-default` added from the start (same missing-cursor
gap found in Button's post-review fix, Task 5 Step 1.6 — no native browser default,
verified against `preflight.css`).

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ButtonVariant, BUTTON_VARIANT_CLASSES } from './Button.tsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  'aria-label': string;
  variant?: ButtonVariant;
}

const IconButton = ({
  icon,
  variant = ButtonVariant.Ghost,
  className,
  ...rest
}: IconButtonProps) => (
  <button
    type="button"
    className={cn(
      'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors disabled:pointer-events-none disabled:cursor-default disabled:opacity-50',
      BUTTON_VARIANT_CLASSES[variant],
      className,
    )}
    {...rest}
  >
    {icon}
  </button>
);

export default IconButton;
```

- [x] **Step 1.5: Add `src/components/common/stories/IconButton.stories.tsx`**

Stories: `Ghost` (default variant), `Primary`, `Disabled`.

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

~~Manual visual check: render...~~ superseded by the stories above, viewed via
`pnpm storybook` (screenshot + computed-style checked): 32×32 square in both cases;
`Ghost` transparent background with violet "×", `Primary` solid violet background with
white "×"; `cursor` computed style is `pointer` on `Ghost`/`Primary`, `default` on
`Disabled`.

- [ ] **Step 3: Commit** (pending — user commits themselves)

`feat: add IconButton component`

---

### Task 7: `Card`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/07-card-design.md`

**Files:**

- Create: `src/components/common/Card.tsx`

**Interfaces:**

- Consumes: `cn`.
- Produces: `CardEmphasis` const enum, default-exported `Card` (with `Card.Header`
  compound sub-component) — consumed by `CommitListPanel` (Task 17),
  `LivePreviewPanel` (Task 19), `ReleaseHistoryListItem`/`ReleaseHistoryList`/
  `ReleaseVersionDetail` (Tasks 20-22).

- [x] **Step 1: Write `src/components/common/Card.tsx`**

```tsx
import type { MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const enum CardEmphasis {
  Raised = 'raised',
  Outlined = 'outlined',
}

const EMPHASIS_CLASSES: Record<CardEmphasis, string> = {
  [CardEmphasis.Raised]: 'shadow-xl border-none',
  [CardEmphasis.Outlined]: 'shadow-none border border-outline-variant',
};

interface CardProps {
  emphasis?: CardEmphasis;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  children: ReactNode;
}

const CardRoot = ({
  emphasis = CardEmphasis.Raised,
  className,
  onClick,
  children,
}: CardProps) => (
  <div
    className={cn(
      'bg-surface-container-lowest rounded-3xl p-6',
      EMPHASIS_CLASSES[emphasis],
      onClick && 'cursor-pointer',
      className,
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  children: ReactNode;
}

const CardHeader = ({ children }: CardHeaderProps) => (
  <div className="border-outline-variant mb-4 border-b pb-4">{children}</div>
);

const Card = Object.assign(CardRoot, { Header: CardHeader });

export default Card;
```

`Object.assign` attaches `Header` to the component function — `Card.Header = CardHeader`
directly on a `const` arrow-function binding trips `verbatimModuleSyntax`/strict
reassignment concerns less cleanly than `Object.assign`, and keeps `Card` itself
`const`-only per `.agents/rules/code-style.md`.

- [x] **Step 1.5: Add `src/components/common/stories/Card.stories.tsx`**

Stories: `Raised`, `Outlined`, `WithHeader` (custom `render`, since it demonstrates the
`Card.Header` compound sub-component rather than a plain `args` shape).

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

~~Manual visual check: render...~~ superseded by the stories above, viewed via
`pnpm storybook` (screenshot-checked): `Raised` has a visible shadow and no border;
`Outlined` has a 1px border and no shadow; `WithHeader` shows the header's bottom
border and `mb-4` spacing above the body content.

- [ ] **Step 3: Commit** (pending — user commits themselves)

`feat: add Card component`

---

### Task 8: `Tabs`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/08-tabs-design.md`

**Files:**

- Create: `src/components/common/Tabs.tsx`

**Interfaces:**

- Consumes: `cn`.
- Produces: `TabsVariant` const enum, `TabItem` interface (both named exports),
  default-exported `Tabs` — consumed by `AppHeader` (Task 11), `PlatformTabs`
  (Task 15), `CommitListPanel` (Task 17).

- [x] **Step 1: Write `src/components/common/Tabs.tsx`**

`text-label-md` substituted with `text-body-md` (see Global Constraints note).
`cursor-pointer` added to the tab buttons proactively — same missing-cursor gap as
Button/IconButton (Task 5 Step 1.6), fixed at write time instead of retrofitting.

```tsx
import { cn } from '@/lib/cn';

export const enum TabsVariant {
  Pill = 'pill',
  Underline = 'underline',
}

export interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: TabsVariant;
}

const CONTAINER_CLASSES: Record<TabsVariant, string> = {
  [TabsVariant.Pill]: 'inline-flex gap-1 bg-surface-container rounded-full p-1',
  [TabsVariant.Underline]: 'flex gap-6 border-b border-outline-variant',
};

const activeTabClasses = (variant: TabsVariant) =>
  variant === TabsVariant.Pill
    ? 'bg-surface-container-lowest text-on-surface rounded-full shadow-sm px-3 py-1.5'
    : 'text-primary border-b-2 border-primary pb-3';

const inactiveTabClasses = (variant: TabsVariant) =>
  variant === TabsVariant.Pill
    ? 'text-on-surface-variant px-3 py-1.5'
    : 'text-on-surface-variant border-b-2 border-transparent pb-3';

const Tabs = ({
  items,
  value,
  onChange,
  variant = TabsVariant.Pill,
}: TabsProps) => (
  <div className={CONTAINER_CLASSES[variant]}>
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        aria-selected={item.value === value}
        onClick={() => onChange(item.value)}
        className={cn(
          'text-body-md cursor-pointer font-medium transition-all',
          item.value === value
            ? activeTabClasses(variant)
            : inactiveTabClasses(variant),
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);

export default Tabs;
```

- [x] **Step 2.5: Fix janky active-tab transition (post-review, 2026-08-12)**

User review: "the animate not smooth" on tab switch. Verified root cause via
`getComputedStyle` before changing anything — `transition-colors`' computed
`transition-property` is `color, background-color, border-color, outline-color,
text-decoration-color, fill, stroke, ...`; `box-shadow` is not in that list. So
`Pill`'s active-tab `shadow-sm` popped in/out instantly while background-color eased
over 150ms, and `Underline`'s `border-b-2` (a width/style change from "no border" to
2px solid, not just a color change) can't animate smoothly regardless of
`transition-property` since border-style itself isn't animatable. Two fixes: (1)
`transition-colors` → `transition-all` on the tab button (safe here — active/inactive
share identical padding in both variants, so no layout properties are actually
animated, just visual ones); (2) `Underline`'s inactive state now always renders
`border-b-2 border-transparent` instead of no border, so switching only ever animates
`border-color` (already covered), never width/style. Verified via computed style:
`Pill` button's `transition-property` is now `all`; both `Underline` tabs report
`border-bottom-width: 2px` regardless of active state. Re-screenshotted both variants
before/after click — no visual regression.

`Tabs` is default-exported like every other common component
(`.agents/rules/code-style.md`); `TabsVariant` and `TabItem` stay named exports
alongside it in the same file, since every consumer needs both the component and its
types.

- [x] **Step 1.5: Add `src/components/common/stories/Tabs.stories.tsx`**

Stories: `Pill` (3 items, custom `render` with local `useState` for `value`/`onChange`
since `Tabs` is controlled), `Underline` (2 items, same pattern).

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

~~Manual visual check: render...~~ superseded by the stories above, viewed via
`pnpm storybook` (screenshot-checked, before/after click): `Pill`'s active tab has a
white background + shadow; `Underline`'s active tab shows a violet underline (not
orange). Clicked a different tab in each story and confirmed the active indicator
moved to the clicked item.

- [ ] **Step 3: Commit** (pending — user commits themselves)

`feat: add Tabs component`

---

### Task 9: `Checkbox`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/09-checkbox-design.md`

**Files:**

- Create: `src/components/common/Checkbox.tsx`

**Interfaces:**

- Consumes: `cn`.
- Produces: default-exported `Checkbox` — consumed by `CommitListItem` (Task 16).

- [x] **Step 1: Write `src/components/common/Checkbox.tsx`**

```tsx
import { cn } from '@/lib/cn';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label': string;
}

const Checkbox = ({ checked, onChange, ...rest }: CheckboxProps) => (
  <label className="inline-flex cursor-pointer items-center">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="sr-only"
      {...rest}
    />
    <span
      className={cn(
        'border-outline-variant flex h-5 w-5 items-center justify-center rounded-md border',
        checked && 'bg-primary border-primary',
      )}
    >
      {checked && (
        <svg
          viewBox="0 0 16 16"
          className="stroke-on-primary h-3 w-3 fill-none stroke-2"
        >
          <path d="M3 8l3 3 7-7" />
        </svg>
      )}
    </span>
  </label>
);

export default Checkbox;
```

- [x] **Step 1.5: Add `src/components/common/stories/Checkbox.stories.tsx`**

Stories: `Unchecked`, `Checked` — both custom `render` with local `useState`, since
`Checkbox` is controlled.

- [x] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

~~Manual visual check: render...~~ superseded by the stories above, viewed/driven via
`pnpm storybook` (screenshot + interaction-checked, not just static): `Checked` is
violet-filled with a white checkmark, `Unchecked` is an empty outline. Clicked the
label on the `Unchecked` story — `checked` went `false → true`. Separately, on a fresh
load, pressed Tab (confirmed the hidden `sr-only` input receives focus) then Space
(confirmed `checked` toggled `false → true`) — native input semantics preserved.

- [ ] **Step 3: Commit** (pending — user commits themselves)

`feat: add Checkbox component`

---

### Task 10: `Input`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/10-input-design.md`

**Files:**

- Create: `src/components/common/Input.tsx`

**Interfaces:**

- Consumes: `cn`.
- Produces: default-exported `Input` — consumed by `ReleaseHistoryList` (Task 21).

- [ ] **Step 1: Write `src/components/common/Input.tsx`**

```tsx
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

const Input = ({ icon, className, ...rest }: InputProps) => (
  <div className="relative">
    {icon && (
      <span className="text-on-surface-variant absolute top-1/2 left-3 -translate-y-1/2">
        {icon}
      </span>
    )}
    <input
      className={cn(
        'border-outline-variant bg-surface-container-lowest w-full rounded-xl border',
        'text-body-md text-on-surface placeholder:text-on-surface-variant',
        'focus:ring-primary px-4 py-2 focus:ring-2 focus:outline-none',
        icon ? 'pl-10' : undefined,
        className,
      )}
      {...rest}
    />
  </div>
);

export default Input;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render one `Input` without `icon` and one with a placeholder
search-icon SVG ad hoc. Confirm the icon variant's text doesn't overlap the icon. Focus
the input, confirm a visible violet focus ring. Revert before committing.

- [ ] **Step 3: Commit**

`feat: add Input component`

---

### Task 11: `AppHeader`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/11-app-header-design.md`

**Files:**

- Create: `src/layouts/AppHeader.tsx`

**Interfaces:**

- Consumes: `Tabs`, `TabsVariant`, `TabItem` from `@/components/common/Tabs.tsx`
  (Task 8).
- Produces: `AppNav` const enum, default-exported `AppHeader` — consumed by `AppShell`
  (Task 12).

- [ ] **Step 1: Write `src/layouts/AppHeader.tsx`**

```tsx
import type { ReactNode } from 'react';
import Tabs, { TabsVariant, type TabItem } from '@/components/common/Tabs.tsx';

export const enum AppNav {
  Dashboard = 'dashboard',
  History = 'history',
}

interface AppHeaderProps {
  activeNav: AppNav;
  onNavigate: (nav: AppNav) => void;
  actions?: ReactNode;
}

const NAV_ITEMS: TabItem[] = [
  { value: AppNav.Dashboard, label: 'Dashboard' },
  { value: AppNav.History, label: 'History' },
];

const AppHeader = ({ activeNav, onNavigate, actions }: AppHeaderProps) => (
  <header className="border-outline-variant bg-surface-container-lowest flex items-center justify-between border-b px-6 py-4">
    <span className="text-headline-sm text-on-surface font-semibold">
      Release Copilot
    </span>
    <Tabs
      items={NAV_ITEMS}
      value={activeNav}
      onChange={(value) => onNavigate(value as AppNav)}
      variant={TabsVariant.Underline}
    />
    <div className="flex items-center gap-3">{actions}</div>
  </header>
);

export default AppHeader;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `<AppHeader activeNav={AppNav.Dashboard} onNavigate={() =>
{}} />` ad hoc. Confirm the Dashboard tab shows a violet underline and History does not.
Click History, confirm the handler fires. Revert before committing.

- [ ] **Step 3: Commit**

`feat: add AppHeader layout component`

---

### Task 12: `AppShell`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/12-app-shell-design.md`

**Files:**

- Create: `src/layouts/AppShell.tsx`

**Interfaces:**

- Consumes: default-exported `AppHeader`, `AppNav` from `./AppHeader.tsx` (Task 11).
- Produces: default-exported `AppShell`.

- [ ] **Step 1: Write `src/layouts/AppShell.tsx`**

```tsx
import type { ReactNode } from 'react';
import AppHeader, { type AppNav } from './AppHeader.tsx';

interface AppShellProps {
  activeNav: AppNav;
  onNavigate: (nav: AppNav) => void;
  headerActions?: ReactNode;
  children: ReactNode;
}

const AppShell = ({
  activeNav,
  onNavigate,
  headerActions,
  children,
}: AppShellProps) => (
  <div className="bg-surface min-h-screen">
    <AppHeader
      activeNav={activeNav}
      onNavigate={onNavigate}
      actions={headerActions}
    />
    <main className="px-6 py-6">{children}</main>
  </div>
);

export default AppShell;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `<AppShell activeNav={AppNav.Dashboard} onNavigate={() =>
{}}>Content</AppShell>` ad hoc. Confirm the header sits above the content with no
gap/overlap, and content has a visible margin on all sides. Revert before committing.

- [ ] **Step 3: Commit**

`feat: add AppShell layout component`

---

### Task 13: `SplitPane`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/13-split-pane-design.md`

**Files:**

- Create: `src/layouts/SplitPane.tsx`

**Interfaces:**

- Produces: default-exported `SplitPane`.

- [ ] **Step 1: Write `src/layouts/SplitPane.tsx`**

```tsx
import type { ReactNode } from 'react';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftWidthPercent?: number;
}

const SplitPane = ({ left, right, leftWidthPercent = 65 }: SplitPaneProps) => (
  <div
    className="grid gap-6"
    style={{
      gridTemplateColumns: `${leftWidthPercent}% ${100 - leftWidthPercent}%`,
    }}
  >
    <div>{left}</div>
    <div>{right}</div>
  </div>
);

export default SplitPane;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `<SplitPane left={<div>Left</div>} right={<div>Right</div>}
/>` ad hoc, confirm left is visibly ~65% width. Pass `leftWidthPercent={50}`, confirm an
even split. Revert before committing.

- [ ] **Step 3: Commit**

`feat: add SplitPane layout component`

---

### Task 14: Shared types

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/14-shared-types-design.md`

**Files:**

- Create: `src/types/commit.ts`
- Create: `src/types/platform.ts`
- Create: `src/types/release.ts`

**Interfaces:**

- Produces: `CommitType` const enum + `Commit` interface; `Platform` const enum;
  `ReleaseStatus` const enum + `ReleaseSummary` interface. Consumed by Tasks 15-22.

- [ ] **Step 1: Write `src/types/commit.ts`**

```ts
export const enum CommitType {
  Feat = 'feat',
  Fix = 'fix',
  Chore = 'chore',
}

export interface Commit {
  hash: string;
  type: CommitType;
  message: string;
  author: string;
  timestamp: string;
}
```

- [ ] **Step 2: Write `src/types/platform.ts`**

```ts
export const enum Platform {
  Github = 'github',
  AppStore = 'app-store',
  GooglePlay = 'google-play',
}
```

- [ ] **Step 3: Write `src/types/release.ts`**

```ts
export const enum ReleaseStatus {
  Published = 'published',
  Draft = 'draft',
  Archived = 'archived',
}

export interface ReleaseSummary {
  version: string;
  status: ReleaseStatus;
  title: string;
  date: string;
  featCount: number;
  fixCount: number;
}
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean. No visual check applies (types only).

- [ ] **Step 5: Commit**

`feat: add shared Commit, Platform, and ReleaseSummary types`

---

### Task 15: `PlatformTabs`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/15-platform-tabs-design.md`

**Files:**

- Create: `src/components/platform-selector/PlatformTabs.tsx`

**Interfaces:**

- Consumes: `Tabs`, `TabsVariant`, `TabItem` from `@/components/common/Tabs.tsx`
  (Task 8); `Platform` from `@/types/platform.ts` (Task 14).
- Produces: default-exported `PlatformTabs` — consumed by `ReleaseVersionDetail`
  (Task 22).

- [ ] **Step 1: Write `src/components/platform-selector/PlatformTabs.tsx`**

```tsx
import Tabs, { TabsVariant, type TabItem } from '@/components/common/Tabs.tsx';
import { Platform } from '@/types/platform.ts';

interface PlatformTabsProps {
  value: Platform;
  onChange: (platform: Platform) => void;
}

const PLATFORM_ITEMS: TabItem[] = [
  { value: Platform.Github, label: 'GitHub' },
  { value: Platform.AppStore, label: 'App Store' },
  { value: Platform.GooglePlay, label: 'Google Play' },
];

const PlatformTabs = ({ value, onChange }: PlatformTabsProps) => (
  <Tabs
    items={PLATFORM_ITEMS}
    value={value}
    onChange={(v) => onChange(v as Platform)}
    variant={TabsVariant.Pill}
  />
);

export default PlatformTabs;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `<PlatformTabs value={Platform.Github} onChange={() => {}}
/>` ad hoc, confirm "GitHub" shows as the active pill. Click "App Store", confirm the
handler fires. Revert before committing.

- [ ] **Step 3: Commit**

`feat: add PlatformTabs component`

---

### Task 16: `CommitListItem`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/16-commit-list-item-design.md`

**Files:**

- Create: `src/components/commit-list/CommitListItem.tsx`

**Interfaces:**

- Consumes: `Checkbox` (Task 9), `Badge`/`BadgeVariant` (Task 2), `MonoTag` (Task 4),
  `Avatar` (Task 3), `Commit`/`CommitType` (Task 14).
- Produces: default-exported `CommitListItem` — consumed by `CommitListPanel`
  (Task 17).

- [ ] **Step 1: Write `src/components/commit-list/CommitListItem.tsx`**

```tsx
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

const CommitListItem = ({
  commit,
  selected,
  onToggle,
}: CommitListItemProps) => (
  <div className="flex items-center gap-3 py-3">
    <Checkbox
      checked={selected}
      onChange={() => onToggle(commit.hash)}
      aria-label={`Select commit ${commit.hash}`}
    />
    <Badge variant={COMMIT_TYPE_BADGE_VARIANT[commit.type]}>
      {commit.type}
    </Badge>
    <span className="text-body-md text-on-surface flex-1 truncate">
      {commit.message}
    </span>
    <Avatar name={commit.author} />
    <MonoTag>{commit.hash.slice(0, 7)}</MonoTag>
  </div>
);

export default CommitListItem;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render one `CommitListItem` per `CommitType` ad hoc. Confirm
`Feat` shows an emerald badge, `Fix` shows rose, `Chore` shows gray. Toggle a checkbox,
confirm `onToggle` fires with the hash. Revert before committing.

- [ ] **Step 3: Commit**

`feat: add CommitListItem component`

---

### Task 17: `CommitListPanel`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/17-commit-list-panel-design.md`

**Files:**

- Create: `src/components/commit-list/CommitListPanel.tsx`

**Interfaces:**

- Consumes: `Card`/`CardEmphasis` (Task 7), `Tabs`/`TabsVariant`/`TabItem` (Task 8),
  `CommitListItem` (Task 16), `Commit`/`CommitType` (Task 14).
- Produces: default-exported `CommitListPanel`.

- [ ] **Step 1: Write `src/components/commit-list/CommitListPanel.tsx`**

```tsx
import { useState } from 'react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Tabs, { TabsVariant, type TabItem } from '@/components/common/Tabs.tsx';
import CommitListItem from './CommitListItem.tsx';
import { type Commit, CommitType } from '@/types/commit.ts';

interface CommitListPanelProps {
  commits: Commit[];
  selectedHashes: Set<string>;
  onToggle: (hash: string) => void;
}

const FILTER_ALL = 'all';

const FILTER_ITEMS: TabItem[] = [
  { value: FILTER_ALL, label: 'All' },
  { value: CommitType.Feat, label: 'Feat' },
  { value: CommitType.Fix, label: 'Fix' },
  { value: CommitType.Chore, label: 'Chore' },
];

const CommitListPanel = ({
  commits,
  selectedHashes,
  onToggle,
}: CommitListPanelProps) => {
  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const visibleCommits =
    filter === FILTER_ALL
      ? commits
      : commits.filter((commit) => commit.type === filter);

  return (
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
  );
};

export default CommitListPanel;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `CommitListPanel` ad hoc with a mixed list of `feat`/
`fix`/`chore` commits. Confirm "All" shows every row; clicking "Feat" filters to only
`feat` commits. Toggle a checkbox, confirm `onToggle` bubbles up with the right hash.
Revert before committing.

- [ ] **Step 3: Commit**

`feat: add CommitListPanel component`

---

### Task 18: `MarkdownPreview`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/18-markdown-preview-design.md`

**Files:**

- Create: `src/components/release-notes/MarkdownPreview.tsx`

**Interfaces:**

- Consumes: `cn`, `react-markdown` (existing dependency).
- Produces: default-exported `MarkdownPreview` — consumed by `LivePreviewPanel`
  (Task 19), `ReleaseVersionDetail` (Task 22).

- [ ] **Step 1: Write `src/components/release-notes/MarkdownPreview.tsx`**

```tsx
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/cn';

interface MarkdownPreviewProps {
  markdown: string;
}

const MarkdownPreview = ({ markdown }: MarkdownPreviewProps) => (
  <div
    className={cn(
      '[&_h1]:text-headline-lg [&_h1]:mb-4 [&_h1]:font-semibold',
      '[&_h2]:text-headline-md [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:font-semibold',
      '[&_p]:text-body-md [&_p]:text-on-surface [&_p]:mb-3',
      '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5',
      '[&_li]:text-body-md [&_li]:text-on-surface',
      '[&_code]:text-label-sm [&_code]:bg-surface-container [&_code]:rounded [&_code]:px-1 [&_code]:font-mono',
    )}
  >
    <ReactMarkdown>{markdown}</ReactMarkdown>
  </div>
);

export default MarkdownPreview;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `MarkdownPreview` ad hoc with markdown containing an `h1`,
`h2`, a paragraph, a bullet list, and inline `` `code` ``. Confirm each element uses the
`theme.md` type-scale token, not browser-default styling, and inline code renders in
`font-mono`. Revert before committing.

- [ ] **Step 3: Commit**

`feat: add MarkdownPreview component`

---

### Task 19: `LivePreviewPanel`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/19-live-preview-panel-design.md`

**Files:**

- Create: `src/components/release-notes/LivePreviewPanel.tsx`

**Interfaces:**

- Consumes: `Card`/`CardEmphasis` (Task 7), `Button`/`ButtonVariant` (Task 5),
  `MarkdownPreview` (Task 18).
- Produces: default-exported `LivePreviewPanel`.

- [ ] **Step 1: Write `src/components/release-notes/LivePreviewPanel.tsx`**

```tsx
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';

interface LivePreviewPanelProps {
  markdown: string;
  onExport: () => void;
}

const LivePreviewPanel = ({ markdown, onExport }: LivePreviewPanelProps) => (
  <Card emphasis={CardEmphasis.Outlined}>
    <Card.Header>
      <div className="flex items-center justify-between">
        <span className="text-headline-sm text-on-surface font-semibold">
          Preview
        </span>
        <Button variant={ButtonVariant.Primary} onClick={onExport}>
          Export
        </Button>
      </div>
    </Card.Header>
    <MarkdownPreview markdown={markdown} />
  </Card>
);

export default LivePreviewPanel;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `LivePreviewPanel` ad hoc with sample markdown. Confirm
"Export" is primary-violet and top-right aligned. Click it, confirm `onExport` fires.
Revert before committing.

- [ ] **Step 3: Commit**

`feat: add LivePreviewPanel component`

---

### Task 20: `ReleaseHistoryListItem`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/20-release-history-list-item-design.md`

**Files:**

- Create: `src/components/history/ReleaseHistoryListItem.tsx`

**Interfaces:**

- Consumes: `Card`/`CardEmphasis` (Task 7), `Badge`/`BadgeVariant` (Task 2),
  `ReleaseSummary`/`ReleaseStatus` (Task 14).
- Produces: default-exported `ReleaseHistoryListItem` — consumed by
  `ReleaseHistoryList` (Task 21).

- [ ] **Step 1: Write `src/components/history/ReleaseHistoryListItem.tsx`**

```tsx
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
}: ReleaseHistoryListItemProps) => (
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
);

export default ReleaseHistoryListItem;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render one `ReleaseHistoryListItem` per `ReleaseStatus` ad hoc.
Confirm `Published` shows emerald, `Draft` shows `warning-purple` (not amber),
`Archived` shows gray. Click a row, confirm `onSelect` fires with `release.version`.
Revert before committing.

- [ ] **Step 3: Commit**

`feat: add ReleaseHistoryListItem component`

---

### Task 21: `ReleaseHistoryList`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/21-release-history-list-design.md`

**Files:**

- Create: `src/components/history/ReleaseHistoryList.tsx`

**Interfaces:**

- Consumes: `Card`/`CardEmphasis` (Task 7), `Input` (Task 10),
  `ReleaseHistoryListItem` (Task 20), `ReleaseSummary` (Task 14).
- Produces: default-exported `ReleaseHistoryList`.

- [ ] **Step 1: Write `src/components/history/ReleaseHistoryList.tsx`**

```tsx
import { useState } from 'react';
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
}: ReleaseHistoryListProps) => {
  const [search, setSearch] = useState('');
  const filteredReleases = releases.filter((release) =>
    release.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card emphasis={CardEmphasis.Outlined}>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
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
  );
};

export default ReleaseHistoryList;
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `ReleaseHistoryList` ad hoc with 3+ releases. Type a partial
title into the search box, confirm the list filters live. Clear the search, confirm all
releases return. Click a row, confirm `onSelectVersion` fires with the right version.
Revert before committing.

- [ ] **Step 3: Commit**

`feat: add ReleaseHistoryList component`

---

### Task 22: `ReleaseVersionDetail`

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/22-release-version-detail-design.md`

**Files:**

- Create: `src/components/history/ReleaseVersionDetail.tsx`

**Interfaces:**

- Consumes: `Card`/`CardEmphasis` (Task 7), `Button`/`ButtonVariant` (Task 5),
  `Badge`/`BadgeVariant` (Task 2), `PlatformTabs` (Task 15), `MarkdownPreview`
  (Task 18), `ReleaseSummary`/`ReleaseStatus` (Task 14), `Platform` (Task 14).
- Produces: default-exported `ReleaseVersionDetail`.

- [ ] **Step 1: Write `src/components/history/ReleaseVersionDetail.tsx`**

```tsx
import { useState } from 'react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';
import MarkdownPreview from '@/components/release-notes/MarkdownPreview.tsx';
import { type ReleaseSummary, ReleaseStatus } from '@/types/release.ts';
import { Platform } from '@/types/platform.ts';

interface ReleaseVersionDetailProps {
  release: ReleaseSummary;
  notesByPlatform: Record<Platform, string>;
  onCopy: (platform: Platform) => void;
}

const RELEASE_STATUS_BADGE_VARIANT: Record<ReleaseStatus, BadgeVariant> = {
  [ReleaseStatus.Published]: BadgeVariant.Success,
  [ReleaseStatus.Draft]: BadgeVariant.Warning,
  [ReleaseStatus.Archived]: BadgeVariant.Neutral,
};

const ReleaseVersionDetail = ({
  release,
  notesByPlatform,
  onCopy,
}: ReleaseVersionDetailProps) => {
  const [activePlatform, setActivePlatform] = useState<Platform>(
    Platform.Github,
  );

  return (
    <Card emphasis={CardEmphasis.Raised}>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-headline-md text-on-surface font-semibold">
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
      </Card.Header>
      <div className="mb-4 flex items-center justify-between">
        <PlatformTabs value={activePlatform} onChange={setActivePlatform} />
        <Button
          variant={ButtonVariant.Secondary}
          onClick={() => onCopy(activePlatform)}
        >
          Copy
        </Button>
      </div>
      <MarkdownPreview markdown={notesByPlatform[activePlatform]} />
    </Card>
  );
};

export default ReleaseVersionDetail;
```

`RELEASE_STATUS_BADGE_VARIANT` is duplicated from `ReleaseHistoryListItem` (Task 20)
rather than imported — both are small module-local constants, and `Task 20`'s component
doesn't export it. Promote to a shared helper only if a third consumer needs it.

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Manual visual check: render `ReleaseVersionDetail` ad hoc with sample
`notesByPlatform` for all 3 platforms. Switch platform tabs, confirm the markdown
preview updates. Click "Copy", confirm `onCopy(activePlatform)` fires with the
currently active platform. Revert before committing.

- [ ] **Step 3: Commit**

`feat: add ReleaseVersionDetail component`

---

### Task 23: Skill doc sync

Spec: `docs/superpowers/specs/2026-08-12-ui-component-library/23-skill-doc-sync-design.md`

**Files:**

- Modify: `.claude/skills/release-notes-copilot/SKILL.md:104-110`

**Interfaces:**

- Consumes: nothing (documentation only).
- Produces: nothing (documentation only).

- [ ] **Step 1: Edit `.claude/skills/release-notes-copilot/SKILL.md`**

Insert two new bullets immediately before the existing `src/components/chat/` bullet,
and one new bullet immediately after the existing `src/components/platform-selector/`
bullet, leaving every other line in the section unchanged:

```diff
+- `src/components/common/` — base, reusable UI primitives with no feature knowledge
+  (`Button`, `Badge`, `Card`, `Tabs`, `Checkbox`, `Input`, `Avatar`, `MonoTag`)
+- `src/layouts/` — app structural chrome, route-agnostic (`AppHeader`, `AppShell`,
+  `SplitPane`)
 - `src/components/chat/` — CopilotKit chat panel UI
 - `src/components/commit-list/` — commit list: badges, filter tabs (All/Feat/Fix),
   per-entry select checkboxes (the pre-filter step above)
 - `src/components/release-notes/` — live preview/editor for the generated output, plus
   Copy button and export-format trigger
 - `src/components/platform-selector/` — UI to pick GitHub / App Store-TestFlight / Google Play
+- `src/components/history/` — release history list + per-version detail view (search,
+  status badge, per-platform notes)
 - `src/hooks/` — hooks wrapping CopilotKit chat/agent state and commit-selection state for
   the release-notes flow
```

- [ ] **Step 2: Verify**

Re-read the edited section. Confirm every folder created in Tasks 1-22 now has a
bullet, and no existing bullet's wording changed beyond the three insertions above. No
`pnpm lint`/`pnpm build` check applies (Markdown, not source).

- [ ] **Step 3: Commit**

`docs: document common, layouts, and history folders in release-notes-copilot skill`

---

## Self-Review

**Spec coverage:** every unit in `00-overview-design.md`'s "Unit index" (1-23) has a
corresponding task above with matching numbering. Every component's API in this plan
matches its spec 1:1 (variant enums, prop shapes, composition).

**Placeholder scan:** no task contains TBD/TODO placeholder text; every step has real,
complete code or an exact diff.

**Type consistency across tasks:** `BadgeVariant` (Task 2) is consumed identically in
Tasks 16, 20, 22. `ButtonVariant`/`BUTTON_VARIANT_CLASSES` (Task 5) are consumed
identically in Tasks 6, 19, 22. `CardEmphasis` (Task 7, including the `onClick` prop) is
consumed identically in Tasks 17, 19, 20, 21, 22. `TabsVariant`/`TabItem` (Task 8) are
consumed identically in Tasks 11, 15, 17. `Commit`/`CommitType` (Task 14) match between
Task 16 and Task 17. `Platform` (Task 14) matches between Task 15 and Task 22.
`ReleaseSummary`/`ReleaseStatus` (Task 14) match across Tasks 20, 21, 22.
