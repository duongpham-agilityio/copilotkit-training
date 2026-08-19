import { Fragment, useState } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { joinLines } from '@/lib/text.ts';
import { Platform } from '@/types/platform.ts';
import {
  DRAFT_FIELD_BY_PLATFORM,
  ReleaseNotesDraftSchema,
} from '@/types/release-notes-draft.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface PublishFlowProps {
  draft: ReleaseNotesDraft;
  respond: (result: unknown) => Promise<void>;
}

const PublishFlow = ({ draft, respond }: PublishFlowProps) => {
  const [platform, setPlatform] = useState<Platform>(Platform.Github);
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setStatus(SlackPublishStatus.Sending);
    setError(null);

    const result = await publishToSlack({
      platform,
      content: draft[DRAFT_FIELD_BY_PLATFORM[platform]],
    });

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
      preview={draft[DRAFT_FIELD_BY_PLATFORM[platform]]}
      platform={platform}
      status={status}
      error={error}
      onPlatformChange={setPlatform}
      onSend={() => void handleSend()}
      onCancel={() => void handleCancel()}
    />
  );
};

export const useConfirmSlackPublishTool = () => {
  useHumanInTheLoop({
    name: 'confirmSlackPublish',
    description: joinLines(
      'Ask the user whether to announce the finished release notes in the',
      'team Slack channel. Calling this posts nothing by itself — it shows a',
      'confirmation card and waits for the user to click Send or Cancel.',
      'Call it exactly once per draft or edit, immediately after the',
      'render-preview tool call, passing the same content for all 3',
      'platforms. Never call it before a draft exists, never call it twice',
      'for the same draft, and never claim anything was posted — the result',
      'this tool returns is the only source of truth for what happened.',
    ),
    parameters: ReleaseNotesDraftSchema,
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

      return <PublishFlow draft={props.args} respond={props.respond} />;
    },
  });
};
