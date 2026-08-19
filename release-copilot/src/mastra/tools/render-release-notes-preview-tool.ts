import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ReleaseNotesDraftSchema } from '../../types/release-notes-draft';

export const renderReleaseNotesPreviewTool = createTool({
  id: 'render-release-notes-preview',
  description:
    'Call this exactly once per draft or edit, with markdown/plain-text content for all 3 platforms (github, appStore, googlePlay), to render the Live Preview panel. Never print the release notes content as chat text — this tool call is the only way it reaches the UI.',
  inputSchema: ReleaseNotesDraftSchema,
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async () => ({ ok: true }),
});
