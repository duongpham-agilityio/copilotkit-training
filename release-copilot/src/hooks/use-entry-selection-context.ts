import { useAgentContext } from '@copilotkit/react-core/v2';
import { joinLines } from '@/lib/text.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';

interface UseEntrySelectionContextOptions {
  entries: ReleaseEntry[];
}

export const useEntrySelectionContext = ({
  entries,
}: UseEntrySelectionContextOptions): void => {
  useAgentContext({
    description: joinLines(
      'The entries currently checked in the commit list panel — live state the',
      'user can change between turns, not a snapshot of what they pasted.',
      'These, and only these, are the entries a draft may include: an unchecked',
      'entry is out of the pipeline, not merely hidden. An empty array means',
      'the user has selected nothing yet, which is not the same as having no',
      'commits — ask them to pick at least one instead of drafting.',
    ),
    value: { entries },
  });
};
