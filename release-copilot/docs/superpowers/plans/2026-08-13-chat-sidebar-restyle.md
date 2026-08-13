# Chat Sidebar Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `ChatSidebar`'s message bubbles, quick-action pills, header, and
input to match the Figma "Copilot Assistant" desktop frame, using CopilotKit v2's
slot system rather than rebuilding chat UI from scratch.

**Architecture:** Two new purely-presentational components (`AssistantMessageBubble`,
`UserMessageBubble`) slot into `CopilotSidebar`'s `assistantMessage`/`userMessage`
props, replacing only the visual wrapper while reusing CopilotKit's own
`MarkdownRenderer`/`MessageRenderer` sub-slots for actual message content. Everything
else (pills, header, input) is restyled in place via CopilotKit's `Partial<ComponentProps>`-style
slot overrides — no additional components. All three breakpoints (desktop, tablet,
mobile) get this styling uniformly; CopilotKit's existing built-in `768px` breakpoint
continues to own the width/full-screen switch untouched.

**Tech Stack:** React 19, TypeScript strict, Tailwind v4 (theme tokens from
`src/styles/theme.css`), `@copilotkit/react-core/v2`, `lucide-react` (already a
dependency, used elsewhere in `AppHeader.tsx`).

Spec: `docs/superpowers/specs/2026-08-13-chat-sidebar-restyle-design.md`

## Global Constraints

- No hardcoded hex values or arbitrary Tailwind colors anywhere a `theme.css` token
  exists — see the spec's token mapping table. Non-color arbitrary values (exact
  pixel radii, shadows) are fine where Tailwind's default scale doesn't match Figma
  exactly — see per-task notes.
- No unit-test framework in this project. Verification per task is `pnpm lint` +
  `pnpm build` (`tsc -b`) clean, plus a Storybook story per new component under that
  component folder's `stories/` subfolder (`pnpm storybook`, port 6006) — same
  pattern as `docs/superpowers/plans/2026-08-12-ui-component-library.md`.
- Out of scope (do not implement): the diff-preview card, the raw-git-log block, the
  mobile minimized bar, the tablet collapsible aside, and wiring the header's "Clear"
  button to any reset behavior — see spec "Scope" section.
- Header title text stays the app's existing `"Release Copilot"` copy, not the Figma
  frame's literal `"Copilot Assistant"` — explicit user decision, see spec.
- Avatar + name label are included on both breakpoints (a deliberate deviation from
  the desktop Figma frame, which has neither) — explicit user decision, see spec.
- Arrow functions only, `const` by default, named exports except default-exported
  React components, single quotes, explicit `.tsx`/`.ts` extensions on relative
  imports (`.agents/rules/code-style.md`).
- Every task's final step is a commit. Conventional Commits per
  `.agents/rules/git-rules.md`: `feat:` for both component tasks (net-new capability);
  `feat:` for the wiring task too (it changes user-visible chat behavior/appearance).

---

### Task 1: `AssistantMessageBubble`

Spec: `docs/superpowers/specs/2026-08-13-chat-sidebar-restyle-design.md`
("AssistantMessageBubble" section)

**Files:**

- Create: `src/components/chat/AssistantMessageBubble.tsx`
- Create: `src/components/chat/stories/AssistantMessageBubble.stories.tsx`

**Interfaces:**

- Consumes: `CopilotChatAssistantMessageProps`, `CopilotChatAssistantMessage` (both
  from `@copilotkit/react-core/v2`); `Sparkles` from `lucide-react`.
- Produces: default-exported `AssistantMessageBubble` — consumed by `ChatSidebar`
  (Task 3) as the `assistantMessage` slot value.

- [ ] **Step 1: Write `src/components/chat/AssistantMessageBubble.tsx`**

```tsx
import type { CopilotChatAssistantMessageProps } from '@copilotkit/react-core/v2';
import { CopilotChatAssistantMessage } from '@copilotkit/react-core/v2';
import { Sparkles } from 'lucide-react';

const AssistantMessageBubble = ({ message }: CopilotChatAssistantMessageProps) => (
  <div className="flex w-full max-w-[420px] flex-col items-start gap-1">
    <div className="flex items-center gap-2 pl-1">
      <span className="bg-primary text-on-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
        <Sparkles className="size-4" />
      </span>
      <span className="text-label-sm text-on-surface-variant">Copilot</span>
    </div>
    <div className="bg-surface-container-lowest border-outline-variant text-on-surface text-body-md rounded-tl-[2px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border p-[17px]">
      <CopilotChatAssistantMessage.MarkdownRenderer content={message.content ?? ''} />
    </div>
  </div>
);

export default AssistantMessageBubble;
```

Note: `message.content` is `string | undefined` per the `AssistantMessage` type
(`@ag-ui/core`) — `?? ''` guards `MarkdownRenderer`'s required `content: string` prop.
Corner radii use exact Figma pixel values (`rounded-tl-[2px]`) rather than a rounded
Tailwind scale step, since 2px falls between Tailwind's default steps; `2xl` (16px)
is an exact match for the other three corners so it's used as a plain utility.

- [ ] **Step 2: Write `src/components/chat/stories/AssistantMessageBubble.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AssistantMessage } from '@ag-ui/core';
import AssistantMessageBubble from '../AssistantMessageBubble.tsx';

const sampleMessage: AssistantMessage = {
  id: 'assistant-1',
  role: 'assistant',
  content:
    "I've analyzed the recent commits. There are 2 major features and 1 critical fix. Would you like me to draft the release notes for TestFlight?",
};

const meta: Meta<typeof AssistantMessageBubble> = {
  component: AssistantMessageBubble,
  title: 'chat/AssistantMessageBubble',
};

export default meta;

type Story = StoryObj<typeof AssistantMessageBubble>;

export const Default: Story = {
  args: { message: sampleMessage },
};
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Run: `pnpm storybook`, open `http://localhost:6006`, select `chat/AssistantMessageBubble`.
Expected: 32px violet rounded-square avatar with a white sparkle icon, "Copilot" label
above a white bubble with a 2px top-left corner and 16px corners elsewhere, bordered
in light violet-gray (`outline-variant`), markdown text rendered inside.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/AssistantMessageBubble.tsx src/components/chat/stories/AssistantMessageBubble.stories.tsx
git commit -m "feat: add AssistantMessageBubble chat component"
```

---

### Task 2: `UserMessageBubble`

Spec: `docs/superpowers/specs/2026-08-13-chat-sidebar-restyle-design.md`
("UserMessageBubble" section)

**Files:**

- Create: `src/components/chat/UserMessageBubble.tsx`
- Create: `src/components/chat/stories/UserMessageBubble.stories.tsx`

**Interfaces:**

- Consumes: `CopilotChatUserMessageProps`, `CopilotChatUserMessage` (both from
  `@copilotkit/react-core/v2`).
- Produces: default-exported `UserMessageBubble` — consumed by `ChatSidebar`
  (Task 3) as the `userMessage` slot value.

- [ ] **Step 1: Write `src/components/chat/UserMessageBubble.tsx`**

```tsx
import type { CopilotChatUserMessageProps } from '@copilotkit/react-core/v2';
import { CopilotChatUserMessage } from '@copilotkit/react-core/v2';

const UserMessageBubble = ({ message }: CopilotChatUserMessageProps) => {
  const content = typeof message.content === 'string' ? message.content : '';

  return (
    <div className="flex w-full flex-col items-end gap-1">
      <span className="text-label-sm text-on-surface-variant pr-1">You</span>
      <div className="bg-primary-container text-on-primary-container text-body-md max-w-[380px] rounded-tr-[2px] rounded-tl-2xl rounded-bl-2xl rounded-br-2xl p-[17px]">
        <CopilotChatUserMessage.MessageRenderer content={content} />
      </div>
    </div>
  );
};

export default UserMessageBubble;
```

Note: `UserMessage.content` (`@ag-ui/core`) is `string | ContentPart[]` — this app
only sends plain-text chat input, so non-string content (multimodal parts) renders as
an empty bubble rather than being handled; that matches the app's actual capabilities
(no attachment/audio UI wired up) rather than being a real gap.

- [ ] **Step 2: Write `src/components/chat/stories/UserMessageBubble.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { UserMessage } from '@ag-ui/core';
import UserMessageBubble from '../UserMessageBubble.tsx';

const sampleMessage: UserMessage = {
  id: 'user-1',
  role: 'user',
  content:
    'Yes, but group the biometric auth changes together and make it sound user-friendly, not too technical.',
};

const meta: Meta<typeof UserMessageBubble> = {
  component: UserMessageBubble,
  title: 'chat/UserMessageBubble',
};

export default meta;

type Story = StoryObj<typeof UserMessageBubble>;

export const Default: Story = {
  args: { message: sampleMessage },
};
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build`
Expected: both clean.

Run: `pnpm storybook`, open `http://localhost:6006`, select `chat/UserMessageBubble`.
Expected: right-aligned "You" label above a violet (`primary-container`) bubble with
light text (`on-primary-container`), mirrored corners (2px top-right, 16px elsewhere).

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/UserMessageBubble.tsx src/components/chat/stories/UserMessageBubble.stories.tsx
git commit -m "feat: add UserMessageBubble chat component"
```

---

### Task 3: Wire `ChatSidebar`

Spec: `docs/superpowers/specs/2026-08-13-chat-sidebar-restyle-design.md`
("Header", "Quick-action pills", "Input", "`ChatSidebar.tsx` changes" sections)

**Files:**

- Modify: `src/components/chat/ChatSidebar.tsx`

**Interfaces:**

- Consumes: `AssistantMessageBubble` (Task 1), `UserMessageBubble` (Task 2),
  `CopilotSidebar`/`useConfigureSuggestions` (from `@copilotkit/react-core/v2`),
  `RELEASE_COPILOT_AGENT_ID` (`@/constants/agents`, unchanged).
- Produces: nothing new consumed elsewhere — `ChatSidebar` remains the app's single
  mount point for chat (`src/main.tsx`), unchanged at that call site.

**API verification notes** (confirmed directly against
`node_modules/@copilotkit/react-core/dist/copilotkit-D0aAnD3i.d.mts` — do not trust
older/cached knowledge of this API per `AGENTS.md`):

- `suggestions` is **not** a prop on `CopilotSidebarProps` (it's explicitly `Omit`-ted
  when `CopilotChatProps` is derived from `CopilotChatViewProps`). Quick-action pills
  must be registered via the `useConfigureSuggestions(config, deps)` hook instead,
  called from within `ChatSidebar` (already inside the `<CopilotKit>` provider tree
  via `AppProviders`/`main.tsx`).
- `header`, `assistantMessage`, `userMessage`, and `input` **are** valid
  `CopilotSidebarProps` slot props. Each accepts either a full replacement component
  or a `Partial<ComponentProps<DefaultComponent>>` object that CopilotKit merges onto
  its own default — the object form (not a new component) is used for `header`'s
  `titleContent`, the pill's `suggestionView.suggestion`, and `input`'s `textArea`/
  `sendButton`, since those only need a style tweak, not new markup.

- [ ] **Step 1: Rewrite `src/components/chat/ChatSidebar.tsx`**

```tsx
import { CopilotSidebar, useConfigureSuggestions } from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
import UserMessageBubble from './UserMessageBubble.tsx';

const QUICK_ACTION_SUGGESTIONS = [
  { title: 'Make it shorter', message: 'Make it shorter' },
  { title: 'Translate to VI', message: 'Translate to VI' },
  { title: 'Add emojis', message: 'Add emojis' },
];

const ChatSidebar = () => {
  useConfigureSuggestions(
    {
      agentId: RELEASE_COPILOT_AGENT_ID,
      suggestions: QUICK_ACTION_SUGGESTIONS,
    },
    [],
  );

  return (
    <CopilotSidebar
      agentId={RELEASE_COPILOT_AGENT_ID}
      defaultOpen
      labels={{
        modalHeaderTitle: 'Release Copilot',
      }}
      header={{
        titleContent: {
          children: (
            <span className="flex items-center gap-2">
              <span
                className="bg-success-emerald size-3 shrink-0 rounded-full"
                aria-hidden="true"
              />
              <span className="text-headline-md text-on-surface">Release Copilot</span>
            </span>
          ),
        },
      }}
      assistantMessage={AssistantMessageBubble}
      userMessage={UserMessageBubble}
      suggestionView={{
        suggestion: {
          className:
            'bg-secondary-container/20 border-secondary-container/50 text-secondary rounded-xl border px-[13px] py-[7px] text-label-sm',
        },
      }}
      input={{
        className:
          'bg-surface border-outline-variant rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]',
        textArea: {
          className: 'placeholder:text-on-surface-variant/50 text-body-md',
        },
        sendButton: {
          className: 'bg-primary text-on-primary rounded',
        },
      }}
    />
  );
};

export default ChatSidebar;
```

The `agentId: '*'` default on `useConfigureSuggestions`'s config is overridden with
`RELEASE_COPILOT_AGENT_ID` so these three pills are scoped to this app's one agent
(harmless either way today since there's only one agent, but correct if a second
agent is ever registered). `deps: []` is passed explicitly because the inline config
object is a new reference on every render — without `deps`, effect re-registration
behavior would depend on the hook's internal comparison, which isn't documented;
`[]` guarantees "register once," matching the fact these three suggestions never
change.

- [ ] **Step 2: Verify — lint and build**

Run: `pnpm lint && pnpm build`
Expected: both clean. If `header`, `assistantMessage`, `userMessage`, `suggestionView`,
or `input` report a TypeScript error ("Property does not exist" or a slot-shape
mismatch), the installed `@copilotkit/react-core` version's slot API has changed since
this plan was written — re-inspect
`node_modules/@copilotkit/react-core/dist/copilotkit-D0aAnD3i.d.mts` for the current
shape of `CopilotSidebarProps`/`CopilotModalHeaderProps`/`CopilotChatSuggestionViewProps`/
`CopilotChatInputProps` before adjusting the code above.

- [ ] **Step 3: Verify — visual check in the running app**

Run: `pnpm dev`, open `http://localhost:5173`.

Expected, at viewport width ≥768px (fixed-width sidebar panel):

- Header shows a green status dot + "Release Copilot" title, no visible change to
  close/drawer button behavior.
- Sending a message renders the new violet-container user bubble (right-aligned,
  mirrored corner) and, once the agent responds, the new avatar+label assistant
  bubble (left-aligned).
- Three quick-action pills ("Make it shorter", "Translate to VI", "Add emojis")
  appear above the input, tinted light violet.
- Input field has an 8px-rounded border and a violet square send button.

Resize the browser to <768px width (or use devtools device emulation) and confirm the
sidebar still becomes full-width per CopilotKit's existing built-in breakpoint, with
the same restyled bubbles/pills/input rendering correctly at that width — no new
responsive code was added, so this step is only confirming nothing broke, not testing
new behavior.

If the `header` titleContent override doesn't visually replace the default title text
(i.e., both the dot+text and the plain default title render, or the override has no
effect), fall back to passing a fully custom function component as `header` instead
of the nested `titleContent` partial-props object — same fallback for `suggestionView.suggestion`
or `input.textArea`/`sendButton` if their `className` overrides don't take visible
effect over CopilotKit's own default classes.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/ChatSidebar.tsx
git commit -m "feat: restyle chat sidebar header, pills, and input to match design"
```
