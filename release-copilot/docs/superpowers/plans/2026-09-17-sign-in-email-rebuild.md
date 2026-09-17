# Sign-In Email Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `SignInPage.tsx` into the Sign-In-Email board's split brand-panel/form
layout, adding the `signInWithPassword` capability it needs — bottom-up: theme token,
`AuthService` extension, error-mapping helper, hook, then the page itself.

**Architecture:** Six sequential tasks. Tasks 1-5 each extend one existing seam
(`theme.css`, `AuthService`, a new `src/utils/` helper, `useAuth`, `index.html`) with no
visible behavior change on their own. Task 6 rebuilds `SignInPage.tsx`, consuming
everything before it plus the `common/` primitives already built in the design-system-
foundation plan (`FormField`, `PasswordInput`, `InlineBanner`, `Button`).

**Tech Stack:** React 19, TypeScript (strict), Tailwind v4, `@tanstack/react-query`
(`useMutation`, already a dependency — same pattern `useSlackPublish`/`SlackPublishCard`
use), `@supabase/supabase-js` (`isAuthApiError`), `lucide-react`.

**Spec:** `docs/superpowers/specs/2026-09-17-sign-in-email-rebuild-design.md`

## Global Constraints

- **No unit tests, no new Storybook stories.** No route/page in `src/routes/` has a
  `.stories.tsx` file in this codebase — `SignInPage.tsx` doesn't get one either.
  Verification per task is `pnpm build` + `pnpm lint` clean, plus the task's
  "Checkpoint" read-through.
- **No git commits, pushes, or PRs at any point in this plan.** Checkpoint steps mean
  "stop and let the user review." The user commits when they ask for it.
- Arrow functions only (including components), `const` by default, template literals,
  destructure 2+ fields read from the same object.
- `import type` for type-only imports. Explicit `.ts`/`.tsx` extensions on relative
  imports; `@/`-alias imports do not carry them (matches existing files).
- No `any`. `const enum` for any fixed set of values used as both a type and a runtime
  value (none needed in this plan — no new variant/kind set is introduced).
- Files kebab-case, except `.tsx` files that default-export a React component
  (PascalCase). Folders always kebab-case.
- No hardcoded hex colors in component files — every color is a `theme.css` token. The
  one exception is Task 1 itself: `theme.css` is the sanctioned place for a new color
  *value* (see spec "Global decisions").
- No new npm dependencies — `@tanstack/react-query`, `@supabase/supabase-js`,
  `lucide-react` are already dependencies.
- Product name in all UI copy is **"Release Copilot"**, not the design artifact's
  placeholder "Release Builder".
- Signup ("Create an account"), "Forgot password?", and the Terms/Privacy footer are
  **omitted entirely** — not rendered, not dead `href="#"` links (see spec "Scope").

---

### Task 1: `theme.css` — `--color-primary-ink` token

**Files:**
- Modify: `src/styles/theme.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `bg-primary-ink` Tailwind utility (via the existing `@theme inline` mapping
  in `src/index.css` — no change needed there, it maps every `--color-*` name
  automatically). Task 6 (`SignInPage.tsx`) consumes it for the brand panel background.

- [ ] **Step 1: Add the token**

In `src/styles/theme.css`, add this line immediately after `--color-primary-fixed:
#eaddff;`'s block of `*-fixed*` tokens (anywhere inside the `:root { /* Colors */ ... }`
block is fine — place it next to `--color-primary` for readability):

```css
--color-primary-ink: #26063f;
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Nothing visible changes — the token is unused until
Task 6.)

---

### Task 2: `AuthService.signInWithPassword`

**Files:**
- Modify: `src/lib/auth/auth-service.ts`
- Modify: `src/lib/auth/supabase-auth-service.ts`

**Interfaces:**
- Consumes: `supabaseBrowserClient` (`src/lib/supabase/browser-client.ts`, already
  imported by `supabase-auth-service.ts`).
- Produces: `AuthService.signInWithPassword(email: string, password: string):
  Promise<void>` — throws the Supabase `AuthError` on failure, matching
  `signInWithOAuth`'s existing async-void-that-throws shape. Task 4 (`useAuth`) wraps
  this; Task 6 (`SignInPage.tsx`) calls it via `useMutation`.

- [ ] **Step 1: Extend the interface**

In `src/lib/auth/auth-service.ts`, add one member to the `AuthService` interface:

```ts
export interface AuthService {
  signInWithOAuth: (provider: OAuthProvider, redirectTo: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  onAuthStateChange: (listener: AuthStateListener) => () => void;
}
```

Nothing else in the file changes.

- [ ] **Step 2: Implement it**

In `src/lib/auth/supabase-auth-service.ts`, add the method to the `supabaseAuthService`
object (alongside the existing `signInWithOAuth`):

```ts
export const supabaseAuthService: AuthService = {
  signInWithOAuth: async (provider, redirectTo) => {
    await supabaseBrowserClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  },
  signInWithPassword: async (email, password) => {
    const { error } = await supabaseBrowserClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  },
  signOut: async () => {
    await supabaseBrowserClient.auth.signOut();
  },
  onAuthStateChange: (listener) => {
    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => {
      listener(toAuthServiceSession(session));
    });
    return () => subscription.unsubscribe();
  },
};
```

(Only the `signInWithPassword` member is new — `signInWithOAuth`, `signOut`,
`onAuthStateChange` and the file's imports/`toAuthServiceSession` helper are unchanged,
shown here only for placement context.)

- [ ] **Step 3: Verify**

Run: `pnpm build`
Expected: PASS. `AuthService` being an interface with `signInWithPassword` now required
means `tsc` would flag any other `AuthService` implementation missing it — there is
only the one (`supabaseAuthService`), so this should be silent.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Checkpoint**

Stop and report. Do not commit. (Nothing calls this yet — that's Task 4.)

---

### Task 3: `supabase-sign-in-error-message`

**Files:**
- Create: `src/utils/supabase-sign-in-error-message.ts`

**Interfaces:**
- Consumes: `isAuthApiError` (`@supabase/supabase-js`, re-exported from
  `@supabase/auth-js`).
- Produces: `getSignInErrorMessage(error: unknown): string`. Task 6 (`SignInPage.tsx`)
  calls this with the `useMutation` error to get the string `InlineBanner` renders.

- [ ] **Step 1: Write the helper**

Create `src/utils/supabase-sign-in-error-message.ts`:

```ts
import { isAuthApiError } from '@supabase/supabase-js';

const INVALID_CREDENTIALS_MESSAGE =
  "That email and password don't match. Try again, or reset your password.";

export const getSignInErrorMessage = (error: unknown): string => {
  if (isAuthApiError(error) && error.code === 'invalid_credentials') {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
};
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Nothing calls this yet — that's Task 6.)

---

### Task 4: `useAuth` — expose `signInWithPassword`

**Files:**
- Modify: `src/hooks/use-auth.ts`

**Interfaces:**
- Consumes: `supabaseAuthService.signInWithPassword` (Task 2).
- Produces: `useAuth()` return value gains `signInWithPassword: (email: string,
  password: string) => Promise<void>`. Task 6 (`SignInPage.tsx`) consumes it.

- [ ] **Step 1: Add the method**

In `src/hooks/use-auth.ts`, add `signInWithPassword` next to the existing
`signInWithOAuth`/`signOut` definitions and include it in the returned object:

```ts
const signInWithPassword = (email: string, password: string) =>
  supabaseAuthService.signInWithPassword(email, password);
```

Update the return statement:

```ts
return { session, status, signInWithOAuth, signInWithPassword, signOut };
```

Nothing else in the file changes — `signInWithPassword` doesn't need a `redirectTo`
(unlike OAuth, it isn't a redirect-based flow; success is picked up by the existing
`onAuthStateChange` subscription already wired up in this hook, which flips
`AuthStatus` to `SignedIn` and lets `AppBootstrap.tsx`'s existing redirect logic take
over — no new redirect code anywhere in this plan).

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit. (Nothing calls this yet — that's Task 6.)

---

### Task 5: `index.html` — preload the logo

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks — this is a standalone perf hint (see spec
  "Global decisions" for why `preload`, not `preconnect`/`dns-prefetch`).

- [ ] **Step 1: Add the preload link**

In `index.html`'s `<head>`, add this line (placement: anywhere in `<head>`, e.g. right
after the existing `<link rel="icon" ...>` line):

```html
<link rel="preload" as="image" href="/images/app-logo.png" fetchpriority="high" />
```

- [ ] **Step 2: Verify**

Run: `pnpm build`
Expected: PASS (this is a static HTML change — `tsc`/Vite don't validate `<link>` tags,
but confirm the build still completes and `dist/index.html` contains the new line).

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Stop and report. Do not commit.

---

### Task 6: `GithubMark` icon + rebuild `SignInPage.tsx`

**Files:**
- Create: `src/icons/GithubMark.tsx`
- Modify: `src/routes/SignInPage.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4, `signInWithPassword` + existing `signInWithOAuth`);
  `getSignInErrorMessage` (Task 3); `bg-primary-ink` token (Task 1); `Button`,
  `ButtonVariant` (`src/components/common/Button.tsx`); `Input`
  (`src/components/common/Input.tsx`); `PasswordInput`
  (`src/components/common/PasswordInput.tsx`); `FormField`
  (`src/components/common/FormField.tsx`); `InlineBanner`, `BannerVariant`
  (`src/components/common/InlineBanner.tsx`); `useMutation`
  (`@tanstack/react-query`).
- Produces: `GithubMark` default export (`src/icons/GithubMark.tsx`) — a plain SVG icon
  component, same call shape as a `lucide-react` icon (`className` passed through, no
  other props), for cases like this one where the brand mark isn't in `lucide-react`'s
  icon set. `SignInPage` default export — the route component wired at
  `ROUTE_SIGN_IN` in `src/routes/router.ts` (routing config itself does not change).

- [ ] **Step 1: Create the `GithubMark` icon**

`lucide-react` (already a dependency) doesn't ship brand/logo icons, only generic
outline icons — there's no "Github" export in it. Create `src/icons/GithubMark.tsx` so
this one-off brand SVG lives outside the page file, in a dedicated place for icons that
aren't in `lucide-react`:

```tsx
import type { SVGProps } from 'react';

const GithubMark = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

export default GithubMark;
```

`SVGProps<SVGSVGElement>` (not a bespoke `{ className? }` prop) matches how every
`lucide-react` icon is typed, so `GithubMark` drops into the same
`<Icon className="..." />` call shape `SignInPage.tsx` already uses for `AlertCircle`/
`GitCommit`/`Send`/`Sparkles` — no special-casing needed at the call site.

- [ ] **Step 2: Replace the whole `SignInPage.tsx` file**

Replace the whole of `src/routes/SignInPage.tsx` with:

```tsx
import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, GitCommit, Send, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth.ts';
import { getSignInErrorMessage } from '@/utils/supabase-sign-in-error-message.ts';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import Input from '@/components/common/Input.tsx';
import PasswordInput from '@/components/common/PasswordInput.tsx';
import FormField from '@/components/common/FormField.tsx';
import InlineBanner, { BannerVariant } from '@/components/common/InlineBanner.tsx';
import GithubMark from '@/icons/GithubMark.tsx';

interface BrandFeature {
  icon: ReactNode;
  label: string;
}

const BRAND_FEATURES: BrandFeature[] = [
  {
    icon: <GitCommit className="size-4.5" />,
    label: 'Reads every commit since your last release',
  },
  {
    icon: <Sparkles className="size-4.5" />,
    label: 'Drafts and edits notes with AI',
  },
  {
    icon: <Send className="size-4.5" />,
    label: 'Publishes straight to Slack, the App Store, and GitHub',
  },
];

const BrandPanel = () => (
  <div className="bg-primary-ink relative hidden w-[45%] max-w-140 shrink-0 flex-col overflow-hidden px-16 py-14 lg:flex">
    <div className="bg-primary-container/40 pointer-events-none absolute -top-45 -left-35 size-140 rounded-full blur-3xl" />
    <div className="bg-primary/45 pointer-events-none absolute -right-40 -bottom-55 size-155 rounded-full blur-3xl" />

    <div className="relative flex items-center gap-3">
      <img src="/images/app-logo.png" alt="" className="size-9 rounded-xl" />
      <span className="text-body-lg font-bold tracking-tight text-white">
        Release Copilot
      </span>
    </div>

    <div className="relative flex flex-1 flex-col justify-center gap-9">
      <h1 className="text-display text-white">
        Ship release notes your team will actually read.
      </h1>
      <p className="text-body-lg max-w-130 leading-relaxed text-white/70">
        Release Copilot turns your commit history into clear, on-brand notes for
        Slack, the App Store, and GitHub — in minutes, not hours.
      </p>
      <div className="mt-2 flex flex-col gap-5">
        {BRAND_FEATURES.map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
              {icon}
            </span>
            <span className="text-body-md font-medium text-white/90">{label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SignInPage = () => {
  const { signInWithOAuth, signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: (variables: { email: string; password: string }) =>
      signInWithPassword(variables.email, variables.password),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <div className="bg-surface-container-lowest flex min-h-screen">
      <BrandPanel />

      <div className="flex flex-1 flex-col px-8 py-10 sm:px-16">
        <div className="flex items-center gap-2.5">
          <img src="/images/app-logo.png" alt="" className="size-7 rounded-lg" />
          <span className="text-body-md text-on-surface-variant font-semibold">
            Release Copilot
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-95 flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <h2 className="text-headline-lg text-on-surface">Sign in with email</h2>
              <p className="text-body-md text-on-surface-variant">
                Enter your work email and password to continue.
              </p>
            </div>

            {mutation.isError && (
              <InlineBanner
                variant={BannerVariant.Error}
                icon={<AlertCircle className="size-4" />}
              >
                {getSignInErrorMessage(mutation.error)}
              </InlineBanner>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <FormField id="sign-in-email" label="Email">
                <Input
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </FormField>

              <FormField id="sign-in-password" label="Password">
                <PasswordInput
                  id="sign-in-password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </FormField>

              <Button
                type="submit"
                disabled={!email || !password || mutation.isPending}
              >
                {mutation.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="text-on-surface-variant flex items-center gap-3 text-[12.5px] font-medium">
              <span className="bg-outline-variant h-px flex-1" />
              or
              <span className="bg-outline-variant h-px flex-1" />
            </div>

            <Button
              variant={ButtonVariant.Secondary}
              className="bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container border"
              onClick={() => void signInWithOAuth('github')}
            >
              <span className="flex items-center justify-center gap-2.5">
                <GithubMark />
                Continue with GitHub
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
```

Notes on this rewrite:
- `ButtonVariant.Secondary` + a `className` override for the GitHub button follows the
  exact same pattern already applied to `ConfirmDialog`'s Cancel button (white
  background + border instead of `Secondary`'s default purple-tinted background) — see
  that component for the precedent this repeats.
- The brand panel is `hidden` below the `lg` breakpoint (Tailwind's `lg:flex`) — the
  design is a fixed 1440×920 canvas with no mobile behavior specified; hiding the brand
  panel and centering the form full-width on narrow screens follows the same
  responsive-hide pattern `AppHeader.tsx` already uses for its nav (`hidden sm:block` /
  `sm:hidden`).
- `mutation.mutate({ email, password })` passes current field values as `useMutation`
  variables rather than closing over `email`/`password` state — avoids any stale-closure
  risk if this is ever refactored.

- [ ] **Step 3: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Manual checkpoint**

Start the dev server (`pnpm dev`) and visually check `/sign-in`:
- Brand panel renders on desktop width with the app logo, headline, and 3 feature
  rows; hidden below `lg` width.
- Auth panel renders the app logo + "Release Copilot", heading, email field, password
  field with working show/hide toggle, disabled "Sign in" button until both fields have
  a value.
- Submitting valid-looking-but-wrong credentials shows the `InlineBanner` error (exact
  copy: "That email and password don't match. Try again, or reset your password.")
  without a page reload.
- "Continue with GitHub" still triggers the existing OAuth redirect (unchanged
  behavior).
- No "Forgot password?", "Create an account", or Terms/Privacy text renders anywhere.

Stop and report. Do not commit. (This is the last task in this plan.)
