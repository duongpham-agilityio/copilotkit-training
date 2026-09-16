# Flexible Platform Draft — Design

**Date:** 2026-09-15
**Status:** Approved, pending implementation

## Problem

`ReleaseNotesDraftSchema` (`src/types/release-notes-draft.ts`) hardcodes exactly three
output destinations as named top-level fields — `github` (Markdown, required), `appStore`
and `googlePlay` (plain text, each with a fixed character limit baked into the schema via
`.max()` and a `superRefine` cross-check against `PLATFORM_CHARACTER_LIMITS`) — plus a
`platforms: PlatformDraftSchema[]` array as a bolt-on escape hatch for anything else
(Slack, a customer email, a changelog). The agent's own instructions
(`src/mastra/skills/platform-formatting.ts`) already moved away from "always render
GitHub + App Store + Google Play together" toward a general create/edit/optimize/reformat
model driven by whatever the user actually asks for — the schema no longer matches the
behavior the agent is instructed to produce, and every new destination still has to be
special-cased in code (`to-platform-drafts.ts`, `lib-config.ts`'s `KnownPlatformId`
enum and `PLATFORM_CHARACTER_LIMITS` map) instead of being just another value.

## Solution

Replace the three named fields and the `platforms` array with a single platform slot on
the draft: `platform`, `label`, `content`. One `renderReleaseNotesPreview` tool call now
produces exactly one platform's content — GitHub included, no longer special-cased. A
multi-platform request becomes multiple sequential tool calls (one per platform), which
already matches how the agent's instructions describe drafting today (see
`platform-formatting.ts`'s create/edit/optimize/reformat framing).

`PlatformDraftSchema` keeps its name and keeps being an array element type used by
`ReleaseHistoryRecordSchema.platforms` — only its three fields change shape (`platformId`
→ `platform`, `body` → `content`, `characterLimit` dropped). `ReleaseNotesDraftSchema`
spreads `PlatformDraftSchema.shape` directly onto itself instead of nesting an array, so
a live draft is flat: release metadata + exactly one `{ platform, label, content }`.

Repo-side character-limit enforcement is removed from the schema entirely — no `.max()`,
no `superRefine`, no `PLATFORM_CHARACTER_LIMITS` lookup. The model is fully responsible
for respecting a platform's length constraint, per its own instructions (which already
state the App Store/Google Play limits in prose). This is a deliberate trust shift: with
an open-ended `platform` string, the repo cannot know ahead of time which platforms exist
to hold a limits table for them.

**Title line is always plain text, for every platform, including GitHub.** Today,
`release-title.ts` branches on GitHub vs. everything else purely for the title line:
`# Title` (Markdown H1) for GitHub, plain `Title` everywhere else. Checked against how
each real destination actually renders `#`: App Store/Google Play show it as a literal
character (no Markdown support at all), Slack's own mrkdwn has no heading syntax (same
literal-`#` result), and X/Twitter would parse a leading `#Title` as a hashtag — actively
wrong, not just inert. GitHub is the outlier that benefits from `#`, and only for this
one cosmetic line. Rather than re-add a `platform === 'github'` branch (which would need
a new case every time a future markdown-native destination is added — exactly the kind
of per-platform hardcoding this whole change removes), the title line drops the `#`
unconditionally for every platform. GitHub content can still use its own `##` section
headers inside `content` per its formatting rules; it only loses the large H1 above
them. The two composers collapse into one:

```ts
// src/lib/release-notes/release-title.ts
export const composeReleaseContent = (
  draft: ReleaseNotesDraft,
  now?: Date,
): string => `${buildReleaseTitle(draft, now)}\n\n${draft.content}`;
```

`composeGithubContent` and `composePlatformContent` are both deleted in favor of this
one function.

## Rejected alternatives

| Rejected | Reason |
| --- | --- |
| Keep `platforms: {platform, label, content}[]` as an array, one tool call renders every requested platform at once | Matches today's mechanics more closely, but the user explicitly wants one call = one platform, matching the agent's own per-request create/edit/optimize/reformat model rather than a bundle. |
| Keep `characterLimit` as an optional field, repo map overrides it when the platform is known | Considered as a middle ground (flexible platforms, still hardened against a fabricated "no limit" claim for the 4 platforms the repo already knows about). Rejected per explicit feedback — the direction is fully flexible, so the repo intentionally does not maintain a known-platform list to check against. |
| Rename `PlatformDraftSchema` or fold it away now that it is no longer an array in the live draft | Keeping the name and shape (as an array element) is what lets `ReleaseHistoryRecordSchema.platforms` keep compiling untouched — renaming it would force touching History today, which is explicitly out of scope (see below). |
| Redesign `ReleaseHistoryRecordSchema` / storage in the same pass (drop its own `github`/`appStore`/`googlePlay` columns too) | Explicitly deferred by the user — "focus on this first, History gets updated later." The two schemas are already decoupled enough (History's `github`/`appStore`/`googlePlay` fields don't reference `ReleaseNotesDraftSchema` at all) that this pass doesn't force a History change. |

## Schema

```ts
// src/types/release-notes-draft.ts
export const PlatformDraftSchema = z.object({
  platform: z
    .string()
    .min(1)
    .describe(
      'Kebab-case platform identifier chosen freely based on what the user ' +
      'asked for (github, app-store, google-play, slack, email-customer, ' +
      'changelog, ...). No fixed list — any destination the user names is valid.',
    ),
  label: z
    .string()
    .min(1)
    .describe('Display name shown to the user, e.g. "GitHub", "Customer Email".'),
  content: z
    .string()
    .min(1)
    .describe(
      'The rendered body for this one platform. Never write a title line — ' +
      "the app prepends it. No repo-enforced length limit — follow the target " +
      "platform's own constraints from your instructions.",
    ),
});
export type PlatformDraft = z.infer<typeof PlatformDraftSchema>;

export const ReleaseNotesDraftSchema = z.object({
  releaseDate: ...,   // unchanged
  titleOverride: ..., // unchanged
  version: ...,       // unchanged
  title: ...,         // unchanged
  ...PlatformDraftSchema.shape,
});
export type ReleaseNotesDraft = z.infer<typeof ReleaseNotesDraftSchema>;
```

Removed entirely: `github`, `appStore`, `googlePlay`, the `platforms` array field on
`ReleaseNotesDraftSchema`, `characterLimit` on `PlatformDraftSchema`, the `superRefine`
block, and the `PLATFORM_CHARACTER_LIMITS` map in `src/constants/config/lib-config.ts`
(nothing reads it once the schema stops enforcing limits). `APP_STORE_CHARACTER_LIMIT`
and `GOOGLE_PLAY_CHARACTER_LIMIT` stay — `platform-formatting.ts` still needs the actual
numbers to tell the model what to self-enforce, and `release-title.ts`'s
`RELEASE_TITLE_CHARACTER_BUDGET` arithmetic still applies per-platform when the model
is targeting one of those two.

## Data flow

```text
User: "draft this for Slack"
        │
        ▼
release-copilot-agent — classify (unchanged) + build one platform's content
        │  calls renderReleaseNotesPreview
        │  { releaseDate?, titleOverride?, version?, title?,
        │    platform: "slack", label: "Slack", content: "..." }
        ▼
useReleaseDraft — ReleaseNotesDraftSchema.safeParse (unchanged mechanism,
        │  new shape) → syncs into release-workspace-store
        ▼
useReleaseDraftView derives content = composeReleaseContent(draft)
        │  (title line + draft.content)
        ▼
Live Preview panel reads { draft, content } — content already has the title
```

A second platform (e.g. the user then asks "also for GitHub") is a second, independent
`renderReleaseNotesPreview` call with its own `platform`/`label`/`content` — not a second
entry appended to the first draft.

## Consequences — files touched in this pass

**Live Preview drops its platform-tab switcher.** Today's tab switcher exists only
because one draft held all three named platforms at once. With one platform per draft,
the Live Preview always shows the most recently rendered draft; there is no tab
control for the draft currently being built. Asking for a different platform means
asking the agent to render it, which replaces what Live Preview shows. A multi-platform
tab view remains a History-only concept (out of scope here, per History's own future
pass).

- `src/types/release-notes-draft.ts` — schema rewrite above.
- `src/constants/config/lib-config.ts` — remove `PLATFORM_CHARACTER_LIMITS`; keep the
  two per-platform character-limit constants.
- `src/mastra/tools/render-release-notes-preview-tool.ts` — `inputSchema` picks up the
  new shape automatically (already generic); no further change needed beyond what
  already landed in the prior instructions pass.
- `src/lib/release-notes/to-platform-drafts.ts` — deleted. Its only job was reshaping
  `github`/`appStore`/`googlePlay`/`platforms` into one list for the UI; with a single
  `{platform, label, content}` per draft there is nothing left to reshape.
- `src/lib/release-notes/platform-options.ts` — deleted. It only built a
  `PlatformOption[]` (GitHub via `composeGithubContent` + everything else via
  `toPlatformDrafts`) for the tab switcher; with a single platform per draft there is
  nothing left to build a list of.
- `src/types/platform-option.ts` (`PlatformOption`) — deleted. Its shape
  (`{platformId, label, content}`) is now just `PlatformDraft` (`{platform, label,
  content}`) with one field renamed — every former `PlatformOption` consumer switches
  to `PlatformDraft` instead of keeping two near-identical types.
- `src/store/draft-slice.ts` — drop `activePlatformId` (`KnownPlatformId.Github`
  default) and `setActivePlatform` entirely; `DraftThreadState` only needs `draft:
  ReleaseNotesDraft | null` and `savedVersion`.
- `src/hooks/use-release-draft-view.ts` — `ReleaseDraftView` drops `options`,
  `activePlatformId`, and `setActivePlatform` (nothing left to switch between). It keeps
  one derived convenience field, renamed from `activeContent` to `content`: the full
  text with the title line prepended (`composeReleaseContent(draft)` from
  `release-title.ts`, `null` when `draft` is `null`) — this is what every consumer
  (Live Preview, export, Slack) actually wants, matching what `PlatformOption.content`
  already was under the old `platform-options.ts` (title always included, never raw
  `draft.content` alone). `ReleaseDraftView` becomes `{ draft, content }`.
- `src/routes/DashboardPage.tsx` — `const { activeContent } = useReleaseDraft();`
  becomes `const { content } = useReleaseDraft();`; `LivePreviewPanel`'s `markdown` prop
  and `handleCopy` both switch from `activeContent` to `content`.
- `src/lib/release-notes/release-title.ts` — `composeGithubContent` +
  `composePlatformContent` collapse into `composeReleaseContent` (see Solution above).
- `src/hooks/use-release-draft.tsx` — no change expected; it parses/forwards the draft
  generically and never names `github`/`appStore`/`googlePlay` itself.
- `src/hooks/use-release-export.ts` — reads `{ draft, content }` from
  `useReleaseDraftView()` instead of `options`/`activePlatformId`; `canExport` is
  `Boolean(draft && content)`, and `exportDraft` builds the `PlatformDraft`-shaped
  argument `buildExportFile` needs as `{ platform: draft.platform, label: draft.label,
  content }` — `content` here is the title-included value from the view, not
  `draft.content`.
- `src/lib/export/build-export-file.ts` — its `platform: PlatformOption` parameter
  becomes `platform: PlatformDraft`; body unchanged (`platform.content`), only the JSON
  export's `platform: platform.platformId` becomes `platform: platform.platform`.
- `src/hooks/use-slack-publish.tsx` — `PublishFlow`'s platform picker
  (`useState<platformId>`, `KnownPlatformId.Github` default, `onPlatformChange`) is
  removed entirely: with one platform per draft there is nothing to choose between. It
  reads `{ draft, content }` from `useReleaseDraftView()` and sends
  `{ platformId: draft.platform, label: draft.label, content }` (the title-included
  `content`, matching today's Slack-post behavior) to `publishToSlack`.
  `props.args.platformId` (the model's optional hint on the `confirmSlackPublish` tool
  call) becomes unused here — the `confirmSlackPublish` tool/schema itself is untouched
  by this spec, its argument is just no longer read by this hook.
- `src/components/release-notes/SlackPublishCard.tsx` — drops `options`,
  `selectedPlatformId`, `onPlatformChange`, and the `PlatformTabs` it rendered; replaced
  by a static label line ("Announce this {label} release in Slack?"). `PublishOption`
  (its own `{platformId, label, content}` duplicate of `PlatformOption`) is deleted in
  favor of taking `label`/`content` as plain props.
- `src/types/platform.ts` (`KnownPlatformId`) and `PLATFORM_LABELS`-style maps — **not**
  removed in this pass. They stay alive because `ReleaseHistoryRecordSchema`'s own
  `github`/`appStore`/`googlePlay` fields, `HistoryPage.tsx`, `ReleaseDetailHeader.tsx`,
  and `use-release-history.ts` still use the fixed three-platform model — all explicitly
  deferred to History's own future pass (see Out of scope).
- `src/components/platform-selector/PlatformTabs.tsx` — the component itself is generic
  (`items`/`value`/`onChange`, no hardcoded platform list) and needs no change; its one
  current-draft caller (`SlackPublishCard.tsx`) goes away. `ReleaseDetailHeader.tsx`
  (History) keeps using it as-is.

## Out of scope (explicitly deferred)

`ReleaseHistoryRecordSchema`, `releases-repository.ts`, `save-release-history-request.ts`,
`save-release-history-route.ts`, and `use-release-history.ts` keep their current
`github` / `appStore` / `googlePlay` + `platforms: PlatformDraftSchema[]` shape as-is.
They keep compiling because `PlatformDraftSchema` keeps its name — only the array
element's internal fields change, which the History types don't destructure or
constrain further. History's own move to a fully flexible platform model is a separate,
future spec.

## Testing

- `pnpm lint` / `pnpm build` clean after the schema and file-deletion changes.
- Manual: ask the agent to draft for a named platform (e.g. Slack) and confirm the tool
  call carries `platform`/`label`/`content` and the Live Preview renders it.
- Manual: ask for a second platform in the same conversation and confirm it arrives as
  its own tool call/draft, not merged into the first, and that Live Preview now shows
  only that second platform — no leftover tab for the first one.
- Manual: confirm History save/list/detail still work unchanged (no regression from the
  `PlatformDraftSchema` field rename, since History always round-trips through the type,
  never hand-authors a `PlatformDraft` literal with the old field names).
