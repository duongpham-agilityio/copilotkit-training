# Design System Foundation — Design

**Date:** 2026-09-17
**Status:** Approved, pending implementation

## Problem

The Claude Design artifact `https://claude.ai/artifact/QN8jW4LoRZCzqcPwrhypLx` ("Release
Builder — UI Redesign") ships five boards: Sign In, Sign In — Email, Dashboard, Release
History, and a "Notifications & menus" states sheet. Mapping each board against
`src/components/common/` (see conversation history for the full per-screen mapping) found
that `--color-primary: #630ed4` and the Inter/JetBrains Mono font pairing already match
the design exactly — no theme-token work needed — but seven interaction patterns the
design leans on everywhere have no component in the codebase at all:

1. A dropdown/overflow menu (thread row menu, account menu, thread-header menu, release
   detail menu — four separate places in the design, zero existing implementations).
2. A toast notification (five variants shown on the States board: success, in-progress,
   warning, error, undo — `Toast.tsx` does not exist anywhere in `src/components/`).
3. A confirm dialog (delete thread / remove from history — no `Dialog`/`Modal` exists).
4. A dismissible or actionable inline banner ("Slack isn't connected", "GitHub access
   expired", "3 new commits landed" — shown inside a panel, not full-width).
5. A password input with a show/hide toggle (Sign In — Email only; per explicit
   direction, the plain-GitHub-OAuth Sign In board is out of scope — only the email
   variant ships).
6. A label + control + error-text form field wrapper (Sign In — Email's `.field` blocks).
7. A rich empty state (icon + heading + subtext + CTA) for "No releases found" /
   "Nothing archived yet" — `HistoryPage.tsx` currently renders a bare `<p>`.

`Button`'s variant set (`Primary`, `Secondary`, `Ghost`) also has no destructive/danger
styling, needed by the confirm dialog's "Delete thread" action and reusable anywhere else
a destructive action needs a button.

## Scope

This spec — and the plan that implements it — covers **only** this primitive layer:
`src/components/common/` additions plus the one `src/store/toast-store.ts` +
`src/hooks/use-toast.ts` pair the toast primitive needs to be usable from any page.

**Explicitly out of scope**, each its own follow-up plan once these primitives exist to
compose with:

- Rebuilding `SignInPage.tsx` into the split brand-panel/form layout and adding
  `AuthService.signInWithPassword` + its Supabase implementation.
- Rewiring `ThreadSidebar`/`DashboardPage` to use the new `DropdownMenu`, `Toast`, and
  `ConfirmDialog` primitives for thread actions, and adding the collapsed-rail sidebar
  state.
- Extending `ReleaseSummary` with a `platform` field and sent/unsent status, and updating
  `ReleaseHistoryList`/`ReleaseHistoryListItem`/`ReleaseDetailHeader` to use the new
  filter-segmented `Tabs`, `DropdownMenu`, `EmptyState`, and `ConfirmDialog`.
- Extending `LivePreviewPanel` with the version stepper and the raw-Markdown tab.
- **The sidebar-nav-vs-top-bar question.** The design puts all navigation (workspace
  switch, New thread, search, Release history link, account menu) inside the left
  sidebar, with no top tab bar. `docs/superpowers/specs/2026-09-16-dashboard-ui-v2-design.md`
  explicitly rejected exactly this move one day before this design landed ("Move
  Dashboard/History nav into the sidebar too — wider blast radius for no gain in this
  pass"). This spec does not re-litigate that call. Whichever follow-up plan touches
  `ThreadSidebar`/`AppHeader` must get explicit user sign-off before reversing it — no
  component in this plan assumes an answer either way.

## Global decisions

- **No new theme tokens.** `--color-primary`/`--color-primary-container` already equal
  the design's purple; `--color-success-emerald`, `--color-error-rose`,
  `--color-warning-purple` (already used by `Badge.tsx`) cover every status color the new
  components need. Reusing these three for `Toast` icon colors and `InlineBanner`
  variants keeps `Badge` and these new components visually consistent with each other,
  which the design itself does (its own toast/banner/badge colors all come from the same
  three-hue set).
- **`InlineBanner` is a new component, not a generalized `DisconnectBanner`.** They were
  first assumed to be the same thing, but `DisconnectBanner` is a full-width, centered,
  non-dismissible, single-purpose app-shell strip (one usage, in `App.tsx`'s `banner`
  slot); the design's banners are rounded, left-aligned, bordered cards with an
  icon/message/action layout that live *inside* a panel. Forcing one component to cover
  both shapes via a prop would be the "hypothetical future requirements" mistake
  `.agents/rules/code-style.md` warns against — two call sites with genuinely different
  layout contracts. `DisconnectBanner` is left untouched.
- **`Button` gains `ButtonVariant.Danger`.** `.agents/rules/code-style.md` requires
  `const enum` (not an inline class string) for exactly this case — "a fixed set of
  values needed as both a type and a runtime value ... referenced elsewhere in code" —
  and `ConfirmDialog`'s destructive button is exactly that: `BUTTON_VARIANT_CLASSES` is
  already a `Record<ButtonVariant, string>`, so TypeScript forces the new case to be
  handled everywhere the map is read (`Button.tsx` and `IconButton.tsx`, which reuses
  the same map).
- **`Input` gains an optional `rightSlot?: ReactNode` prop** (mirrors the existing
  `icon` prop, which is left-only) instead of `PasswordInput` duplicating `Input`'s base
  `<input>` styling in a second file. One visual source of truth for the input control;
  `rightSlot` is additive and optional, so every existing `Input` call site is
  unaffected.
- **`FormField` does not clone or control its child.** It renders a `<label htmlFor>` +
  `{children}` + optional error text, and the caller passes the same `id` string to both
  `FormField` and the child control. No `React.cloneElement` prop-injection magic, and
  `FormField` stays usable with `Input`, `PasswordInput`, or anything else with an `id`.
  Error-state border color (red ring on invalid) is the caller's job via the child
  control's own `className`, not something `FormField` reaches into the child to set —
  keeps `FormField` a layout-only component with zero coupling to `Input`'s internals.
- **Toast is a single-slot store, not a queue.** Every toast example on the States board
  shows exactly one toast on screen at a time (bottom-right); the design never shows
  stacked toasts. A `toast: ToastRecord | null` field plus `showToast`/`dismissToast` is
  the whole store — an array/queue would be speculative scope the design never asks for.
  `ToastKind` has four members (`Success`, `Progress`, `Warning`, `Error`); the states
  board's fifth example ("Undo — thread deleted") is not a fifth visual kind, it is a
  `Success` toast with an `actionLabel`/`onAction` pair instead of a description — the
  design's own component script (`History.dc.html`) renders it with the identical green
  check icon as the plain success case, confirming this reading.
- **`DropdownMenu` is a compound component** (`DropdownMenu`, `DropdownMenu.Item`,
  `DropdownMenu.Separator`), matching the `Card`/`Card.Header` pattern already
  established in `src/components/common/Card.tsx` via `Object.assign`. It closes on
  outside pointerdown and on `Escape`; positioning (`top`/`left`/`right` offsets) is the
  caller's responsibility via a wrapping `position: relative` element and the `align`
  prop, not something `DropdownMenu` computes — every design usage anchors to a fixed,
  known corner of its trigger, so a floating/collision-detecting positioning engine
  would be unused complexity.
- **No Storybook stories, no unit tests**, per
  `docs/superpowers/specs/2026-09-16-dashboard-ui-v2-design.md`'s convention (the most
  recent precedent in this repo, superseding the Storybook-per-component convention from
  `docs/superpowers/specs/2026-08-12-ui-component-library/`). Verification is `pnpm
  lint` + `pnpm build` clean per task.

## Rejected alternatives

| Rejected | Reason |
| --- | --- |
| Generalize `DisconnectBanner` into the new inline-banner component | Different layout contract (full-width/centered/non-dismissible vs. rounded/inline/actionable) — see "Global decisions" above. |
| Give `Toast` a queue/array of active toasts | Design never shows more than one toast at once; an array is unused capacity. |
| A fifth `ToastKind.Undo` | Visually identical to `Success` in the design's own script; the only difference is the presence of an action, already modeled by the optional `actionLabel`/`onAction` fields. |
| `PasswordInput` as a standalone `<input>` reimplementation | Duplicates `Input`'s base styling in a second file; `rightSlot` on `Input` is one additive prop instead. |
| `FormField` clones its child to inject `id`/error styling | Fragile (breaks for non-`Input` children, breaks if the child already sets `className`), and the design's error state is a border-color change the caller already controls via `className`. |
| `DropdownMenu` computes its own position (collision detection, portals) | Every design usage anchors to a fixed known corner; a positioning engine solves a problem this design doesn't have. |
| Add `ButtonVariant.Danger`'s color inline per call site instead of in the enum | `Button`'s variant is exactly the "fixed set of values used as type and runtime value" case `.agents/rules/code-style.md` mandates `const enum` for; inline classes would need repeating (and could drift) at both call sites (`ConfirmDialog` now, thread-menu "Delete" actions later). |
