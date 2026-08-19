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

// The render-release-notes-preview tool runs server-side (see
// src/mastra/tools/render-release-notes-preview-tool.ts) — this component's only
// job is to read its already-validated args off the tool-call stream and push them
// into page state. It renders nothing; the Live Preview panel is the UI for it.
const DraftSync = ({ toolCallId, draft, onSync }: DraftSyncProps) => {
  useEffect(() => {
    onSync(toolCallId, draft);
  }, [toolCallId, draft, onSync]);
  return null;
};

export const useRenderReleaseNotesPreviewTool = ({
  onDraftRendered,
}: UseRenderReleaseNotesPreviewToolOptions) => {
  // `render` runs for EVERY draft tool call still in the chat history, not just the
  // newest one, and `props.parameters` is a fresh object on each render — so without
  // this guard an older draft re-publishes itself on any re-render and can overwrite
  // the current one in the preview. Keyed by tool call id: each draft is applied
  // exactly once, and a remounted old message can no longer clobber a newer draft.
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
