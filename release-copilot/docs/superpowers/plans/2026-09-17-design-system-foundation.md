# Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the seven `common/` primitives (plus one `Button` variant and one
`Input` prop) that the new Claude Design "Release Builder — UI Redesign" needs
everywhere — dropdown menu, toast, confirm dialog, inline banner, password input, form
field, empty state — bottom-up, smallest/most-depended-on first.

**Architecture:** Eleven sequential tasks, each leaving the repo compiling and lint-clean
with no page wired to the new component yet (that wiring is later, separate plans — see
spec "Scope"). Two tasks extend an existing primitive (`Button`, `Input`) because a later
task in this same plan depends on the extension; the rest are net-new files.

**Tech Stack:** React 19, TypeScript (strict, `const enum`), Tailwind v4 (`@theme
inline` tokens from `src/styles/theme.css` — already match the design, no token changes
needed), Zustand (toast store), `lucide-react` (icons), `cn` (`clsx` + `tailwind-merge`).

**Spec:** `docs/superpowers/specs/2026-09-17-design-system-foundation-design.md`

## Global Constraints

- **No unit tests, no Storybook stories.** Verification per task is `pnpm lint` + `pnpm
  build` clean, plus the manual read-through each task's "Checkpoint" step describes.
  Do not add `*.stories.tsx` files.
- **`pnpm lint` and `pnpm build` must both pass clean before a task is done.** `tsc -b`
  runs with `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax` — never
  weaken `tsconfig.app.json` to silence an error.
- **No git commits, pushes, or PRs at any point in this plan.** Checkpoint steps mean
  "stop and let the user review", not `git commit`. The user commits when they ask for
  it.
- Arrow functions only (including components), `const` by default, template literals,
  destructure 2+ fields read from the same object.
- `import type` for type-only imports. Explicit `.ts`/`.tsx` extensions on relative
  imports; `@/`-alias imports do not carry them (matches existing files).
- No `any`. `const enum` (not string-literal unions) for any fixed set of values used as
  both a type and a runtime value (`variant`, `kind`, `align`, etc.).
- Files kebab-case, except `.tsx` files that default-export a React component, which are
  PascalCase matching the component identifier. Folders always kebab-case.
- Components/Types/Interfaces are PascalCase; variables/functions are camelCase.
- No hardcoded hex colors — every color is an existing `theme.css` token (`bg-primary`,
  `text-error-rose`, etc.). This plan introduces no new tokens; if a task seems to need
  one, stop and say so instead of hardcoding a hex value.
- No new npm dependencies — everything needed (`zustand`, `lucide-react`, `clsx`,
  `tailwind-merge`) is already a dependency.

---

### Task 1: `ButtonVariant.Danger`

**Files:**
- Modify: `src/components/common/Button.tsx`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `ButtonVariant.Danger` member; `BUTTON_VARIANT_CLASSES[ButtonVariant.Danger]
  = 'bg-error-rose text-on-error hover:bg-error-rose/90'` — Task 7 (`ConfirmDialog`)
  consumes this. `IconButton.tsx` reuses `BUTTON_VARIANT_CLASSES` unchanged, so it gains
  the variant for free with no edit to that file.

- [ ] **Step 1: Add the variant and its class mapping**

In `src/components/common/Button.tsx`, replace the enum and the class map:

```ts
export const enum ButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Ghost = 'ghost',
  Danger = 'danger',
}

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  [ButtonVariant.Primary]: 'bg-primary text-on-primary hover:bg-primary/90',
  [ButtonVariant.Secondary]:
    'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
  [ButtonVariant.Ghost]: 'bg-transparent text-primary hover:bg-primary/10',
  [ButtonVariant.Danger]: 'bg-error-rose text-on-error hover:bg-error-rose/90',
};
```

Everything else in the file (the `Button` component itself) is unchanged.

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS. `Record<ButtonVariant, string>` being exhaustive is exactly what proves
every existing switch/map over `ButtonVariant` still compiles — if any other file
switches over `ButtonVariant` without a `default`, `tsc` will now flag the missing
`Danger` case there instead of silently ignoring it.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Nothing visible changes — `Danger` is unused until
Task 7.)

---

### Task 2: `Input`'s `rightSlot` prop

**Files:**
- Modify: `src/components/common/Input.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `Input`'s `rightSlot?: ReactNode` prop — Task 3 (`PasswordInput`) consumes
  it by passing an `IconButton` there.

- [ ] **Step 1: Add the prop**

Replace the whole of `src/components/common/Input.tsx` with:

```tsx
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  rightSlot?: ReactNode;
}

const Input = ({ icon, rightSlot, className, ...rest }: InputProps) => (
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
        rightSlot ? 'pr-10' : undefined,
        className,
      )}
      {...rest}
    />
    {rightSlot && (
      <span className="absolute top-1/2 right-1 -translate-y-1/2">{rightSlot}</span>
    )}
  </div>
);

export default Input;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (No existing `<Input>` call site passes `rightSlot`, so
nothing visible changes.)

---

### Task 3: `PasswordInput`

**Files:**
- Create: `src/components/common/PasswordInput.tsx`

**Interfaces:**
- Consumes: `Input` (default export, `src/components/common/Input.tsx`, with `rightSlot`
  from Task 2); `IconButton` (default export, `src/components/common/IconButton.tsx`).
- Produces: `PasswordInput` default export — a drop-in `<input type="password">`
  replacement with a show/hide toggle. Consumed by the (out-of-scope, follow-up)
  Sign-In-Email page rebuild.

- [ ] **Step 1: Write the component**

Create `src/components/common/PasswordInput.tsx`:

```tsx
import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from './Input.tsx';
import IconButton from './IconButton.tsx';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const PasswordInput = (props: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Input
      {...props}
      type={isVisible ? 'text' : 'password'}
      rightSlot={
        <IconButton
          icon={isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
          onClick={() => setIsVisible((visible) => !visible)}
        />
      }
    />
  );
};

export default PasswordInput;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Not wired into `SignInPage.tsx` yet — that is a
follow-up plan, per the spec's "Scope" section.)

---

### Task 4: `FormField`

**Files:**
- Create: `src/components/common/FormField.tsx`

**Interfaces:**
- Consumes: `cn` (`src/lib/cn.ts`).
- Produces: `FormField` default export — `{ id, label, error?, children, className? }`.
  The caller passes the same `id` string to `FormField` and to the child control (see
  spec "Global decisions" — no `cloneElement`). Consumed by the (out-of-scope,
  follow-up) Sign-In-Email page rebuild.

- [ ] **Step 1: Write the component**

Create `src/components/common/FormField.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

const FormField = ({ id, label, error, children, className }: FormFieldProps) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <label htmlFor={id} className="text-label-sm text-on-surface font-semibold">
      {label}
    </label>
    {children}
    {error && (
      <span role="alert" className="text-label-sm text-error">
        {error}
      </span>
    )}
  </div>
);

export default FormField;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Not wired into any page yet.)

---

### Task 5: `EmptyState`

**Files:**
- Create: `src/components/common/EmptyState.tsx`

**Interfaces:**
- Consumes: `cn` (`src/lib/cn.ts`).
- Produces: `EmptyState` default export — `{ icon, title, description?, action?,
  className? }`. Consumed by the (out-of-scope, follow-up) `HistoryPage.tsx` rebuild
  ("No releases found" / "Nothing archived yet").

- [ ] **Step 1: Write the component**

Create `src/components/common/EmptyState.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center gap-2 px-6 py-14 text-center',
      className,
    )}
  >
    <span className="bg-surface-container text-on-surface-variant mb-1 flex size-11 shrink-0 items-center justify-center rounded-xl">
      {icon}
    </span>
    <span className="text-body-lg text-on-surface font-semibold">{title}</span>
    {description && (
      <span className="text-body-md text-on-surface-variant max-w-[280px] leading-relaxed">
        {description}
      </span>
    )}
    {action && <span className="mt-2">{action}</span>}
  </div>
);

export default EmptyState;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Not wired into any page yet.)

---

### Task 6: `InlineBanner`

**Files:**
- Create: `src/components/common/InlineBanner.tsx`

**Interfaces:**
- Consumes: `cn` (`src/lib/cn.ts`).
- Produces: `BannerVariant` const enum (`Warning`, `Error`, `Info`) and `InlineBanner`
  default export — `{ variant, icon, children, action?, className? }`. Consumed by the
  (out-of-scope, follow-up) Dashboard rebuild ("Slack isn't connected", "GitHub access
  expired", "3 new commits landed").

- [ ] **Step 1: Write the component**

Create `src/components/common/InlineBanner.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const enum BannerVariant {
  Warning = 'warning',
  Error = 'error',
  Info = 'info',
}

const VARIANT_CLASSES: Record<BannerVariant, string> = {
  [BannerVariant.Warning]: 'bg-warning-purple/10 border-warning-purple/30 text-warning-purple',
  [BannerVariant.Error]: 'bg-error-rose/10 border-error-rose/30 text-error-rose',
  [BannerVariant.Info]: 'bg-primary-container/20 border-primary-container/40 text-primary',
};

interface InlineBannerProps {
  variant: BannerVariant;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

const InlineBanner = ({ variant, icon, children, action, className }: InlineBannerProps) => (
  <div
    role="alert"
    className={cn(
      'text-body-md flex items-center gap-3 rounded-xl border px-3 py-2.5',
      VARIANT_CLASSES[variant],
      className,
    )}
  >
    <span className="shrink-0">{icon}</span>
    <span className="min-w-0 flex-1">{children}</span>
    {action && <span className="shrink-0">{action}</span>}
  </div>
);

export default InlineBanner;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (`DisconnectBanner.tsx` is untouched — see spec "Global
decisions" for why this is a separate component, not a refactor of it.)

---

### Task 7: `ConfirmDialog`

**Files:**
- Create: `src/components/common/ConfirmDialog.tsx`

**Interfaces:**
- Consumes: `Button`, `ButtonVariant` (Task 1's `ButtonVariant.Danger`) from
  `src/components/common/Button.tsx`.
- Produces: `ConfirmDialog` default export — `{ isOpen, icon, title, description,
  confirmLabel, onConfirm, onCancel }`. Consumed by the (out-of-scope, follow-up)
  Dashboard ("Delete thread?") and History ("Remove {version}?") rebuilds.

- [ ] **Step 1: Write the component**

Create `src/components/common/ConfirmDialog.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import Button, { ButtonVariant } from './Button.tsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  isOpen,
  icon,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-surface-container-lowest w-[420px] rounded-2xl p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-error-rose/10 text-error-rose flex size-10 items-center justify-center rounded-xl">
          {icon}
        </div>
        <h2
          id="confirm-dialog-title"
          className="text-headline-md text-on-surface mt-4 font-semibold"
        >
          {title}
        </h2>
        <p className="text-body-md text-on-surface-variant mt-1.5">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant={ButtonVariant.Secondary} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={ButtonVariant.Danger} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS. In particular `eslint-plugin-react-hooks` must not flag the `useEffect`
— its only dependencies are `isOpen` and `onCancel`.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Not wired into any page yet.)

---

### Task 8: `toast-store`

**Files:**
- Create: `src/store/toast-store.ts`

**Interfaces:**
- Consumes: `createUUID` (`src/lib/uuid.ts`).
- Produces: `ToastKind` const enum (`Success`, `Progress`, `Warning`, `Error`);
  `ToastRecord` interface (`{ id, kind, title, description?, actionLabel?, onAction? }`);
  `useToastStore` — a Zustand store with `toast: ToastRecord | null`, `showToast:
  (toast: Omit<ToastRecord, 'id'>) => void`, `dismissToast: () => void`. Task 9
  (`Toast`) and Task 10 (`ToastViewport`, `use-toast`) both consume these exact names.

- [ ] **Step 1: Write the store**

Create `src/store/toast-store.ts`:

```ts
import { create } from 'zustand';
import { createUUID } from '@/lib/uuid.ts';

export const enum ToastKind {
  Success = 'success',
  Progress = 'progress',
  Warning = 'warning',
  Error = 'error',
}

export interface ToastRecord {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastStoreState {
  toast: ToastRecord | null;
  showToast: (toast: Omit<ToastRecord, 'id'>) => void;
  dismissToast: () => void;
}

const AUTO_DISMISS_MS = 5000;
const PERSISTENT_KINDS: ReadonlySet<ToastKind> = new Set([
  ToastKind.Progress,
  ToastKind.Error,
]);

let dismissTimeoutId: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastStoreState>()((set) => ({
  toast: null,
  showToast: (toast) => {
    clearTimeout(dismissTimeoutId);
    const id = createUUID();
    set({ toast: { ...toast, id } });

    if (!PERSISTENT_KINDS.has(toast.kind)) {
      dismissTimeoutId = setTimeout(() => {
        set((state) => (state.toast?.id === id ? { toast: null } : state));
      }, AUTO_DISMISS_MS);
    }
  },
  dismissToast: () => {
    clearTimeout(dismissTimeoutId);
    set({ toast: null });
  },
}));
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (No UI reads this store yet — that's Task 9/10.)

---

### Task 9: `Toast`

**Files:**
- Create: `src/components/common/Toast.tsx`

**Interfaces:**
- Consumes: `ToastKind`, `type ToastRecord` (Task 8, `src/store/toast-store.ts`).
- Produces: `Toast` default export — `{ toast: ToastRecord, onDismiss: () => void }`, a
  presentational component with no store access of its own. Task 10 (`ToastViewport`)
  consumes it.

- [ ] **Step 1: Write the component**

Create `src/components/common/Toast.tsx`:

```tsx
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { ToastKind, type ToastRecord } from '@/store/toast-store.ts';

interface ToastProps {
  toast: ToastRecord;
  onDismiss: () => void;
}

const renderIcon = (kind: ToastKind): ReactNode => {
  switch (kind) {
    case ToastKind.Success:
      return <CheckCircle2 className="text-success-emerald size-[18px]" />;
    case ToastKind.Progress:
      return <Loader2 className="text-primary-container size-[17px] animate-spin" />;
    case ToastKind.Warning:
      return <AlertTriangle className="text-warning-purple size-[18px]" />;
    case ToastKind.Error:
      return <XCircle className="text-error-rose size-[18px]" />;
  }
};

const Toast = ({ toast, onDismiss }: ToastProps) => (
  <div
    role="status"
    aria-live="polite"
    className="bg-inverse-surface text-inverse-on-surface fixed right-6 bottom-6 z-40 flex w-[372px] items-start gap-3 rounded-xl px-4 py-3.5 shadow-2xl"
  >
    <span className="flex size-5 shrink-0 items-center justify-center">
      {renderIcon(toast.kind)}
    </span>
    <div className="min-w-0 flex-1">
      <div className="text-body-md font-semibold">{toast.title}</div>
      {toast.description && (
        <div className="text-label-sm mt-0.5 opacity-70">{toast.description}</div>
      )}
    </div>
    {toast.actionLabel && toast.onAction && (
      <button
        type="button"
        onClick={toast.onAction}
        className="text-label-sm text-primary-container shrink-0 cursor-pointer font-semibold hover:opacity-80"
      >
        {toast.actionLabel}
      </button>
    )}
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss notification"
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-50 hover:opacity-100"
    >
      <X className="size-3.5" />
    </button>
  </div>
);

export default Toast;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS. `renderIcon`'s `switch` over `ToastKind` has no `default` — this is
intentional (all four members are handled), confirm `tsc` does not report a
not-all-paths-return error here; if it does, the switch needs a `default: return null`
appended (do this only if `pnpm build` actually fails on it).

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Not mounted anywhere yet — that's Task 10, and even
after Task 10 nothing calls `showToast` until a follow-up page-rebuild plan.)

---

### Task 10: `ToastViewport` + `useToast`

**Files:**
- Create: `src/components/common/ToastViewport.tsx`
- Create: `src/hooks/use-toast.ts`

**Interfaces:**
- Consumes: `useToastStore` (Task 8); `Toast` (Task 9).
- Produces: `ToastViewport` default export (no props — reads the store directly,
  renders `Toast` or nothing); `useToast()` hook returning `{ showToast: (toast:
  Omit<ToastRecord, 'id'>) => void }`. A follow-up plan mounts `<ToastViewport />` once
  near the app root (e.g. inside `App.tsx`, alongside `DisconnectBanner`) and calls
  `useToast().showToast(...)` from wherever a toast should fire — neither happens in
  this plan (see spec "Scope").

- [ ] **Step 1: Write `ToastViewport`**

Create `src/components/common/ToastViewport.tsx`:

```tsx
import { useToastStore } from '@/store/toast-store.ts';
import Toast from './Toast.tsx';

const ToastViewport = () => {
  const toast = useToastStore((state) => state.toast);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (!toast) return null;

  return <Toast toast={toast} onDismiss={dismissToast} />;
};

export default ToastViewport;
```

- [ ] **Step 2: Write `useToast`**

Create `src/hooks/use-toast.ts`:

```ts
import { useToastStore } from '@/store/toast-store.ts';
import type { ToastRecord } from '@/store/toast-store.ts';

export interface UseToastResult {
  showToast: (toast: Omit<ToastRecord, 'id'>) => void;
}

export const useToast = (): UseToastResult => {
  const showToast = useToastStore((state) => state.showToast);
  return { showToast };
};
```

- [ ] **Step 3: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Checkpoint**

Stop and report. Do not commit. (`ToastViewport` is not mounted in `App.tsx` yet, and
nothing calls `useToast()` yet — both are follow-up-plan work, per the spec's "Scope"
section.)

---

### Task 11: `DropdownMenu`

**Files:**
- Create: `src/components/common/DropdownMenu.tsx`

**Interfaces:**
- Consumes: `cn` (`src/lib/cn.ts`).
- Produces: `DropdownMenu` default export (compound: `DropdownMenu.Item`,
  `DropdownMenu.Separator`) — `{ isOpen, onClose, align?: 'start' | 'end', className?,
  children }` on the root; `{ icon?, hint?, danger?, onClick, children }` on `Item`.
  Caller must wrap the trigger + menu pair in a `position: relative` element and render
  `DropdownMenu` as a sibling of the trigger inside it, matching every menu placement in
  the design. Consumed by the (out-of-scope, follow-up) Dashboard (thread row menu,
  account menu, thread-header menu) and History (release detail menu) rebuilds.

- [ ] **Step 1: Write the component**

Create `src/components/common/DropdownMenu.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  align?: 'start' | 'end';
  className?: string;
  children: ReactNode;
}

const DropdownMenuRoot = ({
  isOpen,
  onClose,
  align = 'start',
  className,
  children,
}: DropdownMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'bg-surface-container-lowest absolute z-30 w-56 rounded-xl p-1.5 shadow-2xl',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
};

interface DropdownMenuItemProps {
  icon?: ReactNode;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}

const DropdownMenuItem = ({
  icon,
  hint,
  danger = false,
  onClick,
  children,
}: DropdownMenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={cn(
      'text-body-md flex h-[34px] w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left font-medium transition-colors',
      danger
        ? 'text-error-rose hover:bg-error-rose/10'
        : 'text-on-surface hover:bg-surface-container',
    )}
  >
    {icon && (
      <span className={cn('shrink-0', danger ? 'text-error-rose' : 'text-on-surface-variant')}>
        {icon}
      </span>
    )}
    <span className="flex-1 truncate">{children}</span>
    {hint && <span className="text-label-sm text-on-surface-variant/70 shrink-0">{hint}</span>}
  </button>
);

const DropdownMenuSeparator = () => <div className="bg-outline-variant my-1.5 h-px" />;

const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
});

export default DropdownMenu;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS. In particular `eslint-plugin-react-hooks` must not flag the `useEffect`
— its only dependencies are `isOpen` and `onClose`.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Not wired into any page yet. This is the last task in
this plan — the full primitive set from the spec's "Problem" section now exists:
`DropdownMenu`, `Toast`/`ToastViewport`/`useToast`, `ConfirmDialog`, `InlineBanner`,
`PasswordInput`, `FormField`, `EmptyState`, plus `ButtonVariant.Danger` and `Input`'s
`rightSlot`. Composing them into `SignInPage`, `ThreadSidebar`/`DashboardPage`, and
`HistoryPage` is the next plan(s), per the spec's "Scope" section.)
