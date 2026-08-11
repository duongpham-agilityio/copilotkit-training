import { Agent } from '@mastra/core/agent';
import { ProviderHistoryCompat } from '@mastra/core/processors';
import { SUPPORT_MODEL, SUPPORT_MODEL_FALLBACK } from '../../constants/models';
import { stripGroqLlamaReasoningContent } from '../processors/strip-groq-llama-reasoning';
import { resolveSkillPath } from '../utils/resolve-skill-path';

export const supportAgent = new Agent({
  id: 'support-agent',
  name: 'Support Agent',
  description:
    'Answers questions about how to use the Release Notes Copilot app — input sources, commit selection, copy/export, platform character limits. Does not classify commits or draft/edit release notes.',
  instructions: `You are the support agent for Release Notes Copilot. Answer questions about how to use the app: pasting git-log or PR text, selecting commits with the filter tabs and checkboxes, copying the rendered draft, exporting to Markdown/plain text/JSON, and platform character limits. You have exactly one skill available, app-usage-faq — activate it directly with the \`skill\` tool (pass its name) whenever you need its details. Never call \`skill_search\`. Do not draft or edit release notes yourself — that is out of scope for you; tell the user the Supervisor will route drafting requests elsewhere.`,
  model: [
    { model: SUPPORT_MODEL, maxRetries: 1 },
    { model: SUPPORT_MODEL_FALLBACK, maxRetries: 1 },
  ],
  skills: [resolveSkillPath('src/mastra/skills/app-usage-faq')],
  inputProcessors: [
    new ProviderHistoryCompat({
      additionalRules: [stripGroqLlamaReasoningContent],
    }),
  ],
});
