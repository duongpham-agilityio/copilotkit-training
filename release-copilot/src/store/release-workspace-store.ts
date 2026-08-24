import { create } from 'zustand';
import { createEntriesSlice, type EntriesSlice } from '@/store/entries-slice.ts';
import { createDraftSlice, type DraftSlice } from '@/store/draft-slice.ts';

export type ReleaseWorkspaceStore = EntriesSlice & DraftSlice;

// Not persisted: entries/draft are driven by the tool-call render in
// use-commit-entries.tsx / use-release-draft.tsx, which replays from Mastra's
// own persisted history on reconnect — a second, client-side persisted copy of
// the same data is a source of drift, not safety.
export const useReleaseWorkspaceStore = create<ReleaseWorkspaceStore>()(
  (...args) => ({
    ...createEntriesSlice(...args),
    ...createDraftSlice(...args),
  }),
);
