import { useEffect } from 'react';
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
  onDraftRendered: (draft: ReleaseNotesDraft) => void;
}

// The render-release-notes-preview tool runs server-side (see
// src/mastra/tools/render-release-notes-preview-tool.ts) — this component's only
// job is to read its already-validated args off the tool-call stream and push them
// into page state. It renders nothing; the Live Preview panel is the UI for it.
const DraftSync = ({ draft, onDraftRendered }: DraftSyncProps) => {
  useEffect(() => {
    onDraftRendered(draft);
  }, [draft, onDraftRendered]);
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
        return <></>;
      }
      return (
        <DraftSync draft={props.parameters} onDraftRendered={onDraftRendered} />
      );
    },
  });
};
