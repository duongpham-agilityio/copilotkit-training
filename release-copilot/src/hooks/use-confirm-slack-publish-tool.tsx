import { Fragment, useEffect, useState } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { CONFIRM_SLACK_PUBLISH_TOOL_NAME } from '@/constants/tools.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { composeDraftContent } from '@/lib/release-notes/release-title.ts';
import { joinLines } from '@/lib/text.ts';
import { ConfirmSlackPublishSchema } from '@/types/confirm-slack-publish.ts';
import { Platform } from '@/types/platform.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface UseConfirmSlackPublishToolOptions {
  // The draft currently in the Live Preview panel — null until one is generated.
  draft: ReleaseNotesDraft | null;
  // The platform tab the preview panel is on, used as the card's starting choice so
  // the two never open showing different text.
  platform: Platform;
}

interface PublishFlowProps {
  draft: ReleaseNotesDraft;
  initialPlatform: Platform;
  respond: (result: unknown) => Promise<void>;
}

// Closes a tool call that can't be answered with a card. Responding is a side
// effect, so it belongs in an effect, not in a render body.
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

const PublishFlow = ({ draft, initialPlatform, respond }: PublishFlowProps) => {
  // Frozen at mount: a later draft must not silently rewrite the text under a card
  // the user is already looking at. A new draft gets its own confirmation card.
  const [confirmedDraft] = useState(draft);
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  // Same helper the Live Preview panel uses, on the same draft object — the card
  // cannot show or post text that differs from what the user is looking at.
  const content = composeDraftContent(confirmedDraft, platform);

  const handleSend = async () => {
    setStatus(SlackPublishStatus.Sending);
    setError(null);

    const result = await publishToSlack({ platform, content });

    if (result.ok) {
      setStatus(SlackPublishStatus.Sent);
      await respond(`Posted the ${platform} release notes to Slack.`);
      return;
    }

    // Deliberately does NOT respond: the tool call stays open so the user can fix the
    // problem and click Send again. Responding here would end the turn and force them to
    // ask the agent to start over.
    setStatus(SlackPublishStatus.Failed);
    setError(result.error ?? 'Publishing failed.');
  };

  const handleCancel = async () => {
    setStatus(SlackPublishStatus.Cancelled);
    await respond('User declined — nothing was posted to Slack.');
  };

  return (
    <SlackPublishCard
      preview={content}
      platform={platform}
      status={status}
      error={error}
      onPlatformChange={setPlatform}
      onSend={() => void handleSend()}
      onCancel={() => void handleCancel()}
    />
  );
};

export const useConfirmSlackPublishTool = ({
  draft,
  platform,
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

        // Reachable if the model calls this before rendering a draft, against its
        // instructions. Close the tool call with the reason rather than leaving the
        // user staring at an empty card.
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
            initialPlatform={props.args.platform ?? platform}
            respond={props.respond}
          />
        );
      },
    },
    // Re-registered when either changes so the card always opens on the current draft
    // and the platform tab the user is looking at. PublishFlow freezes its own copy,
    // so an already-open card is unaffected.
    [draft, platform],
  );
};
