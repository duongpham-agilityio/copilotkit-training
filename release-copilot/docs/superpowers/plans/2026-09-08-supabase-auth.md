# Supabase Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get Supabase OAuth (Google/GitHub) sign-in working end to end — connection,
sign-in flow, and per-user CopilotKit thread scoping. No header/sign-out UI polish in
this pass; that is a separate, later UI-focused pass.

**Architecture:** A provider-agnostic `AuthService` interface (browser) backed by a
Supabase implementation, wrapped by a `useAuth` hook for React consumers and a Zustand
store for state. The Mastra server verifies JWTs with the official `MastraAuthSupabase`
provider and bridges per-user thread scoping via one `server.middleware` entry, since
that provider has no resource-ID-mapping hook of its own.

**Tech Stack:** `@supabase/supabase-js`, `@mastra/auth-supabase`, `@mastra/server`
(explicit dependency, for its `/auth` subpath), existing Zustand store pattern.

**Spec:** `docs/superpowers/specs/2026-09-08-supabase-auth-design.md` (revised — read the
"Revision note" section first; it documents what changed from the original draft and
why, including live-verified facts about `@mastra/auth-supabase`'s actual API and
Supabase's key-naming migration).

## Global Constraints

- TypeScript strict; no `any`; `import type` for type-only imports
  (`verbatimModuleSyntax`).
- `.ts`/`.tsx` extensions on relative imports **in the Vite-side code**
  (`src/lib`, `src/hooks`, `src/store`, `src/services`, `src/routes`, `src/providers`) —
  matches `src/main.tsx`/`AppBootstrap.tsx`/existing store files. Files under
  `src/mastra/` follow that directory's existing extension-less relative-import style
  (see `src/mastra/index.ts`'s current imports) — don't mix the two conventions.
- Fixed-value sets (status/mode) use `const enum`, not string-literal unions.
- Single quotes, semicolons, 2-space indent, trailing commas on multiline.
- Named exports except React components (default export).
- `pnpm lint` and `pnpm build` must both pass clean before any task is considered done.
- No unit tests, no Storybook stories for this feature — verification is lint + build +
  manual, per the spec and prior project precedent.
- Never commit `.env` or any Supabase key.
- Kebab-case file names throughout.
- **No UI work beyond what's needed to exercise the sign-in flow.** No sign-out button,
  no avatar/header changes — deferred to a separate pass per the spec's scope trim.

---

## Task 1: Dependencies, env validation helper, env vars, and the browser client

**Files:**
- Modify: `package.json` (new dependencies)
- Modify: `.env.example`
- Modify: `src/vite-env.d.ts`
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/browser-client.ts`

**Interfaces:**
- Produces: `getRequiredEnv(value: string | undefined, name: string): string`
  (`src/lib/env.ts`) — used by `browser-client.ts` in this task, and by
  `src/mastra/index.ts` in Task 7.
- Produces: `supabaseBrowserClient` (`SupabaseClient`, from
  `src/lib/supabase/browser-client.ts`) — Task 2's `supabase-auth-service.ts` is its only
  consumer.

- [ ] **Step 1: Install dependencies**

Run: `pnpm add @supabase/supabase-js @mastra/auth-supabase @mastra/server`

- [ ] **Step 2: Add the four env vars to `.env.example`**

Append to `.env.example`:

```env
# --- Supabase Auth (see docs/superpowers/specs/2026-09-08-supabase-auth-design.md) ---
# Client — Vite inlines VITE_-prefixed vars into the bundle. Publishable keys are public
# by design (Supabase's access boundary is Row Level Security, not key secrecy).
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# Server — same project, read via process.env by the Mastra server process. Duplicated
# rather than derived from the VITE_ pair above, same trade-off already accepted for
# VITE_MASTRA_SERVER_URL / VITE_COPILOTKIT_RUNTIME_URL.
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Then copy the same four keys into your local `.env` with real values from your Supabase
project (Project Settings → API — use the **Publishable key**, not the legacy `anon`
key, if your project shows both). Google and GitHub OAuth providers must also be enabled
under Authentication → Providers in the Supabase dashboard before Task 6 can be tested —
dashboard configuration, not covered by any step in this plan.

- [ ] **Step 3: Type the new client env vars**

Edit `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COPILOTKIT_RUNTIME_URL: string;
  readonly VITE_MASTRA_SERVER_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 4: Write the env validation helper**

Create `src/lib/env.ts`:

```typescript
export const getRequiredEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`${name} must be set — see .env.example.`);
  }
  return value;
};
```

- [ ] **Step 5: Write the browser client**

Create `src/lib/supabase/browser-client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { getRequiredEnv } from '@/lib/env.ts';

const SUPABASE_URL = getRequiredEnv(
  import.meta.env.VITE_SUPABASE_URL,
  'VITE_SUPABASE_URL',
);
const SUPABASE_PUBLISHABLE_KEY = getRequiredEnv(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  'VITE_SUPABASE_PUBLISHABLE_KEY',
);

export const supabaseBrowserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

- [ ] **Step 6: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 7: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 2: Provider-agnostic auth service

**Files:**
- Create: `src/lib/auth/auth-service.ts`
- Create: `src/lib/auth/supabase-auth-service.ts`

**Interfaces:**
- Consumes: `supabaseBrowserClient` (Task 1).
- Produces: `AuthService` interface, `AuthServiceUser`, `AuthServiceSession`,
  `OAuthProvider` (all from `auth-service.ts`); `supabaseAuthService: AuthService`
  (from `supabase-auth-service.ts`). Task 3's store and Task 4's hook both depend on
  `AuthServiceSession`; Task 4's hook is the only consumer of `supabaseAuthService`.

- [ ] **Step 1: Write the interface and shared types**

Create `src/lib/auth/auth-service.ts`:

```typescript
export type OAuthProvider = 'google' | 'github';

export interface AuthServiceUser {
  id: string;
  email: string | null;
}

export interface AuthServiceSession {
  accessToken: string;
  user: AuthServiceUser;
}

export type AuthStateListener = (session: AuthServiceSession | null) => void;

export interface AuthService {
  signInWithOAuth: (provider: OAuthProvider, redirectTo: string) => Promise<void>;
  signOut: () => Promise<void>;
  onAuthStateChange: (listener: AuthStateListener) => () => void;
}
```

- [ ] **Step 2: Write the Supabase implementation**

Create `src/lib/auth/supabase-auth-service.ts`:

```typescript
import type { Session } from '@supabase/supabase-js';
import { supabaseBrowserClient } from '@/lib/supabase/browser-client.ts';
import type { AuthService, AuthServiceSession } from '@/lib/auth/auth-service.ts';

const toAuthServiceSession = (session: Session | null): AuthServiceSession | null =>
  session
    ? {
        accessToken: session.access_token,
        user: { id: session.user.id, email: session.user.email ?? null },
      }
    : null;

export const supabaseAuthService: AuthService = {
  signInWithOAuth: async (provider, redirectTo) => {
    await supabaseBrowserClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
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

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean. Nothing imports `supabase-auth-service.ts` yet — that's Task 4.

- [ ] **Step 4: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 3: Auth store

**Files:**
- Create: `src/store/auth-store.ts`

**Interfaces:**
- Consumes: `AuthServiceSession` (Task 2's `auth-service.ts` — type only, no runtime
  dependency on Supabase).
- Produces: `useAuthStore` (Zustand hook), `AuthStatus` (`const enum`:
  `Loading`/`SignedIn`/`SignedOut`), state shape `{ session: AuthServiceSession | null;
  status: AuthStatus; setSession: (session: AuthServiceSession | null) => void }`. Task 4
  (`use-auth.ts`), Task 5 (`AppBootstrap`), and Task 8 (`get-auth-header.ts`) all depend
  on this shape.

- [ ] **Step 1: Write the store**

Create `src/store/auth-store.ts`:

```typescript
import { create } from 'zustand';
import type { AuthServiceSession } from '@/lib/auth/auth-service.ts';

export const enum AuthStatus {
  Loading = 'loading',
  SignedIn = 'signed-in',
  SignedOut = 'signed-out',
}

interface AuthStoreState {
  session: AuthServiceSession | null;
  status: AuthStatus;
  setSession: (session: AuthServiceSession | null) => void;
}

export const useAuthStore = create<AuthStoreState>()((set) => ({
  session: null,
  status: AuthStatus.Loading,
  setSession: (session) =>
    set({
      session,
      status: session ? AuthStatus.SignedIn : AuthStatus.SignedOut,
    }),
}));
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 4: `useAuth` hook

**Files:**
- Create: `src/hooks/use-auth.ts`

**Interfaces:**
- Consumes: `supabaseAuthService` (Task 2), `useAuthStore`, `AuthStatus` (Task 3),
  `ROUTE_DASHBOARD` (existing, `src/constants/routes.ts`).
- Produces: `useAuth()` returning `{ session: AuthServiceSession | null; status:
  AuthStatus; signInWithOAuth: (provider: OAuthProvider) => Promise<void>; signOut: () =>
  Promise<void> }`. Task 5 (`AppBootstrap`) and Task 6 (`SignInPage`) are the consumers.

- [ ] **Step 1: Write the hook**

Create `src/hooks/use-auth.ts`:

```typescript
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { supabaseAuthService } from '@/lib/auth/supabase-auth-service.ts';
import type { OAuthProvider } from '@/lib/auth/auth-service.ts';
import { useAuthStore } from '@/store/auth-store.ts';
import { ROUTE_DASHBOARD } from '@/constants/routes.ts';

export const useAuth = () => {
  const { session, status, setSession } = useAuthStore(
    useShallow((state) => ({
      session: state.session,
      status: state.status,
      setSession: state.setSession,
    })),
  );

  useEffect(() => {
    const unsubscribe = supabaseAuthService.onAuthStateChange(setSession);
    return unsubscribe;
  }, [setSession]);

  const signInWithOAuth = (provider: OAuthProvider) =>
    supabaseAuthService.signInWithOAuth(
      provider,
      `${window.location.origin}${ROUTE_DASHBOARD}`,
    );

  const signOut = () => supabaseAuthService.signOut();

  return { session, status, signInWithOAuth, signOut };
};
```

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass clean. Nothing imports this hook yet — that's Task 5.

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 5: Real auth gating in `AppBootstrap`

**Files:**
- Modify: `src/routes/AppBootstrap.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4), `AuthStatus` (Task 3), `ROUTE_SIGN_IN`,
  `ROUTE_DASHBOARD` (existing).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Replace the placeholder**

Edit `src/routes/AppBootstrap.tsx` (replace the whole file):

```typescript
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/hooks/use-auth.ts';
import { AuthStatus } from '@/store/auth-store.ts';
import { ROUTE_DASHBOARD, ROUTE_SIGN_IN } from '@/constants/routes.ts';

const AppBootstrap = () => {
  const location = useLocation();
  const { status } = useAuth();

  if (status === AuthStatus.Loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-body-md text-on-surface-variant">Loading…</span>
      </div>
    );
  }

  const isSignInRoute = location.pathname === ROUTE_SIGN_IN;

  if (status === AuthStatus.SignedOut && !isSignInRoute) {
    return <Navigate to={ROUTE_SIGN_IN} replace />;
  }

  if (status === AuthStatus.SignedIn && isSignInRoute) {
    return <Navigate to={ROUTE_DASHBOARD} replace />;
  }

  return <Outlet />;
};

export default AppBootstrap;
```

Note how thin this is compared to the first draft: no `useEffect`, no subscription
handling, no direct Supabase import — all of that now lives in `useAuth` (Task 4) and
`supabaseAuthService` (Task 2).

- [ ] **Step 2: Verify build**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 3: Manual check**

Run: `pnpm dev` (Vite only). Visit the app with no Supabase session (fresh browser
profile, or clear `localStorage` for the dev origin). Expected: briefly shows
"Loading…", then lands on `/sign-in` (still the placeholder text — Task 6 replaces it).
Manually navigate to `/` — expected: bounced back to `/sign-in`.

- [ ] **Step 4: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 6: OAuth sign-in buttons

**Files:**
- Modify: `src/routes/SignInPage.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4).
- Produces: nothing for later tasks.

- [ ] **Step 1: Replace the placeholder**

Edit `src/routes/SignInPage.tsx` (replace the whole file):

```typescript
import { useAuth } from '@/hooks/use-auth.ts';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';

const SignInPage = () => {
  const { signInWithOAuth } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-outline-variant p-6">
        <h1 className="text-headline-md">Sign in</h1>
        <div className="flex flex-col gap-3">
          <Button
            variant={ButtonVariant.Primary}
            onClick={() => void signInWithOAuth('google')}
          >
            Continue with Google
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            onClick={() => void signInWithOAuth('github')}
          >
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
```

- [ ] **Step 2: Verify build**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 3: Manual check**

Prerequisite: Google and/or GitHub OAuth provider enabled in the Supabase dashboard, per
Task 1 Step 2.

Run: `pnpm dev`. On `/sign-in`, click "Continue with Google". Expected: redirected to
Google's consent screen, then back to the app at `/`, signed in — Task 5's route guard
now lets you through. Repeat with GitHub if configured.

- [ ] **Step 4: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 7: Mastra server-side JWT verification with per-user thread scoping

**Files:**
- Modify: `src/mastra/index.ts`

**Interfaces:**
- Consumes: `getRequiredEnv` (Task 1).
- Produces: `server.auth` + `server.middleware` on the `Mastra` instance — from this task
  on, every route (including `/copilotkit` and `/api/memory/threads`) requires a valid
  `Authorization: Bearer <token>` header, and the CopilotKit resourceId is the
  authenticated user's `id`. Task 8 depends on this being in place to test end to end.

- [ ] **Step 1: Add the imports**

Edit `src/mastra/index.ts`, add alongside the existing imports:

```typescript
import { MastraAuthSupabase } from '@mastra/auth-supabase';
import { getAuthenticatedUser } from '@mastra/server/auth';
import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';
import { getRequiredEnv } from '../lib/env';
```

- [ ] **Step 2: Construct the auth provider**

Add above `export const mastra = new Mastra({`:

```typescript
const supabaseAuth = new MastraAuthSupabase({
  url: getRequiredEnv(process.env.SUPABASE_URL, 'SUPABASE_URL'),
  anonKey: getRequiredEnv(process.env.SUPABASE_PUBLISHABLE_KEY, 'SUPABASE_PUBLISHABLE_KEY'),
  // Any authenticated user may use this app — the default authorizeUser checks an
  // `isAdmin` column in a `users` table this project doesn't have.
  authorizeUser: () => true,
});
```

(The constructor field is still named `anonKey` in `@mastra/auth-supabase`'s current
release even though Supabase has renamed the concept to "publishable key" — same
client-safe key, passed under its old field name.)

- [ ] **Step 3: Wire `auth` and the resourceId-bridging `middleware` into `server`**

Edit the existing `server` block in the `Mastra` constructor:

```typescript
  server: {
    cors: MASTRA_CORS_CONFIG,
    auth: supabaseAuth,
    middleware: [
      {
        path: '/api/*',
        handler: async (c, next) => {
          const token = c.req.header('Authorization')?.replace('Bearer ', '');
          if (token) {
            try {
              const user = await getAuthenticatedUser<{ id: string }>({
                mastra: c.get('mastra'),
                token,
                request: c.req.raw,
              });
              if (user) {
                c.get('requestContext').set(MASTRA_RESOURCE_ID_KEY, user.id);
              }
            } catch {
              // Fall through to the built-in per-route auth check below, which
              // rejects with 401 on its own — a verification hiccup here must not
              // 500 the request instead of returning the normal 401.
            }
          }
          return next();
        },
      },
    ],
    apiRoutes: [
      registerCopilotKit({
        path: COPILOTKIT_ROUTE_PATH,
        resourceId: COPILOTKIT_RESOURCE_ID,
      }),
      slackPublishRoute,
    ],
  },
```

`resourceId: COPILOTKIT_RESOURCE_ID` stays unchanged — it's a required field on
`registerCopilotKit` and becomes an inert fallback once the middleware above sets the
real per-user value first on every authenticated request.

- [ ] **Step 4: Verify build**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 5: Manual check — unauthenticated request is rejected**

Run: `pnpm dev:mastra`, then in another terminal:

```bash
curl -i http://localhost:4111/api/memory/threads
```

Expected: `401` response, no thread data.

- [ ] **Step 6: Manual check — authenticated request succeeds**

With Task 6 already working, sign in via the browser, then open devtools → Application →
Local Storage → find the Supabase session entry (key like
`sb-<project-ref>-auth-token`) → copy the `access_token` value out of its JSON. Then:

```bash
curl -i http://localhost:4111/api/memory/threads \
  -H "Authorization: Bearer <paste-access-token-here>"
```

Expected: `200` with a threads list (likely empty on a fresh account), not `401`.

- [ ] **Step 7: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 8: Attach auth to every Mastra request from the browser

**Files:**
- Create: `src/services/get-auth-header.ts`
- Modify: `src/providers/AppProviders.tsx`
- Modify: `src/services/list-threads.ts`
- Modify: `src/services/publish-to-slack.ts`

**Interfaces:**
- Consumes: `useAuthStore` (Task 3), `getRequiredEnv` (Task 1).
- Produces: `getAuthHeader(): Record<string, string>` — used by every fetch/CopilotKit
  call site touched in this task.

- [ ] **Step 1: Write the header helper**

Create `src/services/get-auth-header.ts`:

```typescript
import { useAuthStore } from '@/store/auth-store.ts';

export const getAuthHeader = (): Record<string, string> => {
  const accessToken = useAuthStore.getState().session?.accessToken;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};
```

- [ ] **Step 2: Wire it into the CopilotKit provider**

Edit `src/providers/AppProviders.tsx`. Add the import:

```typescript
import { getAuthHeader } from '@/services/get-auth-header.ts';
```

Change the `<CopilotKit>` element:

```typescript
      <CopilotKit
        runtimeUrl={import.meta.env.VITE_COPILOTKIT_RUNTIME_URL}
        headers={() => getAuthHeader()}
      >
```

- [ ] **Step 3: Wire it into `publishToSlack`, and switch its env check to `getRequiredEnv`**

Edit `src/services/publish-to-slack.ts` (replace the whole file):

```typescript
import type { SlackPublishRequest } from '@/types/slack-publish-request.ts';
import { SLACK_PUBLISH_ROUTE_PATH } from '@/constants/slack.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/network.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';

interface PublishToSlackResult {
  ok: boolean;
  error?: string;
}

const TARGET = 'the Slack publish route';

export const publishToSlack = async ({
  platformId,
  label,
  content,
}: SlackPublishRequest): Promise<PublishToSlackResult> => {
  try {
    const baseUrl = getRequiredEnv(
      import.meta.env.VITE_MASTRA_SERVER_URL,
      'VITE_MASTRA_SERVER_URL',
    );

    const response = await fetch(`${baseUrl}${SLACK_PUBLISH_ROUTE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ platformId, label, content }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.ok) {
      return { ok: true };
    }

    let error = `Publish failed with status ${response.status}.`;
    const body: unknown = await response.json().catch(() => null);
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      error = body.error;
    }

    return { ok: false, error };
  } catch (error) {
    return { ok: false, error: toNetworkErrorMessage(error, TARGET) };
  }
};
```

`getRequiredEnv` now sits inside the `try` block (not before it, like the CopilotKit
wiring in Step 2 didn't need to worry about) — `publishToSlack`'s contract is "never
throws, always resolves to `PublishToSlackResult`," so a missing env var must still be
caught and converted to `{ ok: false, error }` via `toNetworkErrorMessage`, not escape as
an unhandled rejection. `toNetworkErrorMessage`'s fallback branch returns `error.message`
for a plain `Error`, which is exactly what `getRequiredEnv` throws — the caller-visible
message becomes `"VITE_MASTRA_SERVER_URL must be set — see .env.example."` instead of the
previous ad hoc string, a wording change but the same behavior contract.

- [ ] **Step 4: Wire it into `listThreads`, drop the hardcoded resourceId query param, and switch its env check to `getRequiredEnv`**

Edit `src/services/list-threads.ts` (replace the whole file):

```typescript
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/network.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';
import { ListThreadsResponseSchema, type ThreadSummary } from '@/types/thread.ts';

const TARGET = 'the threads list';

export const listThreads = async (): Promise<ThreadSummary[]> => {
  const baseUrl = getRequiredEnv(
    import.meta.env.VITE_MASTRA_SERVER_URL,
    'VITE_MASTRA_SERVER_URL',
  );

  const params = new URLSearchParams({ agentId: RELEASE_COPILOT_AGENT_ID });

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/memory/threads?${params.toString()}`, {
      headers: getAuthHeader(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(toNetworkErrorMessage(error, TARGET), { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Failed to list threads: ${response.status}`);
  }

  const parsed = ListThreadsResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      `The threads route returned an unexpected shape: ${parsed.error.message}`,
    );
  }

  return parsed.data.threads;
};
```

This drops the `resourceId: COPILOTKIT_RESOURCE_ID` **query param** only (the constant
itself stays — it's still required by `registerCopilotKit` in Task 7). Confirmed safe by
reading `@mastra/server`'s route schema directly
(`node_modules/.pnpm/@mastra+server@*/node_modules/@mastra/server/dist/memory-*.js`):
`resourceId is optional - when omitted, returns all threads` — combined with Task 7's
middleware setting the authenticated user's id on the request context, the server now
filters to that user's threads regardless of the query string.

`src/constants/copilotkit.ts` is **not modified** in this task — `COPILOTKIT_RESOURCE_ID`
is still referenced from `src/mastra/index.ts` (Task 7) and must stay.

- [ ] **Step 5: Verify build**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 6: Manual check — chat works signed in, and per-user scoping**

Run `pnpm dev:mastra` and `pnpm dev`. Sign in. Use the chat panel — send a message,
confirm the agent responds (exercises `/copilotkit` with the new
`headers={() => getAuthHeader()}`).

Then sign out (no UI button exists yet — clear the session directly): open devtools →
Console on the running app and run:

```javascript
Object.keys(localStorage)
  .filter((key) => key.startsWith('sb-'))
  .forEach((key) => localStorage.removeItem(key));
location.reload();
```

This removes Supabase's own `localStorage` session entry, which is exactly what
`supabaseAuthService.signOut()` (Task 2) does under the hood via
`supabase.auth.signOut()`. After reload, you should land back on `/sign-in` (Task 5's
guard). Sign in with a **different** account. Expected: the thread list comes back empty
for the new account, not the first account's history. This is the resourceId-scoping
check; a proper sign-out control is deferred to the follow-up UI pass.

- [ ] **Step 7: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Full end-to-end verification (after Task 8)

1. Visit signed out → redirected to `/sign-in`.
2. Sign in with Google → lands on dashboard.
3. Sign in with GitHub (if configured) → lands on dashboard.
4. Refresh the page → session survives, no bounce.
5. Chat panel works; unauthenticated `curl` to `/copilotkit` and `/api/memory/threads`
   both return `401`.
6. Second account (signed in after clearing the first session, per Task 8 Step 6) sees an
   empty/different thread list, not the first account's.
7. (Optional) Shorten the access token TTL temporarily in the Supabase dashboard, leave
   the tab open past expiry, confirm the chat keeps working without a manual reload —
   `autoRefreshToken` firing silently in the background.

## Deferred to the follow-up UI pass

- Sign-out button and real-user avatar in the app header.
- Any visual polish to `/sign-in` beyond the two functional buttons built in Task 6.
