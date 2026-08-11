import { Agent } from '@mastra/core/agent';
import { ProviderHistoryCompat } from '@mastra/core/processors';
import { ANALYZE_INPUT_MODEL } from '../../constants/models';
import { stripGroqLlamaReasoningContent } from '../processors/strip-groq-llama-reasoning';
import { resolveSkillPath } from '../utils/resolve-skill-path';

export const analyzeInputAgent = new Agent({
  id: 'analyze-input-agent',
  name: 'Analyze/Clean Input Agent',
  description:
    'Parses raw git-log output or a PR title/description and classifies each entry as Feature, Fix, Breaking change, or excluded. Returns a structured, badged commit list. Does not draft or format release notes.',
  instructions: `You receive raw git-log output or a PR title (optionally with a description). Parse it into individual commit/PR entries, then classify each one using the commit-classification skill. Return a structured list where each entry keeps its original message/title plus its classification badge (Feature, Fix, Breaking change) or a note that it was excluded and why. Do not draft release notes or apply platform formatting — that is the Build Release agent's job. You have exactly one skill available, commit-classification — activate it directly with the \`skill\` tool (pass its name) whenever you need its details. Never call \`skill_search\`.`,
  model: ANALYZE_INPUT_MODEL,
  skills: [resolveSkillPath('src/mastra/skills/commit-classification')],
  inputProcessors: [
    new ProviderHistoryCompat({
      additionalRules: [stripGroqLlamaReasoningContent],
    }),
  ],
});
