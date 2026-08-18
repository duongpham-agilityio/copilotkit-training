# Slack Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the copilot renders a release-notes draft in the web UI, it offers to announce the release in Slack, and posts only after the user clicks Send on an in-chat confirmation card.

**Architecture:** A frontend human-in-the-loop tool (`useHumanInTheLoop`) renders a confirmation card inline in the CopilotKit chat. Send calls a client service, which POSTs to a Mastra server route that holds the Slack Incoming Webhook URL. The webhook URL never enters browser code. Cancel resolves the tool without any request.

**Tech Stack:** `@copilotkit/react-core@1.66.4` (v2 entrypoint), `@mastra/core@1.57.0`, Zod v4, React 19, Tailwind v4, Storybook, TypeScript strict, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-18-slack-channel-design.md`

**No new dependencies.** An Incoming Webhook is one `POST` with a JSON body.

## Global Constraints

- TypeScript strict. Never weaken `tsconfig.app.json` to silence an error.
- No `any`. Use `unknown` plus narrowing, or a proper type.
- `import type` for type-only imports (`verbatimModuleSyntax`).
- Where a fixed set of values is needed as both a type and a runtime value, use `const enum`, not a string-literal union. `Platform` and `ButtonVariant` are the existing examples.
- Every Mastra resource must be registered in `src/mastra/index.ts`. Most-violated rule in this repo.
- Folders kebab-case. `.tsx` files that default-export a component: PascalCase matching the component. Everything else kebab-case.
- Components default-export; everything else named-export.
- Arrow functions only, `const` by default, single quotes, semicolons, 2-space indent, trailing commas on multiline.
- `pnpm lint` and `pnpm build` must both pass clean before any task is called done.
- Never commit `.env` or any file containing a webhook URL or token.

### Import style differs by side of the app — do not unify them

| Location | Style | Example |
| --- | --- | --- |
| `src/components/`, `src/hooks/`, `src/services/`, `src/routes/` (Vite client) | `@/` alias, explicit `.ts` / `.tsx` extension | `import { Platform } from '@/types/platform.ts';` |
| `src/mastra/**` (Mastra server bundler) | relative, **extensionless** | `import { Platform } from '../../types/platform';` |

Mastra's bundler does not resolve the `@/` alias — see the comment at the top of `src/types/release-notes-draft.ts`. Match the neighbouring files on each side.

### Verification model — read before Task 1

**This repo has no test framework.** `package.json` defines no `test` script; there is no vitest or jest config. The red-green TDD cycle cannot be run here. Every task below substitutes concrete, runnable verification: `pnpm lint`, `pnpm build`, Storybook for the presentational component, and `curl` for the server route. No step claims automated test coverage. Adding a test framework is out of scope.

---

### Task 1: Slack publish API route

The server side, built first because it is verifiable on its own with `curl` — before any UI exists.

**Files:**
- Create: `src/mastra/api/slack-publish-route.ts`
- Modify: `src/mastra/index.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: the existing `Platform` const enum from `src/types/platform.ts`.
- Produces:
  - `slackPublishRoute` — a `registerApiRoute` definition served at **`POST http://localhost:4111/slack/publish`** (custom Mastra api routes mount at the root, not under `/api` — this is why `VITE_COPILOTKIT_RUNTIME_URL` is `http://localhost:4111/copilotkit` with no `/api` segment).
  - Request body: `{ platform: 'github' | 'app-store' | 'google-play'; content: string }`.
  - Response: `{ ok: true }` on success; `{ ok: false, error: string }` with status 400, 500, or 502 on failure.

- [ ] **Step 1: Write the route**

Create `src/mastra/api/slack-publish-route.ts`:

```ts
import { registerApiRoute } from '@mastra/core/server';
import { z } from 'zod';
import { Platform } from '../../types/platform';

const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.Github]: 'GitHub',
  [Platform.AppStore]: 'App Store / TestFlight',
  [Platform.GooglePlay]: 'Google Play',
};

// Slack's message text limit is 40,000 characters. The cap here leaves room for the
// heading and the code fence added below, and rejects a runaway payload before it
// reaches Slack rather than after.
const MAX_CONTENT_LENGTH = 35_000;

const PublishRequestSchema = z.object({
  platform: z.enum([Platform.Github, Platform.AppStore, Platform.GooglePlay]),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
});

// The notes go inside a code block deliberately. Slack renders mrkdwn, not GitHub
// Markdown, so `## Features` would appear as literal text — and the point of the posted
// message is that someone copies it verbatim into GitHub or App Store Connect, which a
// code block keeps exact and one-click copyable.
const buildSlackText = (platform: Platform, content: string): string =>
  `*Release notes* · ${PLATFORM_LABELS[platform]}\n\`\`\`\n${content}\n\`\`\``;

export const slackPublishRoute = registerApiRoute('/slack/publish', {
  method: 'POST',
  handler: async (c) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return c.json(
        {
          ok: false,
          error:
            'Missing required env var: SLACK_WEBHOOK_URL. Set it in .env, then restart the Mastra server.',
        },
        500,
      );
    }

    const parsed = PublishRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json(
        { ok: false, error: `Invalid publish request: ${parsed.error.message}` },
        400,
      );
    }

    const { platform, content } = parsed.data;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: buildSlackText(platform, content) }),
      });

      if (!response.ok) {
        return c.json(
          {
            ok: false,
            error: `Slack rejected the message (${response.status}): ${await response.text()}`,
          },
          502,
        );
      }

      return c.json({ ok: true });
    } catch (error) {
      // Returned rather than thrown so the caller always receives the same shape. Never
      // retried here: a blind retry after an ambiguous failure can post the announcement
      // twice.
      return c.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  },
});
```

- [ ] **Step 2: Register the route**

In `src/mastra/index.ts`, add the import next to the existing ones:

```ts
import { slackPublishRoute } from './api/slack-publish-route';
```

Then add it to the existing `apiRoutes` array, leaving `registerCopilotKit` exactly as it is:

```ts
    apiRoutes: [
      registerCopilotKit({
        path: COPILOTKIT_ROUTE_PATH,
        resourceId: COPILOTKIT_RESOURCE_ID,
      }),
      slackPublishRoute,
    ],
```

- [ ] **Step 3: Document the environment variable**

Append to `.env.example`:

```bash
# --- Slack publishing (see docs/superpowers/specs/2026-08-18-slack-channel-design.md) ---
# Slack Incoming Webhook URL. Create at api.slack.com/apps: Create an app > From scratch
# > Incoming Webhooks > Activate > Add New Webhook to Workspace > choose the channel.
# The URL is bound to that one channel; a different channel means a different URL.
#
# MUST NOT be prefixed with VITE_. Vite inlines every VITE_-prefixed variable into the
# client bundle at build time, which would publish this secret to anyone who opens
# devtools. Nothing in the toolchain warns about this.
SLACK_WEBHOOK_URL=

# Base URL of the Mastra server, used by the browser to reach the publish route above.
# Must point at the same host as VITE_COPILOTKIT_RUNTIME_URL — that variable carries the
# same host with the /copilotkit suffix, and the duplication is accepted here in exchange
# for not string-munging one URL out of the other.
VITE_MASTRA_SERVER_URL=http://localhost:4111
```

- [ ] **Step 4: Verify lint and build**

```bash
pnpm lint && pnpm build
```

Expected: both exit 0.

If `z.enum([Platform.Github, ...])` errors, it is because `Platform` is a `const enum`. Fall back to `z.nativeEnum(Platform)`; if that also fails, use `z.enum(['github', 'app-store', 'google-play'])` with a comment that it must stay in sync with `src/types/platform.ts`. Do **not** weaken `tsconfig.app.json`.

- [ ] **Step 5: Verify the route is mounted**

Start the server in a separate terminal:

```bash
pnpm dev:mastra
```

Then:

```bash
curl -fsS "http://localhost:4111/api/system/api-schema" | jq -r '.routes[].path' | grep -i slack
```

Expected: `/slack/publish`. If nothing prints, the registration in Step 2 did not take — fix it before continuing.

- [ ] **Step 6: Verify the missing-env error path**

With `SLACK_WEBHOOK_URL` unset in `.env`:

```bash
curl -s -o /dev/stdout -w '\nHTTP %{http_code}\n' -X POST "http://localhost:4111/slack/publish" \
  -H 'Content-Type: application/json' \
  -d '{"platform":"github","content":"smoke"}'
```

Expected: HTTP 500 and a body naming `SLACK_WEBHOOK_URL`.

- [ ] **Step 7: Verify the validation error path**

```bash
curl -s -o /dev/stdout -w '\nHTTP %{http_code}\n' -X POST "http://localhost:4111/slack/publish" \
  -H 'Content-Type: application/json' \
  -d '{"platform":"myspace","content":"smoke"}'
```

Expected: HTTP 400 and an `Invalid publish request` message. Note this fires only once `SLACK_WEBHOOK_URL` is set — the env check runs first by design, so set it (Step 8) and re-run this afterwards.

- [ ] **Step 8: Verify a real post — requires a real webhook**

Create the Slack app and webhook per the comment written in Step 3, put the URL in `.env`, and restart the server. Then:

```bash
curl -s -o /dev/stdout -w '\nHTTP %{http_code}\n' -X POST "http://localhost:4111/slack/publish" \
  -H 'Content-Type: application/json' \
  -d '{"platform":"github","content":"## Features\n- smoke test, safe to delete"}'
```

Expected: HTTP 200, `{"ok":true}`, and the message visible in the Slack channel with the notes inside a code block. Delete the smoke-test message afterwards.

**If you are a subagent without Slack credentials, skip Steps 5–8 and report that you skipped them.** Do not fabricate results.

- [ ] **Step 9: Stage the work**

```bash
git add src/mastra/api/slack-publish-route.ts src/mastra/index.ts .env.example
```

Commit message to hand to the user:

```
feat: add Slack publish route to the Mastra server
```

---

### Task 2: The confirmation card component

Pure presentation, no agent and no network. Built second so it can be developed and reviewed in Storybook independently of the tool wiring.

**Files:**
- Create: `src/components/release-notes/SlackPublishCard.tsx`
- Create: `src/components/release-notes/stories/SlackPublishCard.stories.tsx`

**Interfaces:**
- Consumes: `Button` and `ButtonVariant` from `src/components/common/Button.tsx`; `Platform` from `src/types/platform.ts`; `cn` from `src/lib/cn.ts`.
- Produces:
  - `SlackPublishCard` (default export).
  - `SlackPublishStatus` — a `const enum` with members `Idle`, `Sending`, `Sent`, `Cancelled`, `Failed`.
  - Props: `{ preview: string; platform: Platform; status: SlackPublishStatus; error?: string | null; onPlatformChange: (platform: Platform) => void; onSend: () => void; onCancel: () => void }`.

- [ ] **Step 1: Write the component**

Create `src/components/release-notes/SlackPublishCard.tsx`:

```tsx
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import { cn } from '@/lib/cn.ts';
import { Platform } from '@/types/platform.ts';

export const enum SlackPublishStatus {
  Idle = 'idle',
  Sending = 'sending',
  Sent = 'sent',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

const PLATFORM_OPTIONS: ReadonlyArray<{ value: Platform; label: string }> = [
  { value: Platform.Github, label: 'GitHub' },
  { value: Platform.AppStore, label: 'App Store' },
  { value: Platform.GooglePlay, label: 'Google Play' },
];

interface SlackPublishCardProps {
  preview: string;
  platform: Platform;
  status: SlackPublishStatus;
  error?: string | null;
  onPlatformChange: (platform: Platform) => void;
  onSend: () => void;
  onCancel: () => void;
}

const SlackPublishCard = ({
  preview,
  platform,
  status,
  error = null,
  onPlatformChange,
  onSend,
  onCancel,
}: SlackPublishCardProps) => {
  // Terminal states replace the whole card: once a draft has been posted or declined,
  // there is nothing left to decide, and leaving the buttons on invites a double post.
  if (status === SlackPublishStatus.Sent) {
    return (
      <div className="border-outline-variant text-body-md text-on-surface-variant rounded-xl border px-4 py-3">
        Posted to Slack.
      </div>
    );
  }

  if (status === SlackPublishStatus.Cancelled) {
    return (
      <div className="border-outline-variant text-body-md text-on-surface-variant rounded-xl border px-4 py-3">
        Not posted.
      </div>
    );
  }

  const isSending = status === SlackPublishStatus.Sending;

  return (
    <div className="border-outline-variant bg-surface-container-lowest flex flex-col gap-3 rounded-xl border p-4">
      <span className="text-label-lg text-on-surface">
        Announce this release in Slack?
      </span>

      <div className="flex flex-wrap gap-2">
        {PLATFORM_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={isSending}
            onClick={() => onPlatformChange(value)}
            className={cn(
              'text-label-sm cursor-pointer rounded-lg border px-3 py-1.5 transition-colors disabled:pointer-events-none disabled:opacity-50',
              value === platform
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant text-on-surface-variant hover:bg-primary/5',
            )}
            aria-pressed={value === platform}
          >
            {label}
          </button>
        ))}
      </div>

      <pre className="bg-surface-container text-body-sm text-on-surface max-h-48 overflow-auto rounded-lg p-3 whitespace-pre-wrap">
        {preview}
      </pre>

      {error && (
        <span className="text-body-sm text-error" role="alert">
          {error}
        </span>
      )}

      <div className="flex gap-2">
        <Button onClick={onSend} disabled={isSending}>
          {isSending ? 'Sending…' : 'Send to Slack'}
        </Button>
        <Button
          variant={ButtonVariant.Ghost}
          onClick={onCancel}
          disabled={isSending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default SlackPublishCard;
```

- [ ] **Step 2: Check the theme tokens actually exist**

This component uses `text-error`, `bg-surface-container`, `bg-surface-container-lowest`, `text-label-lg`, `text-label-sm`, `text-body-sm`, `text-body-md`, `border-outline-variant`, `text-on-surface`, `text-on-surface-variant`, `border-primary`, `text-primary`.

```bash
grep -o "\-\-color-[a-z-]*\|\-\-text-[a-z-]*" src/styles/theme.css | sort -u
```

Any token above that is not defined must be replaced with one that is — do **not** invent tokens, and do not add new ones for this card. If `text-error` is missing, use the closest defined error/danger token, or fall back to `text-on-surface` and state the substitution in your report.

- [ ] **Step 3: Write the Storybook story**

Create `src/components/release-notes/stories/SlackPublishCard.stories.tsx`:

```tsx
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SlackPublishCard, {
  SlackPublishStatus,
} from '../SlackPublishCard.tsx';
import { Platform } from '@/types/platform.ts';

const meta: Meta<typeof SlackPublishCard> = {
  component: SlackPublishCard,
  title: 'release-notes/SlackPublishCard',
};

export default meta;

type Story = StoryObj<typeof SlackPublishCard>;

const SAMPLE_PREVIEW = `## Features

- ✨ Add JSON export for release drafts \`a1b2c3d\`

## Fixes

- 🐛 Correct App Store character count \`e4f5g6h\`
`;

const InteractiveCard = () => {
  const [platform, setPlatform] = useState<Platform>(Platform.Github);
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );

  return (
    <SlackPublishCard
      preview={SAMPLE_PREVIEW}
      platform={platform}
      status={status}
      onPlatformChange={setPlatform}
      onSend={() => setStatus(SlackPublishStatus.Sent)}
      onCancel={() => setStatus(SlackPublishStatus.Cancelled)}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveCard />,
};

export const Sending: Story = {
  args: {
    preview: SAMPLE_PREVIEW,
    platform: Platform.Github,
    status: SlackPublishStatus.Sending,
    onPlatformChange: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};

export const Failed: Story = {
  args: {
    preview: SAMPLE_PREVIEW,
    platform: Platform.GooglePlay,
    status: SlackPublishStatus.Failed,
    error: 'Slack rejected the message (404): no_service',
    onPlatformChange: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};

export const Posted: Story = {
  args: {
    preview: SAMPLE_PREVIEW,
    platform: Platform.Github,
    status: SlackPublishStatus.Sent,
    onPlatformChange: () => {},
    onSend: () => {},
    onCancel: () => {},
  },
};
```

- [ ] **Step 4: Verify lint and build**

```bash
pnpm lint && pnpm build
```

Expected: both exit 0.

- [ ] **Step 5: Verify the states render**

```bash
pnpm storybook
```

Open `release-notes/SlackPublishCard` and check each story: Default lets you switch platform and resolve to a terminal state; Sending disables all controls and shows "Sending…"; Failed shows the error text; Posted shows only the confirmation with no buttons.

- [ ] **Step 6: Stage the work**

```bash
git add src/components/release-notes/SlackPublishCard.tsx src/components/release-notes/stories/SlackPublishCard.stories.tsx
```

Commit message to hand to the user:

```
feat: add Slack publish confirmation card
```

---

### Task 3: Service, HITL tool, and wiring

Connects the card from Task 2 to the route from Task 1 through the human-in-the-loop tool.

**Files:**
- Create: `src/services/publish-to-slack.ts`
- Create: `src/hooks/use-confirm-slack-publish-tool.tsx`
- Modify: `src/types/release-notes-draft.ts`
- Modify: `src/routes/DashboardPage.tsx`

**Interfaces:**
- Consumes: `slackPublishRoute`'s contract from Task 1 (`POST {VITE_MASTRA_SERVER_URL}/slack/publish`, body `{ platform, content }`, response `{ ok, error? }`); `SlackPublishCard` and `SlackPublishStatus` from Task 2.
- Produces:
  - `publishToSlack({ platform, content }) => Promise<{ ok: boolean; error?: string }>`.
  - `useConfirmSlackPublishTool()` — registers the frontend tool named **`confirmSlackPublish`** on agent `RELEASE_COPILOT_AGENT_ID`, with `ReleaseNotesDraftSchema` as its parameters.
  - `DRAFT_FIELD_BY_PLATFORM` exported from `src/types/release-notes-draft.ts`.

**Naming note:** the tool name is the inline string `'confirmSlackPublish'`, not a constant. This matches `useShowEntryListTool`, which uses the inline literal `'showEntryList'` — frontend-only tools have no second reference site, so `.agents/rules/conventions.md` does not call for extraction. `RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME` is a constant only because the Mastra server registry also references it.

- [ ] **Step 1: Share the platform-to-draft-field mapping**

`DRAFT_FIELD_BY_PLATFORM` currently lives as a local const in `src/routes/DashboardPage.tsx` and is about to be needed in a second file. Move it rather than copying it.

Append to `src/types/release-notes-draft.ts`:

```ts
import { Platform } from './platform';

export const DRAFT_FIELD_BY_PLATFORM: Record<
  Platform,
  keyof ReleaseNotesDraft
> = {
  [Platform.Github]: 'github',
  [Platform.AppStore]: 'appStore',
  [Platform.GooglePlay]: 'googlePlay',
};
```

Note the extensionless `'./platform'` import — this file is bundled by Mastra's bundler as well as Vite, which is why the existing import in it is `'../lib/text'` and not `@/lib/text.ts`.

Then in `src/routes/DashboardPage.tsx`, delete the local `DRAFT_FIELD_BY_PLATFORM` declaration and import it instead:

```ts
import {
  DRAFT_FIELD_BY_PLATFORM,
  type ReleaseNotesDraft,
} from '@/types/release-notes-draft.ts';
```

The existing `import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';` line is replaced by the above — do not leave both.

- [ ] **Step 2: Write the service**

Create `src/services/publish-to-slack.ts`:

```ts
import type { Platform } from '@/types/platform.ts';

interface PublishToSlackArgs {
  platform: Platform;
  content: string;
}

interface PublishToSlackResult {
  ok: boolean;
  error?: string;
}

// The webhook URL itself lives on the server — see src/mastra/api/slack-publish-route.ts.
// This only reaches the Mastra server, never Slack directly, so nothing secret is bundled
// into the client.
export const publishToSlack = async ({
  platform,
  content,
}: PublishToSlackArgs): Promise<PublishToSlackResult> => {
  const baseUrl = import.meta.env.VITE_MASTRA_SERVER_URL;
  if (!baseUrl) {
    return {
      ok: false,
      error: 'VITE_MASTRA_SERVER_URL is not set — cannot reach the publish route.',
    };
  }

  try {
    const response = await fetch(`${baseUrl}/slack/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, content }),
    });
    const body: unknown = await response.json();

    if (response.ok) {
      return { ok: true };
    }

    const error =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `Publish failed with status ${response.status}.`;

    return { ok: false, error };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
```

If `import.meta.env.VITE_MASTRA_SERVER_URL` produces a type error, add it to the `ImportMetaEnv` interface in `src/vite-env.d.ts`, following whatever pattern that file already uses for `VITE_COPILOTKIT_RUNTIME_URL`. Read that file before assuming it needs changing.

- [ ] **Step 3: Write the human-in-the-loop hook**

Create `src/hooks/use-confirm-slack-publish-tool.tsx`:

```tsx
import { Fragment, useState } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { joinLines } from '@/lib/text.ts';
import { Platform } from '@/types/platform.ts';
import {
  DRAFT_FIELD_BY_PLATFORM,
  ReleaseNotesDraftSchema,
} from '@/types/release-notes-draft.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface PublishFlowProps {
  draft: ReleaseNotesDraft;
  respond: (result: unknown) => Promise<void>;
}

const PublishFlow = ({ draft, respond }: PublishFlowProps) => {
  const [platform, setPlatform] = useState<Platform>(Platform.Github);
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setStatus(SlackPublishStatus.Sending);
    setError(null);

    const result = await publishToSlack({
      platform,
      content: draft[DRAFT_FIELD_BY_PLATFORM[platform]],
    });

    if (result.ok) {
      setStatus(SlackPublishStatus.Sent);
      await respond(`Posted the ${platform} release notes to Slack.`);
      return;
    }

    // Deliberately does NOT respond: the tool call stays open so the user can fix the
    // problem and click Send again. Responding here would end the turn and force them to
    // ask the agent to start over.
    setStatus(SlackPublishStatus.Failed);
    setError(result.error ?? 'Publishing failed.');
  };

  const handleCancel = async () => {
    setStatus(SlackPublishStatus.Cancelled);
    await respond('User declined — nothing was posted to Slack.');
  };

  return (
    <SlackPublishCard
      preview={draft[DRAFT_FIELD_BY_PLATFORM[platform]]}
      platform={platform}
      status={status}
      error={error}
      onPlatformChange={setPlatform}
      onSend={() => void handleSend()}
      onCancel={() => void handleCancel()}
    />
  );
};

export const useConfirmSlackPublishTool = () => {
  useHumanInTheLoop({
    name: 'confirmSlackPublish',
    description: joinLines(
      'Ask the user whether to announce the finished release notes in the',
      'team Slack channel. Calling this posts nothing by itself — it shows a',
      'confirmation card and waits for the user to click Send or Cancel.',
      'Call it exactly once per draft or edit, immediately after the',
      'render-preview tool call, passing the same content for all 3',
      'platforms. Never call it before a draft exists, never call it twice',
      'for the same draft, and never claim anything was posted — the result',
      'this tool returns is the only source of truth for what happened.',
    ),
    parameters: ReleaseNotesDraftSchema,
    agentId: RELEASE_COPILOT_AGENT_ID,
    render: (props) => {
      if (props.status === 'inProgress') {
        return <Fragment />;
      }

      if (props.status === 'complete') {
        return (
          <span className="text-body-sm text-on-surface-variant">
            {props.result}
          </span>
        );
      }

      return <PublishFlow draft={props.args} respond={props.respond} />;
    },
  });
};
```

The `render` prop is a discriminated union on `status`: `respond` exists only in the `'executing'` branch, and `args` is `Partial<T>` in the `'inProgress'` branch. Returning early on `'inProgress'` is what narrows `args` to a complete `ReleaseNotesDraft` — the same shape `use-render-release-notes-preview-tool.tsx` already uses.

- [ ] **Step 4: Mount the hook**

In `src/routes/DashboardPage.tsx`, add the import:

```ts
import { useConfirmSlackPublishTool } from '@/hooks/use-confirm-slack-publish-tool.tsx';
```

and call it alongside the other CopilotKit tool hooks, directly after `useRenderReleaseNotesPreviewTool`:

```ts
  useConfirmSlackPublishTool();
```

- [ ] **Step 5: Verify lint and build**

```bash
pnpm lint && pnpm build
```

Expected: both exit 0. A likely failure is the `props.args` type in the `'executing'` branch — if TypeScript still sees it as `Partial<ReleaseNotesDraft>`, the `'inProgress'` early return is missing or the status comparison is misspelled.

- [ ] **Step 6: Stage the work**

```bash
git add src/services/publish-to-slack.ts src/hooks/use-confirm-slack-publish-tool.tsx src/types/release-notes-draft.ts src/routes/DashboardPage.tsx
```

Commit message to hand to the user:

```
feat: wire Slack publish confirmation into the copilot chat
```

---

### Task 4: Agent instructions

Nothing calls the new tool until the agent is told to. This is the task that makes the feature actually happen.

**Files:**
- Modify: `src/mastra/instructions/intro.ts`
- Modify: `src/mastra/instructions/app-usage-faq.ts`

**Interfaces:**
- Consumes: the tool name `confirmSlackPublish` and its `ReleaseNotesDraftSchema` parameters from Task 3.
- Produces: no code interface — behavioral change only.

- [ ] **Step 1: Read the file first**

Read `src/mastra/instructions/intro.ts` in full. It is a single exported template literal with five numbered conditions. You are adding to condition 2 and adding a new condition — not restructuring it. Backticks inside the template are escaped as `` \` ``; keep that.

Note the repo comment convention: `src/mastra/skills/*/SKILL.md` holds a verbatim copy of these instruction blocks. Check whether `src/mastra/skills/app-usage-faq/SKILL.md` mirrors `app-usage-faq.ts`; if it does, apply the same edit to both, since the header comment in `src/mastra/instructions/index.ts` says to edit them together.

- [ ] **Step 2: Extend condition 2**

In `intro.ts`, condition 2 currently ends with: `Never print rendered content as chat text (the tool call is the only way it reaches the UI); reply with a short confirmation instead.`

Append this sentence to that same paragraph:

```
Then, in the same turn, call the Slack confirm tool once with those same 3 platform variants — it asks the user whether to announce the release in Slack and posts nothing on its own. Call it only after the render-preview call has been made, never before and never instead.
```

- [ ] **Step 3: Add the explicit-publish condition**

Still in `intro.ts`, insert a new condition between the current 3 and 4, and renumber the following conditions so they stay sequential (the current 4 becomes 5, the current 5 becomes 6):

```
4. Message asks to publish, announce, share, or post the notes to Slack, and a draft already exists in the conversation -> call the Slack confirm tool with the current draft's 3 platform variants. Don't re-classify and don't re-render. If no draft exists yet, say so and offer to draft one first instead of calling the tool.
```

Renumbering matters: the surrounding text refers to conditions by number ("Always resolves before condition 2", "from condition 1 just now"). Re-read those references after renumbering and fix any that now point at the wrong condition.

- [ ] **Step 4: Document it in the FAQ**

Append a section to `src/mastra/instructions/app-usage-faq.ts`, inside the existing template literal:

```
## Publishing to Slack

After a draft renders, the copilot offers to announce it in the team Slack channel. A
confirmation card appears in the chat with a platform selector, a preview of exactly
what will be sent, and Send / Cancel. Nothing is posted unless Send is clicked, and
cancelling leaves the draft untouched. The card posts the variant for the platform
selected on the card itself, which is independent of the platform tab selected in the
preview panel. The Slack channel is fixed by configuration and cannot be chosen from
the chat.
```

- [ ] **Step 5: Verify lint and build**

```bash
pnpm lint && pnpm build
```

Expected: both exit 0. The usual failure here is an unescaped backtick inside a template literal.

- [ ] **Step 6: Stage the work**

```bash
git add src/mastra/instructions/intro.ts src/mastra/instructions/app-usage-faq.ts
```

Add `src/mastra/skills/app-usage-faq/SKILL.md` to that command if Step 1 found it mirrors the FAQ.

Commit message to hand to the user:

```
feat: instruct the copilot to offer Slack publishing after each draft
```

---

### Task 5: End-to-end verification — user only

Requires a real Slack webhook and a human clicking buttons. Not dispatchable to a subagent.

**Files:** none.

- [ ] **Step 1: Run both servers**

```bash
pnpm dev:mastra
```

```bash
pnpm dev
```

- [ ] **Step 2: Confirm the existing flow is unbroken**

Paste a git log and ask for a draft. The entry list and the Live Preview panel must behave exactly as before this work. If they do not, the regression is in Task 3's `DashboardPage.tsx` change.

- [ ] **Step 3: Confirm the card appears on its own**

After the draft renders, the confirmation card should appear in the chat without being asked for.

- [ ] **Step 4: Cancel**

Click Cancel. Nothing arrives in Slack, the card collapses to "Not posted.", and the agent acknowledges.

- [ ] **Step 5: Send**

Ask to publish again, keep GitHub selected, click Send. The message arrives in the Slack channel inside a code block, and the card collapses to "Posted to Slack."

- [ ] **Step 6: Send a different platform**

Repeat with Google Play selected. The shorter variant arrives — not the GitHub one. This is the check that the card's own platform selection is what gets sent.

- [ ] **Step 7: Error path**

Comment out `SLACK_WEBHOOK_URL`, restart the Mastra server, and try to send. The card shows the error, stays open, and the agent does not claim success.

- [ ] **Step 8: The model-reliability check**

Run the full draft flow three more times and record how many times the agent offered to publish without being asked. The spec flags this as the main risk: the agent went from two tools to three, and the only measurement on record for this model is 13/13 with a *single* tool.

Write the result down. If it misses often, the fallback is the "Send to Slack" button in the Live Preview panel, recorded as a rejected alternative in the spec — that is a design change to decide on, not a patch to improvise.

- [ ] **Step 9: Confirm no secrets are staged**

```bash
git status --short
grep -rn "hooks.slack.com" --include="*.ts" --include="*.tsx" src/ || echo "clean"
```

Expected: `.env` appears nowhere in git status, and no webhook URL is hardcoded anywhere in `src/`.

---

## Deferred, with reasons

- **Narrowing CORS and authenticating `/slack/publish`.** `src/constants/server.ts` sets `origin: '*'`. As written, any page that can reach the Mastra server can post to the team's Slack channel. Acceptable for local development, and a **blocker for deploying this anywhere shared** — recorded in the spec under "Prerequisite for deployment".
- **A test framework.** The repo has none. Adding one is a project-wide decision that should not ride along inside a feature branch.
- **Channel selection.** An Incoming Webhook is bound to one channel by construction. Supporting a choice would mean a bot token, `chat.postMessage`, and `conversations.list` — a different design for a requirement no one has stated.
- **Publish history.** Nothing records what was posted or when. Slack itself is the record.
