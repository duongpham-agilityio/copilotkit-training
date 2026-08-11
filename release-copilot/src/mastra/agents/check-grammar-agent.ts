import { Agent } from '@mastra/core/agent';
import { ProviderHistoryCompat } from '@mastra/core/processors';
import { CHECK_GRAMMAR_MODEL } from '../../constants/models';
import { stripGroqLlamaReasoningContent } from '../processors/strip-groq-llama-reasoning';

export const checkGrammarAgent = new Agent({
  id: 'check-grammar-agent',
  name: 'Check Grammar Agent',
  description:
    'Polishes grammar and clarity of already-rendered release-notes text for all 3 platforms, without changing meaning, structure, or platform formatting rules.',
  instructions: `You receive rendered release-notes text for one or more platforms (GitHub Markdown, App Store/TestFlight plain text, Google Play plain text). Fix grammar, spelling, and awkward phrasing only. Do not change the meaning, add or remove bullet points, change section structure, or violate the platform's character limit or format (Markdown vs plain text). Return the corrected text for each platform you were given, in the same structure you received it.`,
  model: CHECK_GRAMMAR_MODEL,
  inputProcessors: [
    new ProviderHistoryCompat({
      additionalRules: [stripGroqLlamaReasoningContent],
    }),
  ],
});
