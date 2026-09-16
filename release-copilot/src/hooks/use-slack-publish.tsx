import { Fragment, useEffect, useState } from 'react';
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
import { copyText } from '@/lib/clipboard.ts';
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
    void respond(message).catch(reportRespondFailure);
  }, [message, respond]);
  return <Fragment />;
};

interface PublishFlowProps {
  draft: ReleaseNotesDraft;
  content: string;
  respond: (result: unknown) => Promise<void>;
}

const PublishFlow = ({ draft, content, respond }: PublishFlowProps) => {
  // Freeze what the user reviewed at mount: they must send exactly what the
  // card showed, even if the draft changes again before they click.
  const [frozen] = useState({
    label: draft.label,
    platform: draft.platform,
    content,
  });
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setStatus(SlackPublishStatus.Sending);
    setError(null);

    const result = await publishToSlack({
      platformId: frozen.platform,
      label: frozen.label,
      content: frozen.content,
    });

    if (result.ok) {
      setStatus(SlackPublishStatus.Sent);
      void saveReleaseToHistory().catch((error: unknown) =>
        console.error('[useSlackPublish] saveReleaseToHistory failed', error),
      );
      await respond(`Posted the ${frozen.label} release notes to Slack.`).catch(
        reportRespondFailure,
      );
      return;
    }

    setStatus(SlackPublishStatus.Failed);
    setError(result.error ?? 'Publishing failed.');
  };

  const handleCancel = async () => {
    setStatus(SlackPublishStatus.Cancelled);
    await respond('User declined — nothing was posted to Slack.').catch(
      reportRespondFailure,
    );
  };

  const handleCopy = () => copyText(frozen.content);

  return (
    <SlackPublishCard
      label={frozen.label}
      content={frozen.content}
      status={status}
      error={error}
      onCopy={handleCopy}
      onSend={() => void handleSend()}
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
          <PublishFlow draft={draft} content={content} respond={props.respond} />
        );
      },
    },
    [draft, content],
  );
};
