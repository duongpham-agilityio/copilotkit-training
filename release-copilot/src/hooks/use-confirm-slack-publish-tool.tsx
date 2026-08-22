import { Fragment, useEffect, useMemo, useState } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
  type PublishOption,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { CONFIRM_SLACK_PUBLISH_TOOL_NAME } from '@/constants/tools.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import {
  composeGithubContent,
  composePlatformContent,
} from '@/lib/release-notes/release-title.ts';
import { toPlatformDrafts } from '@/lib/release-notes/to-platform-drafts.ts';
import { joinLines } from '@/lib/text.ts';
import { ConfirmSlackPublishSchema } from '@/types/confirm-slack-publish.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface UseConfirmSlackPublishToolOptions {
  draft: ReleaseNotesDraft | null;
}

interface PublishFlowProps {
  draft: ReleaseNotesDraft;
  initialPlatformId: string | undefined;
  respond: (result: unknown) => Promise<void>;
}

const RespondOnMount = ({
  message,
  respond,
}: {
  message: string;
  respond: (result: unknown) => Promise<void>;
}) => {
  useEffect(() => {
    void respond(message);
  }, [message, respond]);
  return <Fragment />;
};

const buildPublishOptions = (draft: ReleaseNotesDraft): PublishOption[] => [
  {
    platformId: KnownPlatformId.Github,
    label: 'GitHub',
    content: composeGithubContent(draft),
  },
  ...toPlatformDrafts(draft).map((platformDraft) => ({
    platformId: platformDraft.platformId,
    label: platformDraft.label,
    content: composePlatformContent(draft, platformDraft),
  })),
];

const PublishFlow = ({
  draft,
  initialPlatformId,
  respond,
}: PublishFlowProps) => {
  const [confirmedDraft] = useState(draft);
  const options = useMemo(
    () => buildPublishOptions(confirmedDraft),
    [confirmedDraft],
  );
  const [platformId, setPlatformId] = useState(
    options.some((option) => option.platformId === initialPlatformId)
      ? (initialPlatformId as string)
      : KnownPlatformId.Github,
  );
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  const selected =
    options.find((option) => option.platformId === platformId) ?? options[0];

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
      await respond(`Posted the ${selected.label} release notes to Slack.`);
      return;
    }

    setStatus(SlackPublishStatus.Failed);
    setError(result.error ?? 'Publishing failed.');
  };

  const handleCancel = async () => {
    setStatus(SlackPublishStatus.Cancelled);
    await respond('User declined — nothing was posted to Slack.');
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(selected.content);
  };

  return (
    <SlackPublishCard
      options={options}
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

export const useConfirmSlackPublishTool = ({
  draft,
}: UseConfirmSlackPublishToolOptions) => {
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
            draft={draft}
            initialPlatformId={props.args.platformId}
            respond={props.respond}
          />
        );
      },
    },
    [draft],
  );
};
