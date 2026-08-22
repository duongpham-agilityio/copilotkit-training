import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import {
  RELEASE_COPILOT_FALLBACK_MODEL,
  RELEASE_COPILOT_MODEL,
} from '../../constants/models';
import { buildReleaseCopilotInstructions } from '../instructions';
import { renderReleaseNotesPreviewTool } from '../tools/render-release-notes-preview-tool';
import { RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME } from '../../constants/tools';

export const releaseCopilotAgent = new Agent({
  id: 'release-copilot-agent',
  name: 'Release Copilot',
  description:
    'The chat agent behind Release Notes Copilot: classifies pasted git-log/PR text, drafts release notes for all 3 platforms, edits a draft in place, and answers questions about using the app.',
  instructions: () => buildReleaseCopilotInstructions(),
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
  memory: new Memory({ options: { lastMessages: 6, generateTitle: true } }),
});
