# Chat Sidebar Restyle — Design

Date: 2026-08-13
Status: Approved

## Context

[`ChatSidebar.tsx`](../../../src/components/chat/ChatSidebar.tsx) delegates its entire
UI to CopilotKit's stock `CopilotSidebar` (`@copilotkit/react-core/v2`), retheme'd only
via CSS variables in
[`copilotkit-theme.css`](../../../src/styles/copilotkit-theme.css). This was a
deliberate deferral documented in
[`00-overview-design.md`](2026-08-12-ui-component-library/00-overview-design.md#L54-L62)
of the earlier UI component library work.

Figma (`Release Notes Copilot`, file `uP92WqDNqngX9RP8Lh6opg`) defines a richer chat
experience:

- Desktop: `node 1:713`, "Right Panel (35%) - Copilot Assistant" (`1:714` is only its
  drop-shadow decoration, not content)
- Mobile: `node 1:3`, "Copilot Assistant - Active Chat (Mobile)" — a **full-screen**
  view, not a narrow sidebar. Uses a **stale orange palette**; per the same
  "Design Correction" note in `00-overview-design.md`, `theme.md`'s violet tokens
  override it wherever colors are specified.
- A third breakpoint exists (`node 1:410`, "Aside - Column 3: Copilot Assistant
  (Collapsible on Tablet)") with a distinct "AI INSIGHT" callout card — out of scope,
  see below.

The desktop frame's colors already match `theme.md`'s violet tokens almost exactly
(see mapping table below), confirming it as the more authoritative reference of the
two frames.

## Scope

**In scope** — restyle the message bubbles, quick-action pills, header, and input to
match the desktop Figma frame, applied uniformly at every breakpoint (CopilotKit
already switches sidebar↔full-width at 768px; no new responsive code is written here).

**Explicitly out of scope** (separate future specs):

- The "Diff / Preview" card (mobile frame, an inline before/after text comparison) —
  redundant with the existing `LivePreviewPanel` (`src/components/release-notes/`),
  which already renders the generated draft outside the chat panel.
- The dark raw-git-log block (desktop frame, shows input commits) — redundant with
  `CommitListPanel` (`src/components/commit-list/`), which already shows the same
  commit data.
- The mobile "Minimized Copilot Assistant Bar" (`node 1:439`) — a new persistent UI
  state/layout pattern, not a styling change.
- The tablet collapsible aside and its "AI INSIGHT" card (`node 1:410`) — a distinct
  feature (AI-generated insights), not part of chat styling.
- Wiring the header's "Clear" button to actually reset the conversation — dropped
  entirely per user decision; the header ships with no clear/reset control this pass.

**Deliberate deviation from the desktop Figma frame:** the desktop frame has no avatar
and no "Copilot"/"You" name label on its message bubbles — only the mobile frame does.
Since one shared bubble component covers both breakpoints, avatar + name label are
included on both (per explicit user decision), not dropped to match desktop exactly.

## Component design

### `AssistantMessageBubble` (`src/components/chat/AssistantMessageBubble.tsx`)

Replaces CopilotKit's `assistantMessage` slot
(`CopilotSidebarProps` → `CopilotChatViewProps["assistantMessage"]`). Per CopilotKit
v2's slot typing (`SlotValue<C> = C | string | Partial<ComponentProps<C>>`), passing a
component reference means CopilotKit renders it in place of its own
`CopilotChatAssistantMessage`, with the same props
(`message`, `messages`, `isRunning`, etc. — see `CopilotChatAssistantMessageProps`).

```ts
import type { CopilotChatAssistantMessageProps } from '@copilotkit/react-core/v2';
import { CopilotChatAssistantMessage } from '@copilotkit/react-core/v2';
import { Sparkles } from 'lucide-react';

const AssistantMessageBubble = (
  props: CopilotChatAssistantMessageProps,
) => JSX.Element;

export default AssistantMessageBubble;
```

Renders (top to bottom, per message):

1. A row: 32px rounded-square avatar (`bg-primary`, `Sparkles` icon in
   `text-on-primary`, `rounded-xl` ≈ Figma's 12px) + "Copilot" label
   (`text-label-sm`, `text-on-surface-variant`).
2. The bubble: `bg-surface-container-lowest`, `border border-outline-variant`,
   asymmetric corners — `rounded-tl-[2px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl`
   (exact Figma radii: 2px tail top-left, 16px = Tailwind's default `2xl` elsewhere).
   Message content renders via CopilotKit's own
   `CopilotChatAssistantMessage.MarkdownRenderer` sub-slot — this component does not
   reimplement markdown/streaming rendering, only wraps it.

### `UserMessageBubble` (`src/components/chat/UserMessageBubble.tsx`)

Replaces the `userMessage` slot, same slot mechanics as above.

```ts
import type { CopilotChatUserMessageProps } from '@copilotkit/react-core/v2';
import { CopilotChatUserMessage } from '@copilotkit/react-core/v2';

const UserMessageBubble = (props: CopilotChatUserMessageProps) => JSX.Element;

export default UserMessageBubble;
```

Renders: right-aligned column, "You" label (`text-label-sm`,
`text-on-surface-variant`), bubble with mirrored asymmetric corners
(`rounded-tr-[2px] rounded-tl-2xl rounded-bl-2xl rounded-br-2xl`), filled
`bg-primary-container`/`text-on-primary-container`. Message content via
`CopilotChatUserMessage.MessageRenderer` sub-slot (same reuse principle as above).

### Quick-action pills — no new component

Wired via `CopilotSidebar`'s existing `suggestions` prop in `ChatSidebar.tsx`
(three static entries: "Make it shorter", "Translate to VI", "Add emojis" — copied
from the Figma mock's pill labels, not dynamically generated). The default
`CopilotChatSuggestionPill` is restyled via a `Partial<ComponentProps>`-style
`className` override (see token mapping below) — no full component replacement
needed since the default pill's DOM shape already matches the design.

### Header — no new component

`CopilotSidebar`'s `header` slot receives a `Partial<CopilotModalHeaderProps>`
supplying `titleContent`: a small inline node (status dot + "Copilot Assistant"
text) replacing only the title area. `closeButton`/`drawerLauncher` stay at their
CopilotKit defaults so mobile drawer behavior is untouched. The status dot is
purely decorative (a static "online" indicator) — it does not reflect real
agent/connection state in this pass.

### Input — CSS-only

No new component. Additional rules in `copilotkit-theme.css` (or a scoped selector
under `[data-copilotkit]`) adjust the input's border-radius, border color, and the
send button's corner treatment to match the Figma frame. No new props/slots wired
in `ChatSidebar.tsx` for this piece.

### `ChatSidebar.tsx` changes

Add `header`, `assistantMessage`, `userMessage`, `suggestions`, and the pill
`suggestion` slot props to the existing `CopilotSidebar` call. No change to
`agentId`/`defaultOpen`.

## Token mapping (Figma desktop `1:713` → `theme.css`)

| Figma value                          | Token                            |
| ------------------------------------ | --------------------------------- |
| `#1c1b1d` (header title, body text)  | `--color-on-surface`              |
| `#ccc3d8` (borders)                  | `--color-outline-variant`         |
| `#ffffff` (header bg, AI bubble bg)  | `--color-surface-container-lowest`|
| `#7c3aed` (user bubble bg)           | `--color-primary-container`       |
| `#ede0ff` (user bubble text)         | `--color-on-primary-container`    |
| `#630ed4` (send button bg)           | `--color-primary`                 |
| `rgba(139,78,247,*)` = `#8b4ef7`     | `--color-secondary-container`     |
| `#712edd` (pill text)                | `--color-secondary`               |
| `#fcf8fb` (input bg)                 | `--color-surface`                 |
| `#10b981` (status dot)               | `--color-success-emerald`         |

No new hex values are introduced anywhere in this work.

## Data flow

No new state, hooks, or services. Both new components are purely presentational —
they receive the same `message` object CopilotKit already computes and passes into
the slot. `ChatSidebar.tsx` remains a thin composition point (agent id + slot wiring),
matching its current role.

## Testing / verification

Per this project's established pattern (no Vitest/RTL yet):

- `pnpm lint` and `pnpm build` (`tsc -b`) clean.
- One Storybook story each for `AssistantMessageBubble` and `UserMessageBubble` under
  `src/components/chat/stories/`, using representative fixture `message` objects
  (mirrors how `common/`/`layouts/` components were verified in the UI component
  library work).
- Manual check in the running app (`pnpm dev`): open the sidebar, confirm bubble
  shapes/colors/avatar match the desktop Figma frame, confirm pills render, confirm
  behavior is unchanged at <768px (full-width) and ≥768px (fixed-width panel).
