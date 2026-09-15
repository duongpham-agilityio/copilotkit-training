import { z } from 'zod';
import { ReleaseNotesDraftSchema } from './release-notes-draft';
import { ReleaseEntrySchema } from './release-entry';

export const SaveReleaseHistoryRequestSchema = ReleaseNotesDraftSchema.extend({
  version: z.string().min(1),
  title: z.string().min(1),
  entries: z.array(ReleaseEntrySchema).min(1),
});

export type SaveReleaseHistoryRequest = z.infer<
  typeof SaveReleaseHistoryRequestSchema
>;
