import { Fragment, useEffect } from 'react';
import { useRenderTool } from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME } from '@/constants/tools';
import { ReleaseNotesDraftSchema } from '@/types/release-notes-draft.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface UseRenderReleaseNotesPreviewToolOptions {
  onDraftRendered: (draft: ReleaseNotesDraft) => void;
}

interface DraftSyncProps {
  draft: ReleaseNotesDraft;
  onSync: (draft: ReleaseNotesDraft) => void;
}

const DraftSync = ({ draft, onSync }: DraftSyncProps) => {
  useEffect(() => {
    onSync(draft);
  }, [draft, onSync]);
  return null;
};

export const useRenderReleaseNotesPreviewTool = ({
  onDraftRendered,
}: UseRenderReleaseNotesPreviewToolOptions) => {
  useRenderTool({
    name: RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME,
    parameters: ReleaseNotesDraftSchema,
    agentId: RELEASE_COPILOT_AGENT_ID,
    render: (props) => {
      if (props.status === 'inProgress') {
        return <Fragment />;
      }

      return <DraftSync draft={props.parameters} onSync={onDraftRendered} />;
    },
  });
};
