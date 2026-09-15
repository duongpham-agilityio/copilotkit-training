# Supabase Auth for Release Copilot — Design

**Date:** 2026-09-08 (revised same day after review feedback)
**Status:** Revised, pending user review

## Revision note

This supersedes the first draft. Changes made after review feedback, each verified
against live sources before being written down here (not assumed from training data,
per this project's `mastra` skill rule):

1. **Supabase key naming.** Supabase is retiring the `anon` / `service_role` key names
   in favor of **publishable** (`sb_publishable_...`) and **secret** (`sb_secret_...`)
   keys — new projects (created after November 2025) no longer issue legacy keys at all.
   Confirmed via Supabase's own migration guide. This design uses the current names
   throughout (`SUPABASE_PUBLISHABLE_KEY`, not `SUPABASE_ANON_KEY`).
2. **Use `@mastra/auth-supabase` on the server**, per feedback, instead of a hand-rolled
   `authenticateToken` function. Verified its actual shipped API (fetched
   `@mastra/auth-supabase`'s real `.d.ts` from the registry, not just its docs page):
   `MastraAuthSupabaseOptions` is `{ url?, anonKey?, name?, authorizeUser?, protected?,
   public? }` — **it has no `mapUserToResourceId` option**, unlike `MastraJwtAuth`. Using
   it as-is would lose per-user thread scoping, which the project's stated requirement
   ("thread chat phải lưu theo user") depends on. The fix, confirmed against this
   project's actually-installed `@mastra/server@1.57.0` package (`dist/server/auth/`):
   Mastra's own docs describe exactly this gap under "Advanced: Setting resource ID in
   middleware" — add one small `server.middleware` entry that calls the framework's own
   `getAuthenticatedUser()` helper (re-uses the configured `MastraAuthSupabase` instance,
   no duplicate verification logic) and sets `MASTRA_RESOURCE_ID_KEY` on the request
   context. Both `getAuthenticatedUser` (`@mastra/server/auth`) and
   `MASTRA_RESOURCE_ID_KEY` (`@mastra/core/request-context`) were confirmed present in
   the installed packages by reading their `.d.ts` files directly.
3. **A provider-agnostic auth service layer**, per feedback, so components/hooks never
   import `@supabase/supabase-js` directly — swapping providers later touches one file.
4. **A dedicated `useAuth` hook**, per feedback, so `AppBootstrap` stops owning
   subscription/session-sync logic directly and just consumes `status`.
5. **An env-var validation helper**, per feedback, replacing the duplicated
   `if (!x) throw` blocks originally planned in each client file.
6. **Scope trim, per instruction:** this pass stops at "connection works, sign-in flow
   works, threads save per user." The header sign-out button / real-avatar polish from
   the first draft is deferred to a separate UI-focused pass and is **out of scope**
   here. The sign-in page keeps plain, minimal buttons only because there is no way to
   exercise the sign-in flow at all without them — that is functional plumbing, not the
   deferred UI work.

## Problem

(Unchanged from the original draft.) The app has no authentication.
`src/routes/SignInPage.tsx` is a placeholder and `src/routes/AppBootstrap.tsx` is an
empty `Outlet` pass-through, scaffolded in `feat/auth-routing-scaffold` for this purpose.
Every Mastra server route is unauthenticated and CORS is wide open — the Slack-publish
design (`docs/superpowers/specs/2026-08-18-slack-channel-design.md`) already flags this
as a deployment blocker. The CopilotKit chat endpoint has the same exposure and uses one
hardcoded `resourceId` for every visitor, so there is no per-user thread isolation.

## Solution

Supabase Auth with OAuth (Google, GitHub). The browser holds the session through a small
provider-agnostic `AuthService` interface backed by a Supabase implementation — nothing
outside `src/lib/auth/` and `src/lib/supabase/` imports `@supabase/supabase-js` directly.
A `useAuth` hook wraps that service plus a Zustand store for React consumers. The Mastra
server verifies the JWT using the official `@mastra/auth-supabase` package
(`MastraAuthSupabase`) and bridges per-user thread scoping via one documented
`server.middleware` entry, since that package doesn't expose a resourceId-mapping hook
itself.

## Rejected alternatives

| Rejected | Reason |
| --- | --- |
| Hand-rolled `authenticateToken`/`mapUserToResourceId` via a plain `MastraAuthConfig` object (first draft's approach) | Superseded per feedback — `@mastra/auth-supabase` is the maintained, documented provider for this exact case and should be used instead of reimplementing token verification by hand. |
| `@mastra/auth-supabase`'s default `authorizeUser` (checks an `isAdmin` column) | Not what this app needs — any authenticated user should get access. Overridden with `authorizeUser: () => true` in the constructor, which the class's documented options explicitly support. |
| Full custom Hono middleware doing JWT verification itself | Still rejected for verification — `MastraAuthSupabase` owns that. The **one** middleware entry this design does add is narrowly scoped to resourceId bridging only, and re-uses the provider's own verification via `getAuthenticatedUser()` rather than re-implementing it — this is Mastra's own documented pattern for this exact gap, not a custom auth system. |
| Verifying the JWT locally (decode + check signature) | Bypasses Supabase's own session/ban-state checks; `MastraAuthSupabase` already does the officially-supported server-call verification internally. |
| Components importing `@supabase/supabase-js` directly | Rejected per feedback — couples every consumer to one provider's API shape and types. The `AuthService` interface absorbs that. |
| Subscription/session-sync logic inline in `AppBootstrap` | Rejected per feedback — mixes routing/gating concerns with session-management concerns in one component. Moved into `useAuth`. |
| Email/password or magic link | Not requested — OAuth (Google/GitHub) only. |
| Frontend-only auth gate (no server verification) | Leaves every Mastra API route exposed — same gap the Slack design already flagged as a blocker. |
| Building the sign-out button / real-avatar header polish now | Explicitly deferred — this pass is "make the connection and the flow work," not UI. Tracked as follow-up, not dropped. |

## Architecture

| Piece | Responsibility | Runs |
| --- | --- | --- |
| `src/lib/env.ts` | `getRequiredEnv(value, name)` — throws a clear error naming the missing var instead of a bare `undefined`-passed-downstream failure. Shared by both bundles. | Browser + Mastra server |
| `src/lib/supabase/browser-client.ts` | Singleton `createClient()` using `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, validated via `getRequiredEnv`. The **only** file that constructs a raw Supabase client in the browser. | Browser |
| `src/lib/auth/auth-service.ts` | `AuthService` interface + the provider-agnostic `AuthServiceSession`/`AuthServiceUser` shapes. No implementation, no Supabase import. | Browser (types only, no runtime) |
| `src/lib/auth/supabase-auth-service.ts` | Implements `AuthService` using `browser-client.ts`; the only file that translates Supabase's `Session`/`User` shape into the app's own shape. | Browser |
| `src/store/auth-store.ts` | Zustand store (standalone, like `thread-session-store.ts`) holding `{ session: AuthServiceSession \| null, status: AuthStatus }`. Knows nothing about Supabase. | Browser |
| `src/hooks/use-auth.ts` | Subscribes to `supabaseAuthService.onAuthStateChange` once, syncs into the store, and exposes `{ session, status, signInWithOAuth, signOut }` to components. This is the only place `AppBootstrap`/`SignInPage` touch auth. | Browser |
| `src/routes/AppBootstrap.tsx` (modified) | Reads `status` from `useAuth()`; gates `/sign-in` vs. the dashboard tree; shows a loading state until the initial check resolves. No subscription logic of its own. | Browser |
| `src/routes/SignInPage.tsx` (modified) | Calls `useAuth().signInWithOAuth('google' \| 'github')`. | Browser |
| `src/mastra/index.ts` (modified) | `server.auth: new MastraAuthSupabase({ url, anonKey, authorizeUser })` for verification; one `server.middleware` entry bridging `MASTRA_RESOURCE_ID_KEY` from the authenticated user, via `getAuthenticatedUser()`. | Mastra server |

### Why a middleware bridge instead of a constructor option

`registerCopilotKit`'s compiled output resolves its resource ID as
`requestContext.get(MASTRA_RESOURCE_ID_KEY) ?? resourceId` (verified by reading the
installed `@ag-ui/mastra` package directly — unchanged from the first draft's finding).
`MastraAuthSupabase` has no constructor hook to set that key itself, so a `server.middleware`
entry does it instead, using Mastra's own `getAuthenticatedUser()` helper
(`@mastra/server/auth`) so the token is validated through the same provider — no second,
divergent verification path:

```typescript
middleware: [
  {
    path: '/api/*',
    handler: async (c, next) => {
      const token = c.req.header('Authorization')?.replace('Bearer ', '');
      if (token) {
        const user = await getAuthenticatedUser<{ id: string }>({
          mastra: c.get('mastra'),
          token,
          request: c.req.raw,
        });
        if (user) {
          c.get('requestContext').set(MASTRA_RESOURCE_ID_KEY, user.id);
        }
      }
      return next();
    },
  },
],
```

`server.middleware` runs *before* Mastra's built-in per-route auth check
(`MastraAuthSupabase.authenticateToken` + `authorizeUser`), so an invalid/missing token
here just skips setting the resource ID and falls through to `next()` — the built-in
check downstream still rejects the request with 401. This means `getAuthenticatedUser()`
calls Supabase's `auth.getUser()` a second time on top of the built-in check's own call —
one extra network round trip per authenticated request. Accepted trade-off: it's the
documented pattern for this exact gap, and this app's traffic volume doesn't make that
cost meaningful.

`registerCopilotKit`'s `resourceId` option is a **required `string`**, not optional
(confirmed by reading `@ag-ui/mastra`'s `.d.ts` directly) — it cannot be dropped even
though it becomes inert once the middleware above sets the real value first. The existing
`COPILOTKIT_RESOURCE_ID` constant stays as that required-but-unused fallback.

## Files

### New

- `src/lib/env.ts`
- `src/lib/supabase/browser-client.ts`
- `src/lib/auth/auth-service.ts`
- `src/lib/auth/supabase-auth-service.ts`
- `src/store/auth-store.ts`
- `src/hooks/use-auth.ts`
- `src/services/get-auth-header.ts` — `getAuthHeader(): Record<string, string>`, reads `useAuthStore.getState().session?.accessToken`. Shared by `list-threads.ts`, `publish-to-slack.ts`, and the CopilotKit provider.

### Modified

- `src/mastra/index.ts` — `server.auth` (`MastraAuthSupabase`) + one `server.middleware` entry.
- `src/routes/AppBootstrap.tsx` — real gating via `useAuth()`.
- `src/routes/SignInPage.tsx` — real OAuth buttons via `useAuth()`.
- `src/providers/AppProviders.tsx` — `<CopilotKit headers={() => getAuthHeader()} ...>`.
- `src/services/list-threads.ts` — send the `Authorization` header via `getAuthHeader()`; drop the hardcoded `resourceId` **query param** (confirmed safe/optional by reading `@mastra/server`'s route schema directly — the built-in `/api/memory/threads` handler treats it as optional and the middleware-set resource ID takes over).
- `src/services/publish-to-slack.ts` — send the `Authorization` header via `getAuthHeader()`.
- `src/vite-env.d.ts` — add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `.env.example` — add the four Supabase variables (see Configuration).
- `package.json` — new dependencies: `@supabase/supabase-js`, `@mastra/auth-supabase`, `@mastra/server` (explicit — needed to import `@mastra/server/auth` directly; currently only pulled in transitively by the `mastra` CLI package, which pnpm won't let a project import from directly).

### Not changed from the first draft's plan

- `COPILOTKIT_RESOURCE_ID` in `src/constants/copilotkit.ts` **stays** — see the required-field note above. Corrects the first draft, which had planned to delete it.

## Configuration

```env
# client — Vite inlines VITE_-prefixed vars into the bundle. Publishable keys are
# public by design (Supabase's access boundary is Row Level Security, not key secrecy).
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# server — same project, read via process.env by the Mastra server process. Duplicated
# rather than derived from the VITE_ pair, same trade-off already accepted for
# VITE_MASTRA_SERVER_URL / VITE_COPILOTKIT_RUNTIME_URL.
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

No secret key is needed anywhere in this design — publishable-key-based verification via
`auth.getUser()` is exactly what `MastraAuthSupabase` does internally.

**Naming note:** `@mastra/auth-supabase`'s own constructor option is still literally
called `anonKey` in its current release — Supabase's rename hasn't propagated into that
package's API yet. Pass the publishable-key *value* into that `anonKey`-named field; the
two names refer to the same client-safe key.

**Manual, non-code prerequisite:** Google and GitHub OAuth providers must be enabled and
configured (client ID/secret, redirect URL) in the Supabase project dashboard before
sign-in works.

## Token refresh

Unchanged from the first draft: no custom logic. `supabase-js` defaults to
`autoRefreshToken: true`; `supabaseAuthService.onAuthStateChange` (wired through
`useAuth`) receives `TOKEN_REFRESHED` the same way it receives every other auth event, so
the store and `getAuthHeader()` always see the current token without any special-casing.

## Security

Unchanged from the first draft — CORS stays wide open (bearer-token auth isn't
CSRF-exposed the way cookie auth is); the publishable key is not a secret; RLS is out of
scope since nothing here reads Supabase tables beyond `auth.users`.

## Error handling

Unchanged from the first draft's table, with one addition: if `getAuthenticatedUser()`
in the middleware throws or the Supabase Auth server is unreachable, the middleware
catches nothing itself — an unhandled rejection there would 500 the request before the
built-in auth check even runs. This needs a `try { ... } catch { return next(); }` around
the `getAuthenticatedUser()` call so a transient verification hiccup falls through to the
normal (and already-correct) 401 path instead of a 500. Captured as an explicit
implementation step, not left implicit.

## Verification

`pnpm lint` and `pnpm build` must pass clean. No unit tests or Storybook stories — same
reasoning as the first draft.

Manual end-to-end (trimmed to this pass's scope — no header/sign-out UI to test yet):

1. Visit the app signed out — confirm redirect to `/sign-in`.
2. Click "Continue with Google" — confirm OAuth redirect, return to the dashboard signed in.
3. Repeat with GitHub.
4. Refresh the page — confirm the session survives.
5. Use the chat panel — confirm it still works, and that a `curl` to `/copilotkit` or `/api/memory/threads` without an `Authorization` header returns 401.
6. Sign in as a second (different) account (via `supabaseAuthService.signOut()` from the browser console, since there's no sign-out button yet) — confirm it sees an empty thread list, not the first account's (validates the middleware's resourceId bridging).

## Out of scope

- Email/password and magic-link sign-in.
- Any Supabase-stored application data or RLS policies beyond verifying a user's own token.
- Automatic retry-with-refresh on a 401.
- Role-based authorization beyond "authenticated or not."
- Narrowing CORS.
- **Sign-out button and real-user-avatar header polish** — deferred to a separate UI pass, per this revision's scope trim. `AuthService.signOut()` and `useAuth().signOut` still get implemented (they're plumbing, not UI); they're just not wired into a visible control yet.
