import type { CompatRule } from '@mastra/core/processors';

// Groq's llama-3.1-8b-instant is not reasoning-capable and rejects the
// `reasoning` field Groq's own reasoning models (e.g. openai/gpt-oss-120b)
// leave on assistant turns when shared conversation history is replayed
// across agents on different models. Strip it before the outbound call.
//
// The `model` arg here is not the Mastra router string ("groq/llama-..."):
// by this point it's the resolved LanguageModelV2, whose `.provider` is
// "groq.chat" and `.modelId` is the bare "llama-3.1-8b-instant" (verified
// against @mastra/core's built-in cerebras/anthropic rules, which resolve
// the same object shape). Mirrors their `matchesProviderPrefix` pattern.
const isGroqProvider = (provider: unknown): boolean =>
  typeof provider === 'string' && /^groq($|[.-])/i.test(provider);
const isLlamaModelId = (modelId: unknown): boolean =>
  typeof modelId === 'string' && /llama/i.test(modelId);

const isGroqLlamaModel = (model: unknown): boolean => {
  if (typeof model === 'string')
    return /^groq[/:]/i.test(model) && isLlamaModelId(model);
  if (model && typeof model === 'object') {
    const { provider, modelId } = model as {
      provider?: unknown;
      modelId?: unknown;
    };
    return isGroqProvider(provider) && isLlamaModelId(modelId);
  }
  return false;
};

export const stripGroqLlamaReasoningContent: CompatRule = {
  name: 'groq-llama-strip-reasoning-content',
  applyToPrompt({ prompt, model }) {
    if (!isGroqLlamaModel(model)) return undefined;

    let mutated = false;
    const next = prompt.map((message) => {
      if (
        message.role !== 'assistant' ||
        typeof message.content === 'string' ||
        !Array.isArray(message.content)
      ) {
        return message;
      }
      const filtered = message.content.filter(
        (part) => part.type !== 'reasoning',
      );
      if (filtered.length === message.content.length) return message;
      mutated = true;
      return { ...message, content: filtered };
    });

    return mutated ? next : undefined;
  },
};
