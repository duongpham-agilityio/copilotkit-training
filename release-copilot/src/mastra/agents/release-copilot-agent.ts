import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ProviderHistoryCompat } from '@mastra/core/processors';
import {
  RELEASE_COPILOT_FALLBACK_MODEL,
  RELEASE_COPILOT_MODEL,
} from '../../constants/models';
import { stripGroqLlamaReasoningContent } from '../processors/strip-groq-llama-reasoning';
import { RELEASE_COPILOT_INSTRUCTIONS } from '../instructions';
import { renderReleaseNotesPreviewTool } from '../tools/render-release-notes-preview-tool';
import { RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME } from '../../constants/tools';

// The classification and FAQ rules stay inlined into instructions (see
// ../instructions) rather than loaded as Mastra skills — activating a skill goes
// through Groq's tool calling, which failed about half the time in earlier testing
// (model emits a call, Groq's own validator rejects with 500 "Failed to call a
// function"; measured 3/6 with qwen3.6-27b, 1/6 with llama-3.3-70b, unchanged by
// `createSkill()` or disabling parallel tool calls). That failure was specific to
// skill activation though: a spike with a single plain `createTool()` (this render
// tool) against the same llama-3.3-70b-versatile model completed 13/13 calls
// correctly, with zero instances of that validator error — so this one tool is
// registered despite the earlier no-tools decision. Watch for the 500 error
// resurfacing if this stops being reliable.
export const releaseCopilotAgent = new Agent({
  id: 'release-copilot-agent',
  name: 'Release Copilot',
  description:
    'The chat agent behind Release Notes Copilot: classifies pasted git-log/PR text, drafts release notes for all 3 platforms, edits a draft in place, and answers questions about using the app.',
  instructions: RELEASE_COPILOT_INSTRUCTIONS,
  // Model list, not a single model: Groq intermittently 500s on this workload, and a
  // failed turn kills the whole chat response. The primary retries twice before the
  // fallback takes over for one last attempt.
  model: [
    {
      model: RELEASE_COPILOT_MODEL,
      maxRetries: 2,
    },
    {
      model: RELEASE_COPILOT_FALLBACK_MODEL,
      maxRetries: 1,
    },
  ],
  tools: {
    [RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME]: renderReleaseNotesPreviewTool,
  },
  inputProcessors: [
    new ProviderHistoryCompat({
      additionalRules: [stripGroqLlamaReasoningContent],
    }),
  ],
  // A rendered draft is a large message and only the most recent one is ever edited, so
  // recall stays capped rather than replaying several full drafts on every turn.
  memory: new Memory({ options: { lastMessages: 6 } }),
});
