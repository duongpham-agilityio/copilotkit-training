import { useAgentContext } from '@copilotkit/react-core/v2';
import { joinLines } from '@/lib/text.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface UseCurrentDraftContextOptions {
  draft: ReleaseNotesDraft | null;
}

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
