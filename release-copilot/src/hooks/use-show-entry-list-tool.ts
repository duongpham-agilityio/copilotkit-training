import { useFrontendTool } from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { joinLines } from '@/lib/text.ts';
import {
  EntryListToolSchema,
  type ReleaseEntry,
} from '@/types/release-entry.ts';

interface UseShowEntryListToolOptions {
  onEntryListShown: (entries: ReleaseEntry[]) => void;
}

export const useShowEntryListTool = ({
  onEntryListShown,
}: UseShowEntryListToolOptions) => {
  useFrontendTool({
    name: 'showEntryList',
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
    handler: async (args) => {
      const result = EntryListToolSchema.safeParse(args);
      if (!result.success) {
        console.warn('[showEntryList] received invalid args', result.error);
        return 'Invalid entry list — state left unchanged.';
      }
      onEntryListShown(result.data.entries);
      return 'Entry list displayed to the user.';
    },
  });
};
