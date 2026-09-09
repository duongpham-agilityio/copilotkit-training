import { Fragment, useEffect, useState } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id.ts';
import { CONFIRM_SLACK_PUBLISH_TOOL_NAME } from '@/constants/agent-tools/tools-name.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { joinLines } from '@/lib/text.ts';
import { copyText } from '@/lib/clipboard.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import { ConfirmSlackPublishSchema } from '@/types/confirm-slack-publish.ts';

interface PublishFlowProps {
  options: PlatformOption[];
  initialPlatformId: string | undefined;
  respond: (result: unknown) => Promise<void>;
}

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

const PublishFlow = ({ options, initialPlatformId, respond }: PublishFlowProps) => {
  // Freeze the option list at mount: the user must send exactly what they
  // reviewed in the card, even if the draft changes again before they click.
  const [confirmedOptions] = useState(options);
  const [platformId, setPlatformId] = useState(
    confirmedOptions.some((option) => option.platformId === initialPlatformId)
      ? (initialPlatformId as string)
      : KnownPlatformId.Github,
  );
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  const selected =
    confirmedOptions.find((option) => option.platformId === platformId) ??
    confirmedOptions[0];

  const handleSend = async () => {
    setStatus(SlackPublishStatus.Sending);
    setError(null);

    const result = await publishToSlack({
      platformId: selected.platformId,
      label: selected.label,
      content: selected.content,
    });

    if (result.ok) {
      setStatus(SlackPublishStatus.Sent);
      await respond(`Posted the ${selected.label} release notes to Slack.`).catch(
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

  const handleCopy = () => copyText(selected.content);

  return (
    <SlackPublishCard
      options={confirmedOptions}
      selectedPlatformId={selected.platformId}
      preview={selected.content}
      status={status}
      error={error}
      onPlatformChange={setPlatformId}
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
  const { draft, options } = useReleaseDraftView();

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

        if (!draft) {
          return (
            <RespondOnMount
              message="No draft exists yet — nothing was shown and nothing was posted."
              respond={props.respond}
            />
          );
        }

        return (
          <PublishFlow
            options={options}
            initialPlatformId={props.args.platformId}
            respond={props.respond}
          />
        );
      },
    },
    [draft, options],
  );
};
