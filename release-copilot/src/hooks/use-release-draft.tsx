import { Fragment, useEffect, useRef } from 'react';
import { useRenderTool, useAgentContext } from '@copilotkit/react-core/v2';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import {
  useReleaseDraftView,
  type ReleaseDraftView,
} from '@/hooks/use-release-draft-view.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import ToolErrorCard from '@/components/chat/ToolErrorCard.tsx';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id.ts';
import { RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME } from '@/constants/agent-tools/tools-name.ts';
import { joinLines } from '@/lib/text.ts';
import {
  ReleaseNotesDraftSchema,
  type ReleaseNotesDraft,
} from '@/types/release-notes-draft.ts';

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

// Owns the "Build release notes dynamic platform" domain end to end: registers
// the renderReleaseNotesPreview render tool — SINGLE CALL SITE, see Task 9 —
// and returns the full draft view via useReleaseDraftView underneath. Any
// OTHER hook or component that only needs to read the draft/platform content
// must call useReleaseDraftView() instead of this one.
export const useReleaseDraft = (): ReleaseDraftView => {
  const { threadId } = useThreadSession();
  const threadIdRef = useRef(threadId);
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const view = useReleaseDraftView();
  const setDraft = useReleaseWorkspaceStore((state) => state.setDraft);

  useRenderTool({
    name: RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME,
    parameters: ReleaseNotesDraftSchema,
    agentId: RELEASE_COPILOT_AGENT_ID,
    render: (props) => {
      if (props.status === 'inProgress') {
        return <Fragment />;
      }

      const result = ReleaseNotesDraftSchema.safeParse(props.parameters);

      if (!result.success) {
        console.warn('[useReleaseDraft] received invalid parameters', result.error);
        return (
          <ToolErrorCard
            toolName={RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME}
            detail={result.error.message}
          />
        );
      }

      return (
        <DraftSync
          draft={result.data}
          onSync={(draft) => setDraft(threadIdRef.current, draft)}
        />
      );
    },
  });

  useAgentContext({
    description: joinLines(
      'The release-notes draft currently shown in the Live Preview panel — the',
      'exact text an edit request applies to, and the text the Slack card will',
      'post. null means no draft has been generated yet. The title line is not',
      'part of these bodies: the app builds it from releaseDate/titleOverride.',
    ),
    value: { draft: view.draft },
  });

  return view;
};
