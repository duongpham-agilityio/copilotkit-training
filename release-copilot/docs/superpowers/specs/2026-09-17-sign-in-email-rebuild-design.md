# Sign-In Email Rebuild — Design

**Date:** 2026-09-17
**Status:** Approved, pending implementation

## Problem

`SignInPage.tsx` currently renders a single GitHub-OAuth button with no email/password
option. The Claude Design artifact's "Sign In — Email" board (`SignInEmail.dc.html`) adds
a split brand-panel/form layout with an email + password form, and per earlier explicit
direction only this board ships — the plain-GitHub-only "Sign In" board is out of scope.
`AuthService` only exposes `signInWithOAuth`/`signOut`/`onAuthStateChange` — there is no
password-based sign-in method anywhere in the codebase.

## Scope

Rebuild `SignInPage.tsx` to match the Sign-In-Email board, and add the
`signInWithPassword` capability it needs. The design board also keeps a secondary
"Continue with GitHub" button on the same screen — that stays, using the existing
`signInWithOAuth('github')` path unchanged.

**Explicitly out of scope**, per user decision during design:

- **Signup** ("Create an account" link on the board). No self-serve account creation
  exists anywhere in this app; adding one is a separate, larger scope. The link is
  omitted entirely (not rendered), not left as a dead `href="#"`.
- **Forgot password** (the design's inline link next to the Password label). No
  `resetPasswordForEmail` flow exists; omitted entirely for the same reason as signup.
- **Terms of Service / Privacy Policy footer text.** The design's footer links to pages
  that don't exist in this app. Omitted rather than shipping dead links.
- **The plain-GitHub-only "Sign In" board** (`SignIn.dc.html`). Per the original
  direction ("Đối với sign-in thì sẽ chỉ dùng version Sign In — Email"), this plan
  builds only the email board.

## Global decisions

- **Reuse the design-system-foundation primitives already built.** The board's password
  field with show/hide toggle is exactly `PasswordInput`; each labeled field is exactly
  `FormField`; the inline "email and password don't match" error box is close enough to
  `InlineBanner`'s `BannerVariant.Error` (icon + message, rounded, bordered card) to
  reuse directly rather than hand-rolling a one-off error box — keeps the sign-in
  screen visually consistent with every other error surface in the app.
- **No new `AuthLayout` abstraction.** The split brand-panel/form layout has exactly one
  consumer (`SignInPage.tsx`) now that signup/reset are out of scope — the only other
  candidate consumers this design imagined. Building a reusable layout component for a
  single call site is the "hypothetical future requirements" case
  `.agents/rules/code-style.md` warns against. The brand panel is a local, unexported
  `const` inside `SignInPage.tsx`.
- **Product naming: "Release Copilot", not "Release Builder".** The design artifact
  invented the placeholder product name "Release Builder"; this app's actual name,
  already used in `AppHeader.tsx`, is "Release Copilot". Every copy string carried over
  from the design (wordmark, headline sentence, panel eyebrow) substitutes the real
  name.
- **Logo: use the existing `/images/app-logo.png` asset**, not the design's placeholder
  chevron-mark SVG. Same image renders in both the brand-panel header and the
  auth-panel header, at the sizes those slots use in the design.
- **Brand panel background needs one new token.** The design's `#26063f` panel
  background has no existing match in `theme.css`'s dark-purple tones (`on-primary-fixed`
  at `#25005a` is close but not exact). Per explicit decision, add
  `--color-primary-ink: #26063f` to `theme.css` — the file's own header comment
  designates it as the only place color *values* belong, so this isn't the "hardcoded
  hex in a component" case `.agents/rules/code-style.md` forbids. The radial glow
  effects layer translucent `primary`/`primary-container` on top (existing tokens,
  opacity modifiers), so this is the only new token needed.
- **`signInWithPassword` throws on failure, matching `signInWithOAuth`'s existing
  async-void shape.** `AuthService.signInWithPassword(email, password): Promise<void>`.
  The Supabase implementation calls `auth.signInWithPassword` and throws the returned
  `error` rather than returning `{ error }`, so the call site can use the same
  `useMutation` pattern `useSlackPublish`/`SlackPublishCard` already establish in this
  codebase (mutation throws → `mutation.isError`/`mutation.error` drive the UI) instead
  of introducing a second error-handling convention.
- **Error-message mapping lives in its own function, outside `AuthService` and outside
  the form component** — per explicit direction: the form only renders whatever string
  it's given; deciding *what* that string is is a separate concern.
  `src/utils/supabase-sign-in-error-message.ts` exports
  `getSignInErrorMessage(error: unknown): string`. It checks
  `isAuthApiError(error) && error.code === 'invalid_credentials'` (the exact code
  `@supabase/auth-js` — re-exported from `@supabase/supabase-js`, already a dependency —
  uses for wrong email/password) and returns the design's exact copy for that one case;
  any other error (rate limit, network failure, etc.) falls through to
  `error.message`. Lives in `src/utils/` (currently empty but for `.gitkeep` — this
  repo's designated home for this kind of helper) rather than `src/lib/auth/`, and is
  named with a `supabase-` prefix because — unlike `AuthService`'s generic interface —
  it reads a Supabase-specific error shape directly and would need rewriting if the
  auth provider ever changed.
- **`index.html` gets a `<link rel="preload" as="image">` for the logo**, not
  `preconnect`/`dns-prefetch`. The asset is same-origin, so connection-setup hints
  (`preconnect`/`dns-prefetch`) do nothing — those only help cross-origin requests.
  Today the logo is already fetched immediately via the splash-screen `<img>` in
  `index.html`'s initial markup, so `SignInPage`'s two additional uses of the same URL
  hit cache either way — but the user intends to remove the splash screen later, at
  which point `SignInPage` becomes the first thing to request this image, discovered
  only after the JS bundle renders it. Adding the preload hint now costs nothing while
  the splash screen still exists and keeps this correct after it's removed, so it's
  in scope here rather than deferred to whatever change removes the splash screen.

## Rejected alternatives

| Rejected | Reason |
| --- | --- |
| Reusable `AuthLayout` split-panel component | Signup/reset are explicitly out of scope, leaving exactly one consumer — premature abstraction for a single call site. |
| Hand-rolled one-off error box matching the design's exact non-bordered style | `InlineBanner`'s `BannerVariant.Error` is close enough (icon + message + rounded card) that a second, near-duplicate error component would fragment the design system for a cosmetic difference. |
| `preconnect`/`dns-prefetch` for the logo image | Same-origin resource — these hints only accelerate cross-origin connection setup and do nothing here. |
| Reuse `on-primary-fixed` (`#25005a`) instead of adding a token | Explicit decision: close is not exact, and `theme.css` is the sanctioned place for new color values per its own header comment. |
| `getSignInErrorMessage` inside `AuthService` or inside the form component | Explicit direction: the mapping decision and the rendering of its result are different concerns and belong in different files. |
| `getSignInErrorMessage` under `src/lib/auth/` | Explicit direction: it's not shared/lib-level auth configuration, it's a one-off helper — belongs in `src/utils/`. |
| Ship "Create an account" / "Forgot password" / ToS-Privacy links pointing at `#` | Dead links with no real destination; omitting them is more honest than faking functionality that doesn't exist yet. |
