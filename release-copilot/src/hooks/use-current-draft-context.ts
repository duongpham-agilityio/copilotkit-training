import { useAgentContext } from '@copilotkit/react-core/v2';
import { joinLines } from '@/lib/text.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface UseCurrentDraftContextOptions {
  draft: ReleaseNotesDraft | null;
}

// Edit-in-place ("shorten it", "make it less technical") only works if the agent can
// still see the draft it is being asked to edit. Chat memory keeps just the last few
// messages, and a rendered draft is large, so relying on history means an edit a few
// turns later silently rewrites the notes from scratch. Passing the draft as context
// keeps the newest one in front of the agent for as long as it exists.
export const useCurrentDraftContext = ({
  draft,
}: UseCurrentDraftContextOptions): void => {
  useAgentContext({
    description: joinLines(
      'The release-notes draft currently shown in the Live Preview panel — the',
      'exact text an edit request applies to, and the text the Slack card will',
      'post. null means no draft has been generated yet. The title line is not',
      'part of these bodies: the app builds it from releaseDate/titleOverride.',
    ),
    value: { draft },
  });
};
