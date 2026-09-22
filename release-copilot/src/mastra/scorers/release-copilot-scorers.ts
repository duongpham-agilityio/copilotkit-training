import type { MastraDBMessage } from '@mastra/core/agent';
import {
  createAnswerRelevancyScorer,
  createHallucinationScorer,
} from '@mastra/evals/scorers/prebuilt';
import {
  getTextContentFromMastraDBMessage,
  isScorerRunInputForAgent,
} from '@mastra/evals/scorers/utils';
import { RELEASE_COPILOT_JUDGE_MODEL } from '../../constants/models/model-name';

const getUserMessageTexts = (messages: MastraDBMessage[]): string[] =>
  messages
    .filter(({ role }) => role === 'user')
    .map(getTextContentFromMastraDBMessage)
    .filter((text) => text.length > 0);

export const answerRelevancyScorer = createAnswerRelevancyScorer({
  model: RELEASE_COPILOT_JUDGE_MODEL,
});

// Ground truth for "did the reply invent a change" is what the user pasted. Edit turns
// ("make it shorter") don't re-paste the log, so the context is every user message the
// agent saw (remembered history + current turn), not just the last one. Assistant
// messages are excluded on purpose: an earlier draft must not vouch for itself.
// High score = more hallucination (bad); there is no live threshold, it is a Studio signal.
export const hallucinationScorer = createHallucinationScorer({
  model: RELEASE_COPILOT_JUDGE_MODEL,
  options: {
    getContext: ({ run }) => {
      const { input } = run;
      if (!isScorerRunInputForAgent(input)) {
        return [];
      }
      const { rememberedMessages, inputMessages } = input;
      return getUserMessageTexts([...rememberedMessages, ...inputMessages]);
    },
  },
});
