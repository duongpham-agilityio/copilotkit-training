import { Fragment, useEffect, useRef } from 'react';
import { useFrontendTool, useAgentContext } from '@copilotkit/react-core/v2';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import {
  useCommitEntriesView,
  type CommitEntriesView,
} from '@/hooks/use-commit-entries-view.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { SHOW_ENTRY_LIST_TOOL_NAME } from '@/constants/tools.ts';
import { joinLines } from '@/lib/text.ts';
import { EntryListToolSchema, type ReleaseEntry } from '@/types/release-entry.ts';

interface EntryListSyncProps {
  entries: ReleaseEntry[];
  onSync: (entries: ReleaseEntry[]) => void;
}

const EntryListSync = ({ entries, onSync }: EntryListSyncProps) => {
  useEffect(() => {
    onSync(entries);
  }, [entries, onSync]);
  return null;
};

export interface UseCommitEntriesResult extends CommitEntriesView {
  toggleSelection: (entryId: string) => void;
}

// Owns the "Commits/PRs parser" domain end to end: registers the showEntryList
// frontend tool — SINGLE CALL SITE, see Task 9 — and returns the full
// parsed/selected state via useCommitEntriesView underneath. Any OTHER hook or
// component that only needs to read entries/selection must call
// useCommitEntriesView() instead of this one.
export const useCommitEntries = (): UseCommitEntriesResult => {
  const { threadId } = useThreadSession();
  // useFrontendTool registers its `render` closure once and reuses it across
  // renders — a callback that closed over `threadId` directly would keep
  // reporting the thread that was active when the tool was first registered.
  // Read the current thread through a ref instead. (This is NOT needed for
  // plain event handlers like toggleSelection below, which are recreated fresh
  // every render and always see the current threadId.)
  const threadIdRef = useRef(threadId);
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const view = useCommitEntriesView();
  const setEntries = useReleaseWorkspaceStore((state) => state.setEntries);
  const toggleEntrySelection = useReleaseWorkspaceStore(
    (state) => state.toggleEntrySelection,
  );

  useFrontendTool({
    name: SHOW_ENTRY_LIST_TOOL_NAME,
    description: joinLines(
      'The only way the classified entry list reaches the UI — call it',
      'once classification is decided (see the system instructions for',
      'when that is); never describe entries as chat text, a table, or a',
      'list instead of calling this tool.',
      'For a "commit"-sourced entry missing a required field, suggest a',
      "corrected `git log` command built from that field's own",
      'description rather than guessing.',
      'Call it exactly once per batch with the complete list of entries —',
      'never split one batch across multiple calls, and never call it again',
      'for the same batch unless the user pastes new or corrected text.',
      'If the call fails, retry it exactly once before telling the user',
      'something went wrong.',
    ),
    parameters: EntryListToolSchema,
    agentId: RELEASE_COPILOT_AGENT_ID,
    render: (props) => {
      if (props.result === undefined) {
        return <Fragment />;
      }

      const result = EntryListToolSchema.safeParse(props.args);

      if (!result.success) {
        console.warn('[useCommitEntries] received invalid args', result.error);
        return <Fragment />;
      }

      return (
        <EntryListSync
          entries={result.data.entries}
          onSync={(entries) => setEntries(threadIdRef.current, entries)}
        />
      );
    },
  });

  useAgentContext({
    description: joinLines(
      'Current state of the parsed commits/PRs.',
      '`entries`: all entries classified so far.',
      '`selectedEntries`: the checked subset, used to build the release-notes',
      'draft.',
    ),
    value: { entries: view.entries, selectedEntries: view.selectedEntries },
  });

  return {
    ...view,
    toggleSelection: (entryId: string) => toggleEntrySelection(threadId, entryId),
  };
};
