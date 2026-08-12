import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ProviderHistoryCompat } from '@mastra/core/processors';
import { RELEASE_COPILOT_MODEL } from '../../constants/models';
import { stripGroqLlamaReasoningContent } from '../processors/strip-groq-llama-reasoning';
import { RELEASE_COPILOT_INSTRUCTIONS } from '../instructions';

// The classification, formatting and FAQ rules are inlined into instructions (see
// ../instructions) rather than loaded as Mastra skills. Activating a
// skill goes through Groq's tool calling, which fails about half the time for this
// agent — the model emits a call Groq's own validator then rejects with 500 "Failed
// to call a function". Measured 3/6 successful requests with qwen3.6-27b and 1/6 with
// llama-3.3-70b, unchanged by switching to `createSkill()` inline skills or disabling
// parallel tool calls. With no tools at all there is nothing to fail, and the whole
// rule set is under ~1.2k tokens.
export const releaseCopilotAgent = new Agent({
  id: 'release-copilot-agent',
  name: 'Release Copilot',
  description:
    'The chat agent behind Release Notes Copilot: classifies pasted git-log/PR text, drafts release notes for all 3 platforms, edits a draft in place, and answers questions about using the app.',
  instructions: RELEASE_COPILOT_INSTRUCTIONS,
  model: RELEASE_COPILOT_MODEL,
  inputProcessors: [
    new ProviderHistoryCompat({
      additionalRules: [stripGroqLlamaReasoningContent],
    }),
  ],
  // A rendered draft is a large message and only the most recent one is ever edited, so
  // recall stays capped rather than replaying several full drafts on every turn.
  memory: new Memory({ options: { lastMessages: 6 } }),
});
