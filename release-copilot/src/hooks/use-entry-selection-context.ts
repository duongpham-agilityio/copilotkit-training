import { useAgentContext } from '@copilotkit/react-core/v2';
import type { ReleaseEntry } from '@/types/release-entry.ts';

interface UseEntrySelectionContextOptions {
  entries: ReleaseEntry[];
}

export const useEntrySelectionContext = ({
  entries,
}: UseEntrySelectionContextOptions): void => {
  useAgentContext({
    description: 'The entries currently checked in the commit list panel.',
    value: { entries },
  });
};
