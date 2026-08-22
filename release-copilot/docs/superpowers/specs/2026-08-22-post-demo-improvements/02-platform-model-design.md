# 02 — Platform model: hybrid schema + normalizer

Date: 2026-08-22
Estimate: 1h refactor + 0.3h smoke test = 1.3h · Branch: `refactor/platform-model`
Depends on: 01 (question 1 does not affect this task; the order is for sequencing only)
Part of: [Overview](./00-overview-design.md) · Source: §3 of the source design

## Goal

Let the agent produce release notes for platforms **beyond** GitHub / App Store /
Google Play **without losing** the `.describe()` and `.max()` constraints that
currently teach the model how to write for those three.

This is the foundation for tasks 03, 07, and 09. Getting it wrong means redoing all
three — which is why it leads day 1.

## Principle: "where it renders" and "what shape the schema is" are independent

App Store and Google Play move to card rendering inside the chat. That does **not**
force them out of the schema. See §3.1–3.2 of the source design for the full argument.

```
Left panel (Live Preview)  →  GitHub only, fixed format, PlatformTabs removed
Chat panel                 →  a card per other platform, from two merged sources
```

## Files

**Create**
- `src/lib/release-notes/to-platform-drafts.ts` — the normalizer

**Modify**
- `src/types/platform.ts` — `Platform` → `KnownPlatformId`, same three members
- `src/types/release-notes-draft.ts` — add `PlatformDraftSchema`, make `appStore` /
  `googlePlay` `.optional()`, add `platforms`, **delete** `DRAFT_FIELD_BY_PLATFORM`
- `src/constants/release-notes.ts` — add `PLATFORM_CHARACTER_LIMITS`
- `src/lib/release-notes/release-title.ts` — split `composeDraftContent` in two
- `src/types/slack-publish-request.ts` — `z.enum` → `platformId` + `label`
- `src/types/confirm-slack-publish.ts` — same
- `src/mastra/api/slack-publish-route.ts` — drop `PLATFORM_LABELS`, take the label
  from the request
- `src/components/platform-selector/PlatformTabs.tsx` — accept `TabItem[]` from the
  caller
- `src/components/release-notes/LivePreviewPanel.tsx` — drop `platform` /
  `onPlatformChange`
- `src/hooks/use-confirm-slack-publish-tool.tsx` — pick from `toPlatformDrafts(draft)`
- `src/routes/DashboardPage.tsx` — drop the `platform` state
- Stories: `PlatformTabs`, `LivePreviewPanel`, `SlackPublishCard`

## Design

### Hybrid schema

The three named fields keep their existing `.describe()` and `.max()` **word for
word**. The only change: `appStore` / `googlePlay` go from required to `.optional()`,
because they are now produced on request rather than always.

```ts
export const PlatformDraftSchema = z.object({
  platformId: z.string().min(1).describe(
    'Kebab-case identifier: slack, discord, email-customer, changelog, ' +
    'x-twitter... NEVER use this for github/app-store/google-play — those ' +
    'three have their own dedicated fields above.',
  ),
  label: z.string().min(1).describe(
    'Display name shown to the user: "Slack", "Customer Email".',
  ),
  body: z.string().min(1).describe(
    'The body for this platform. Never write a title line — the app prepends it.',
  ),
  characterLimit: z.number().int().positive().nullable().optional().describe(
    "This platform's character limit, if it has one. Omit when unlimited.",
  ),
});
```

Added to `ReleaseNotesDraftSchema`:

```ts
platforms: z.array(PlatformDraftSchema).default([])
  .describe(
    'Variants for platforms other than the three above. An empty array is normal.',
  )
  .superRefine((list, ctx) => {
    list.forEach((p, i) => {
      // Our table beats whatever the model claims — a fabricated limit cannot pass.
      const limit = PLATFORM_CHARACTER_LIMITS[p.platformId] ?? p.characterLimit;
      if (limit && p.body.length > limit - RELEASE_TITLE_CHARACTER_BUDGET) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'body'],
          message: `Exceeds the ${limit}-character limit for ${p.platformId}.`,
        });
      }
    });
  }),
```

**`PLATFORM_CHARACTER_LIMITS` is the load-bearing part, not a convenience lookup.**
Trusting the model's self-declared `characterLimit` would make the validation
meaningless — a model that invents "App Store allows 10000 characters" is granting
itself permission. The repo's numbers must win.

```ts
export const PLATFORM_CHARACTER_LIMITS: Record<string, number> = {
  'app-store': APP_STORE_CHARACTER_LIMIT,
  'google-play': GOOGLE_PLAY_CHARACTER_LIMIT,
  'x-twitter': 280,
  slack: 3000,
};
```

### Normalizer — where the two sources meet

```ts
export const toPlatformDrafts = (draft: ReleaseNotesDraft): PlatformDraft[] => {
  const named: PlatformDraft[] = [];
  if (draft.appStore) {
    named.push({ platformId: 'app-store', label: 'App Store',
                 body: draft.appStore, characterLimit: APP_STORE_CHARACTER_LIMIT });
  }
  if (draft.googlePlay) {
    named.push({ platformId: 'google-play', label: 'Google Play',
                 body: draft.googlePlay, characterLimit: GOOGLE_PLAY_CHARACTER_LIMIT });
  }
  const taken = new Set([...named.map((p) => p.platformId), 'github']);
  const extra = draft.platforms.filter((p) => !taken.has(p.platformId));
  return [...named, ...extra];
};
```

**Named fields win on a `platformId` collision.** If the model slips `app-store` into
the dynamic array, that entry is dropped rather than duplicating the card. Emit a
`console.warn` when an entry is filtered out — dev only, so the mistake is visible
and `platformId.describe()` can be tuned.

GitHub is **not** in this function's output: it takes its own path to the left panel.

### Splitting `composeDraftContent`

`composeDraftContent(draft, platform)` currently reads
`DRAFT_FIELD_BY_PLATFORM[platform]`. Once that table is gone, split it along the two
real paths:

```ts
export const composeGithubContent = (draft: ReleaseNotesDraft, now?: Date): string =>
  `# ${buildReleaseTitle(draft, now)}\n\n${draft.github}`;

export const composePlatformContent = (
  draft: ReleaseNotesDraft,
  platformDraft: PlatformDraft,
  now?: Date,
): string => `${buildReleaseTitle(draft, now)}\n\n${platformDraft.body}`;
```

No more `platform === Platform.Github ? ... : ...` branch — one function per shape,
no conditional.

### `PlatformTabs` changes role

Once Live Preview drops its tabs, this component loses its only consumer. Rather than
delete it, change the API to accept `TabItem[]` from the caller instead of the
hard-coded `PLATFORM_ITEMS`, so `SlackPublishCard` can reuse it with the dynamic list
from `toPlatformDrafts()`.

If it ends up with no consumer after all → delete it outright; do not keep dead code.

### Slack: `platform` → `platformId` + `label`

Both schemas move from `z.enum([...])` to `platformId: z.string()` +
`label: z.string()`. Required, because dynamic platforms must be publishable too.
`PLATFORM_LABELS: Record<Platform, string>` in the route is deleted — the label
travels with the request. The route still validates `content` against
`MAX_CONTENT_LENGTH` as before.

## Remaining trade-offs

Stated explicitly so a reviewer does not have to find them:

- The schema now has **two ways to express a platform**. Cost: one explicit sentence
  in `platformId.describe()` plus dedupe in the normalizer. Already paid.
- Loss of the exhaustive `Record<Platform, ...>` type. Type safety shifts from
  "compiler forces every enum branch" to "callers must handle an empty array." A real
  downgrade, accepted because the platform set is no longer closed.

What is **no longer** a trade-off (unlike the wholesale-replacement option rejected in
§3.1): `.max()` is preserved and now covers more than before; `.describe()` is kept
verbatim; App Store and Google Play output quality is unchanged.

## Model smoke test (0.3h, immediately after the refactor — not deferred to day 2)

Three real git logs, checking the agent fills the right place:

1. Plain `feat`/`fix` log → `github` only, `platforms` empty
2. "also make an App Store and Google Play version" → fills `appStore` /
   `googlePlay`, `platforms` still empty
3. "also make a Slack and customer-email version" → `platforms` has two entries with
   kebab-case `platformId`s

**Why it is not deferred:** tuning instructions is the one cost an AI agent cannot
compress. It has to surface on day 1.

## Acceptance criteria

- [ ] `.describe()` on `github` / `appStore` / `googlePlay` unchanged **word for word**
- [ ] `.max(APP_STORE_BODY_LIMIT)` / `.max(GOOGLE_PLAY_BODY_LIMIT)` still present
- [ ] `superRefine` rejects a body over the limit for a platform in
      `PLATFORM_CHARACTER_LIMITS`, even when the model declares a larger
      `characterLimit`
- [ ] `toPlatformDrafts` drops dynamic-array entries colliding with
      `app-store` / `google-play` / `github`, with a dev `console.warn`
- [ ] An empty `draft.platforms` breaks no consumer
- [ ] `DRAFT_FIELD_BY_PLATFORM` no longer exists; `Platform` is no longer the type of
      the main data flow
- [ ] Slack publishing still works with `platformId` + `label`
- [ ] All three smoke-test cases pass
- [ ] Lint + build + storybook clean

## Out of scope

- Rendering platform cards (task 07) — this task only produces the data
- Comparison grid (task 08)
- Export buttons (task 09)

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Model puts `app-store` in the `platforms` array | Medium | Normalizer dedupes, named field wins. `console.warn` surfaces it so `platformId.describe()` can be tuned |
| Model skips `platforms` and writes the content as chat text | Medium | Reuse the formula that already works in this repo: the tool description states outright that this is the only way content reaches the UI (see `render-release-notes-preview-tool.ts`). The smoke test catches it immediately |
| Blast radius larger than estimated (11 files + 3 stories) | Medium | Precisely why this is its own branch. If it overruns, stop at a clean build and push the `PlatformTabs` change into task 07 |
