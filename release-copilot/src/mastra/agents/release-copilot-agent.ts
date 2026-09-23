import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import {
  RELEASE_COPILOT_EMBEDDING_MODEL,
  RELEASE_COPILOT_FALLBACK_MODEL,
  RELEASE_COPILOT_MODEL,
} from '../../constants/models/model-name';
import { buildReleaseCopilotInstructionsV2 } from '../instructions/v2';
import { renderReleaseNotesPreviewTool } from '../tools/render-release-notes-preview-tool';
import { publishReleaseNotesToSlackTool } from '../tools/publish-release-notes-to-slack-tool';
import {
  RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME,
  PUBLISH_RELEASE_NOTES_TO_SLACK_TOOL_NAME,
} from '../../constants/agent-tools/tools-name';
import {
  classificationRulesSkill,
  commitPrParsingSkill,
  platformFormattingSkill,
  releaseReportingSkill,
} from '../skills';
import { WorkingMemorySchema } from '../../types/working-memory';
import {
  piiDetector,
  promptInjectionDetector,
} from '../processors/guardrail-processors';
import {
  ANSWER_RELEVANCY_SCORER_NAME,
  HALLUCINATION_SCORER_NAME,
} from '../../constants/agent-tools/scorers-name';
import {
  answerRelevancyScorer,
  hallucinationScorer,
} from '../scorers/release-copilot-scorers';
import { releaseCopilotVectorStore } from '../storage/vector-store';
import { externalContextProcessor } from '../processors/external-context';

export const releaseCopilotAgent = new Agent({
  id: 'release-copilot-agent',
  name: 'Release Builder',
  description:
    'The chat agent behind Release Notes Copilot: classifies pasted git-log/PR text, drafts release notes for whichever destination the user names, edits a draft in place, and answers questions about using the app.',
  instructions: () => buildReleaseCopilotInstructionsV2(),
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
    [PUBLISH_RELEASE_NOTES_TO_SLACK_TOOL_NAME]: publishReleaseNotesToSlackTool,
  },
  skills: [
    classificationRulesSkill,
    commitPrParsingSkill,
    platformFormattingSkill,
    releaseReportingSkill,
  ],
  inputProcessors: [
    promptInjectionDetector,
    piiDetector,
    externalContextProcessor,
  ],
  scorers: {
    [ANSWER_RELEVANCY_SCORER_NAME]: {
      scorer: answerRelevancyScorer,
      sampling: { type: 'ratio', rate: 1 },
    },
    [HALLUCINATION_SCORER_NAME]: {
      scorer: hallucinationScorer,
      sampling: { type: 'ratio', rate: 0.5 },
    },
  },
  memory: new Memory({
    // storage is omitted on purpose — Memory falls back to the Mastra instance's
    // storage (the Turso db in src/mastra/index.ts). The vector store points at that
    // same db but must be passed explicitly; semantic recall is inert without it.
    vector: releaseCopilotVectorStore,
    embedder: new ModelRouterEmbeddingModel(RELEASE_COPILOT_EMBEDDING_MODEL),
    options: {
      // Recent turns verbatim. Kept small because a pasted git log is a single huge
      // message — raising this multiplies prompt cost fast.
      lastMessages: 10,
      // Anything older comes back only if it is semantically relevant to the new
      // message, so a long chat stops growing the prompt linearly.
      semanticRecall: {
        topK: 5,
        // 2 messages before and after each hit, so a recalled assistant draft arrives
        // with the user request that produced it instead of standing alone.
        messageRange: 2,
        // Same scope as workingMemory below: matches stay inside the current thread,
        // so a draft for one release can't leak into an unrelated one.
        scope: 'thread',
      },
      generateTitle: true,
      workingMemory: {
        enabled: true,
        scope: 'thread',
        schema: WorkingMemorySchema,
      },
    },
  }),
});
