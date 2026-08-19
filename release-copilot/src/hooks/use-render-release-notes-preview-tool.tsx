import { Fragment, useCallback, useEffect, useRef } from 'react';
import { useRenderTool } from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME } from '@/constants/tools';
import { ReleaseNotesDraftSchema } from '@/types/release-notes-draft.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface UseRenderReleaseNotesPreviewToolOptions {
  onDraftRendered: (draft: ReleaseNotesDraft) => void;
}

interface DraftSyncProps {
  toolCallId: string;
  draft: ReleaseNotesDraft;
  onSync: (toolCallId: string, draft: ReleaseNotesDraft) => void;
}

const DraftSync = ({ toolCallId, draft, onSync }: DraftSyncProps) => {
  useEffect(() => {
    onSync(toolCallId, draft);
  }, [toolCallId, draft, onSync]);
  return null;
};

export const useRenderReleaseNotesPreviewTool = ({
  onDraftRendered,
}: UseRenderReleaseNotesPreviewToolOptions) => {
  const appliedToolCallIds = useRef(new Set<string>());

  const syncDraft = useCallback(
    (toolCallId: string, draft: ReleaseNotesDraft) => {
      if (appliedToolCallIds.current.has(toolCallId)) return;
      appliedToolCallIds.current.add(toolCallId);
      onDraftRendered(draft);
    },
    [onDraftRendered],
  );

  useRenderTool({
    name: RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME,
    parameters: ReleaseNotesDraftSchema,
    agentId: RELEASE_COPILOT_AGENT_ID,
    render: (props) => {
      if (props.status === 'inProgress') {
        return <Fragment />;
      }

      return (
        <DraftSync
          toolCallId={props.toolCallId}
          draft={props.parameters}
          onSync={syncDraft}
        />
      );
    },
  });
};
