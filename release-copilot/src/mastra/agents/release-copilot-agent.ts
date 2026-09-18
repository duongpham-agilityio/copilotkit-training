import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import {
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
  inputProcessors: [promptInjectionDetector, piiDetector],
  memory: new Memory({
    options: {
      lastMessages: 10,
      generateTitle: true,
      workingMemory: {
        enabled: true,
        scope: 'thread',
        schema: WorkingMemorySchema,
      },
    },
  }),
});
