---
date: 2026-09-17
branch: v2-dev
commit: uncommitted
files: [src/providers/QueryProvider.tsx, src/providers/AppProviders.tsx, src/main.tsx]
severity: high
---

# SignInPage crashes: no QueryClientProvider in its render tree

## Summary

The rebuilt `SignInPage.tsx` uses `useMutation` from `@tanstack/react-query` to drive
email/password sign-in, but `QueryClientProvider` was only mounted inside the
dashboard's route subtree, not above the sign-in route. Rendering `/sign-in` threw
immediately.

## Root Cause

`src/routes/router.ts:14-16` mounts `SignInPage` as a direct sibling of the dashboard
route under `AppBootstrap`, not as a descendant of `App` (`src/App.tsx:17`). The only
`QueryClientProvider` in the app lived inside `AppProviders`
(`src/providers/AppProviders.tsx`, pre-fix), which is instantiated exclusively inside
`App.tsx:17-22` — i.e. only wraps `DashboardPage`/`HistoryPage`. `SignInPage` sat
outside that subtree entirely, so any `@tanstack/react-query` hook called from it had
no `QueryClient` in context.

This was latent until now: the previous `SignInPage.tsx` had no `react-query` usage.
The sign-in-email rebuild (this session, task 6 of
`docs/superpowers/plans/2026-09-17-sign-in-email-rebuild.md`) introduced
`useMutation` for the sign-in form, which was the first thing on that route to need
the context — surfacing the pre-existing structural gap.

## Explanation

1. User navigates to `/sign-in` → `router.ts` renders `AppBootstrap` → `SignInPage`
   directly (no `App`/`AppProviders` ancestor).
2. `SignInPage` calls `useMutation({...})`.
3. `@tanstack/react-query` looks up `QueryClient` via React context, finds none
   (no `QueryClientProvider` above it in this route), and throws.
4. `App.tsx`'s `AppProviders` — the only place a `QueryClientProvider` existed — is
   never reached because the router never renders `App` for this route.

Not caught by `pnpm build`/`pnpm lint`: this is a runtime provider-wiring issue, not a
type or lint error — `useMutation`'s type signature doesn't encode "must be rendered
under a `QueryClientProvider`."

## Solution

Move `QueryClientProvider` out of the session-gated `AppProviders` (dashboard-only)
and into a new top-level provider that wraps the entire router, so every route —
authenticated or not — shares one `QueryClient`. `AppProviders` keeps only what
genuinely requires an authenticated session: `CopilotKit` (needs the session's
`accessToken` for its `Authorization` header) and the page-level `ErrorBoundary`.

Rejected: wrapping `SignInPage` itself in a second, page-local `QueryClientProvider`.
That would create two separate `QueryClient` instances in the app with no cache or
config sharing — works, but is the wrong shape for what should be one global concern.

## Solution Details

- **Created `src/providers/QueryProvider.tsx`**: extracted the `queryClient`
  construction (retry policy, `QueryCache` error logging) and its
  `QueryClientProvider` wrapper, unchanged, out of `AppProviders.tsx` into this new
  standalone component.
- **Modified `src/providers/AppProviders.tsx`**: removed the `QueryCache`/
  `QueryClient`/`QueryClientProvider` imports, the `queryClient` instance, and the
  `<QueryClientProvider>` wrapper element. It now renders only
  `<ErrorBoundary><CopilotKit>{children}</CopilotKit></ErrorBoundary>` — unchanged
  otherwise, still reads `useAuthStore((state) => state.session!.accessToken)`, which
  is still safe because `AppProviders` is still only mounted inside `App.tsx`'s
  authenticated subtree.
- **Modified `src/main.tsx`**: wraps `<RouterProvider router={router} />` in the new
  `<QueryProvider>`, above the router entirely — so both `SignInPage` and the
  dashboard subtree (via ordinary React context inheritance, no re-wrapping needed at
  `App.tsx`) share the same single `QueryClient` instance.

Before (`main.tsx`):
```tsx
<StrictMode>
  <RouterProvider router={router} />
</StrictMode>
```

After:
```tsx
<StrictMode>
  <QueryProvider>
    <RouterProvider router={router} />
  </QueryProvider>
</StrictMode>
```

This is a real fix, not a workaround: it corrects where the shared, cross-cutting
`QueryClient` context is mounted (app root) versus where it was (a session-dependent
subtree it should never have been scoped to), rather than papering over the crash
with a second client or a conditional hook call.

## Verification

Ran and observed:

```
$ pnpm build
✓ built in 1.23s
```

```
$ pnpm lint
> release-copilot@0.0.0 lint
> eslint .
(no output — clean)
```

```
$ curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:5173/sign-in
200
```

`dist/index.html` and the dev server both reflect the change (confirmed via `grep` on
the built output and a live `pnpm dev` process). Full click-through/visual
verification of the sign-in form in a browser was not performed in this session — no
browser automation tool was available; the user should confirm interactively.

## Prevention

No test suite exists in this repo for this kind of provider-wiring issue (project
convention is `pnpm lint` + `pnpm build` only, no unit/integration tests — see
`docs/superpowers/specs/2026-09-17-design-system-foundation-design.md`). The concrete,
low-cost preventer here is structural rather than a test: keep exactly one
`QueryClientProvider` mounted at the true application root (`main.tsx`, done by this
fix) rather than inside any per-route or session-gated provider component, so no
future route can silently fall outside its coverage. When reviewing new provider
components, check whether they're mounted above every route that needs them or only
above a subset.
