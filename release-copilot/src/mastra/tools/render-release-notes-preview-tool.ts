import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ReleaseNotesDraftSchema } from '../../types/release-notes-draft';

export const renderReleaseNotesPreviewTool = createTool({
  id: 'render-release-notes-preview',
  description:
    'Use this tool to create, edit, optimize, or reformat release notes for the requested destination. Call exactly once per result; never output release-note content directly in chat.',
  inputSchema: ReleaseNotesDraftSchema,
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async () => ({ ok: true }),
});
