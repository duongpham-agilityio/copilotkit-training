import { Fragment, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id.ts';
import { CONFIRM_SLACK_PUBLISH_TOOL_NAME } from '@/constants/agent-tools/tools-name.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { saveReleaseToHistory } from '@/lib/release-notes/save-release-to-history.ts';
import { joinLines } from '@/lib/text.ts';
import { ConfirmSlackPublishSchema } from '@/types/confirm-slack-publish.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

const reportRespondFailure = (error: unknown): void =>
  console.error('[useSlackPublish] respond() failed', error);

const RespondOnMount = ({
  message,
  respond,
}: {
  message: string;
  respond: (result: unknown) => Promise<void>;
}) => {
  useEffect(() => {
    const send = async (): Promise<void> => {
      try {
        await respond(message);
      } catch (error: unknown) {
        reportRespondFailure(error);
      }
    };

    void send();
  }, [message, respond]);
  return <Fragment />;
};

interface PublishFlowProps {
  draft: ReleaseNotesDraft;
  content: string;
  respond: (result: unknown) => Promise<void>;
}

const PublishFlow = ({ draft, content, respond }: PublishFlowProps) => {
  const { label, platform } = draft;
  // Cancelling isn't a mutation outcome — it's a terminal state the mutation
  // never enters — so it stays local state alongside the mutation's own.
  const [isCancelled, setIsCancelled] = useState(false);

  const publish = useMutation({
    // publishToSlack resolves with { ok: false } instead of rejecting, so
    // rethrow here: otherwise every attempt lands in onSuccess and the card
    // would report a rejected post as sent.
    mutationFn: async (): Promise<void> => {
      const result = await publishToSlack({
        platformId: platform,
        label,
        content,
      });

      if (!result.ok) {
        throw new Error(result.error ?? 'Publishing failed.');
      }
    },
    onSuccess: async (): Promise<void> => {
      try {
        await saveReleaseToHistory();
      } catch (error: unknown) {
        console.error('[useSlackPublish] saveReleaseToHistory failed', error);
      }

      try {
        await respond(`Posted the ${label} release notes to Slack.`);
      } catch (error: unknown) {
        reportRespondFailure(error);
      }
    },
  });

  const handleCancel = async (): Promise<void> => {
    setIsCancelled(true);

    try {
      await respond('User declined — nothing was posted to Slack.');
    } catch (error: unknown) {
      reportRespondFailure(error);
    }
  };

  const resolveStatus = (): SlackPublishStatus => {
    if (isCancelled) {
      return SlackPublishStatus.Cancelled;
    }
    if (publish.isPending) {
      return SlackPublishStatus.Sending;
    }
    if (publish.isSuccess) {
      return SlackPublishStatus.Sent;
    }
    if (publish.isError) {
      return SlackPublishStatus.Failed;
    }
    return SlackPublishStatus.Idle;
  };

  return (
    <SlackPublishCard
      status={resolveStatus()}
      error={publish.error?.message ?? null}
      onSubmit={() => publish.mutate()}
      onCancel={() => void handleCancel()}
    />
  );
};

// Owns the "Slack sending release" domain end to end: reads the current draft
// via useReleaseDraftView() — the safe read-only projection; this hook must
// NEVER import useReleaseDraft(), which would register the render tool a
// second time — and registers the confirmSlackPublish human-in-the-loop tool.
// SINGLE CALL SITE, see Task 9.
export const useSlackPublish = (): void => {
  const { draft, content } = useReleaseDraftView();

  useHumanInTheLoop(
    {
      name: CONFIRM_SLACK_PUBLISH_TOOL_NAME,
      description: joinLines(
        'Ask the user whether to announce the finished release notes in the',
        'team Slack channel. Never pass the notes themselves — the card reads the',
        'draft the render-preview tool already produced, so it always shows',
        'exactly what the user is looking at. Calling this posts nothing by',
        'itself: it shows a confirmation card and waits for the user to click',
        'Send or Cancel. Call it exactly once per draft or edit, immediately',
        'after the render-preview tool call. Never call it before a draft',
        'exists, never call it twice for the same draft, and never claim',
        'anything was posted — the result this tool returns is the only source of',
        'truth for what happened.',
      ),
      parameters: ConfirmSlackPublishSchema,
      agentId: RELEASE_COPILOT_AGENT_ID,
      render: (props) => {
        if (props.status === 'inProgress') {
          return <Fragment />;
        }

        if (props.status === 'complete') {
          return (
            <span className="text-body-md text-on-surface-variant">
              {props.result}
            </span>
          );
        }

        if (!draft || !content) {
          return (
            <RespondOnMount
              message="No draft exists yet — nothing was shown and nothing was posted."
              respond={props.respond}
            />
          );
        }

        return (
          <PublishFlow
            draft={draft}
            content={content}
            respond={props.respond}
          />
        );
      },
    },
    [draft, content],
  );
};
