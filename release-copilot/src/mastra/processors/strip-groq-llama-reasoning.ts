import type { CompatRule } from '@mastra/core/processors';

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
