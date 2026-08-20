import { Fragment, useCallback, useEffect, useRef } from 'react';
import { useFrontendTool } from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { SHOW_ENTRY_LIST_TOOL_NAME } from '@/constants/tools.ts';
import { joinLines } from '@/lib/text.ts';
import {
  EntryListToolSchema,
  type ReleaseEntry,
} from '@/types/release-entry.ts';

interface UseShowEntryListToolOptions {
  onEntryListShown: (entries: ReleaseEntry[]) => void;
}

interface EntryListSyncProps {
  toolCallId: string;
  entries: ReleaseEntry[];
  onSync: (toolCallId: string, entries: ReleaseEntry[]) => void;
}

const EntryListSync = ({ toolCallId, entries, onSync }: EntryListSyncProps) => {
  useEffect(() => {
    onSync(toolCallId, entries);
  }, [toolCallId, entries, onSync]);
  return null;
};

export const useShowEntryListTool = ({
  onEntryListShown,
}: UseShowEntryListToolOptions) => {
  const appliedToolCallIds = useRef(new Set<string>());

  const syncEntries = useCallback(
    (toolCallId: string, entries: ReleaseEntry[]) => {
      if (appliedToolCallIds.current.has(toolCallId)) return;
      appliedToolCallIds.current.add(toolCallId);
      onEntryListShown(entries);
    },
    [onEntryListShown],
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
    render: ({ args }) => {
      const result = EntryListToolSchema.safeParse(args);

      if (!result.success) {
        console.warn('[showEntryList] received invalid args', result.error);
        return 'Invalid entry list — state left unchanged.';
      }

      return 'Entry list displayed to the user.';
    },
    render: (props) => {
      if (props.result === undefined) {
        return <Fragment />;
      }

      const result = EntryListToolSchema.safeParse(props.args);

      if (!result.success) {
        console.warn('[showEntryList] received invalid args', result.error);
        return <Fragment />;
      }

      return (
        <EntryListSync
          toolCallId={props.toolCallId}
          entries={result.data.entries}
          onSync={syncEntries}
        />
      );
    },
  });
};
