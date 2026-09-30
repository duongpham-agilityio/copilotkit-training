---
date: 2026-09-30
branch: v2-dev
commit:
files: [vercel.json, .gitignore]
severity: high
---

# Reloading a non-root route on Vercel returns 404

## Summary

On the Vercel deployment, reloading (or deep-linking) any route other than `/` —
`/history`, `/sign-in` — returned Vercel's 404 "not found" page instead of the app.
Client-side navigation worked, so the app only broke on refresh, back/forward to a
cold URL, and shared links (`buildHistoryPath`, `buildThreadPath`).

## Root Cause

The app is a pure client-side SPA using the History API router
(`createBrowserRouter` in [src/routes/router.ts:11](src/routes/router.ts#L11), with
paths `/`, `/history`, `/sign-in` declared in
[src/constants/routings.ts:1-3](src/constants/routings.ts#L1-L3)), but the repo had
no `vercel.json`, so no SPA fallback rewrite existed.

`vite build` emits exactly one HTML document, `dist/index.html`, plus `dist/assets/*`
— there is no `dist/history/index.html` or `dist/sign-in.html`. Vercel serves the
build output as static files: a request for `/history` finds nothing on the
filesystem and, with no rewrite rule configured, ends in Vercel's 404. The route
`/history` only ever existed inside the JS bundle, which never got a chance to boot.

Vercel's Vite framework preset does not add a catch-all rewrite on its own — that
rule has to be declared by the project.

## Explanation

Two different request kinds were being conflated:

- **In-app navigation** — `RouterProvider` calls `history.pushState`, the URL
  changes to `/history`, no HTTP request is made. Works.
- **Reload / deep link** — the browser issues a real `GET /history` to Vercel
  *before* any JS runs. The server must answer with the app shell. It answered 404.

It was not caught earlier because both local servers mask it: `vite` (dev) and
`vite preview` both include SPA history-fallback middleware, so `/history` returns
`index.html` locally. The gap only appears on a plain static host.

Reproduced against the real build output with a static server that has no fallback:

```
GET /        -> 200
GET /history -> 404
GET /sign-in -> 404
```

## Solution

Declare the SPA fallback that the platform lacks: a `vercel.json` rewrite sending
any unmatched path to `/index.html`, so the app shell boots and the router resolves
the path client-side. Chosen over `createHashRouter` (would change every URL to
`/#/history` and break existing shared links) and over pre-rendering each route
(needs SSG the app isn't set up for, and routes are auth-gated anyway).

## Solution Details

Added `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The catch-all is safe because Vercel evaluates the filesystem *before* `rewrites`:
`/assets/index-*.js` and `/favicon.svg` are served as real files and never rewritten.
Only paths with no matching output file fall through to the shell — which is exactly
the set of client-side routes.

This is a real fix, not a workaround: for a History-API SPA the "unmatched path
serves the app shell" rule is required server config, the same rule `vite dev` and
`vite preview` apply locally. No app code changed, so routing, query params
(`?thread=`, `?release=`) and the separately-hosted Mastra backend
(`VITE_MASTRA_SERVER_URL`, absolute origin — no `/api` path on Vercel to shadow) are
untouched.

Also added `.vercel` to `.gitignore` so the Vercel CLI's local project link is not
committed.

## Verification

Simulated Vercel routing (filesystem first, then the rewrite) over the real `dist/`
output:

```
/                                        200 text/html
/history                                 200 text/html
/sign-in                                 200 text/html
/?thread=abc                             200 text/html
/assets/abap-CLvhMVsD.js                 200 text/javascript
/favicon.svg                             200 image/svg+xml
```

Routes now serve the shell; hashed assets and `favicon.svg` still serve their real
files with correct content types.

- `pnpm lint` — clean, exit 0.
- `pnpm build` — `✓ built in 1.32s`, exit 0 (pre-existing >500 kB chunk-size warning
  only).
- `pnpm prettier --check vercel.json` — "All matched files use Prettier code style!"

## Prevention

- `vite preview` is not a proxy for production hosting — it has SPA fallback, Vercel
  does not. To sanity-check deploy behaviour locally, serve `dist/` with a
  fallback-less static server (`python3 -m http.server`) and request a non-root route,
  or run `vercel dev`, which honours `vercel.json`.
- Any new top-level route added to `src/constants/routings.ts` is covered by the
  catch-all — but if a path prefix is ever handed to a Vercel function or static
  directory, the rewrite must be narrowed first, since it currently claims every
  unmatched path.
- Treat "works in dev, 404 in prod" on a `createBrowserRouter` app as a hosting-rewrite
  question before looking at router code.
