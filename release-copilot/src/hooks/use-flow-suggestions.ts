import { useConfigureSuggestions } from '@copilotkit/react-core/v2';
import { useCommitEntriesView } from '@/hooks/use-commit-entries-view.ts';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';

const PARSE_STAGE_SUGGESTIONS = [
  {
    title: 'Paste a git log',
    message: 'Here is my git log, please classify it:',
  },
  {
    title: 'Paste a PR title',
    message: 'Here is a PR to classify:',
  },
];

const SELECT_STAGE_SUGGESTIONS = [
  { title: 'Draft for GitHub', message: 'Draft release notes for GitHub' },
  {
    title: 'Draft for all platforms',
    message: 'Draft release notes for GitHub, App Store, and Google Play',
  },
];

const DRAFT_STAGE_SUGGESTIONS = [
  { title: 'Make it shorter', message: 'Make it shorter' },
  { title: 'Translate to VI', message: 'Translate to VI' },
  { title: 'Post to Slack', message: 'Post the release notes to Slack' },
];

// Owns the "Suggestions" domain: reads entries/draft via the two read-only
// view hooks and registers useConfigureSuggestions — SINGLE CALL SITE, see
// Task 11. Guides the user through the flow one stage at a time: nothing
// parsed yet -> prompt for input; parsed but no draft -> prompt to build;
// draft exists -> offer edits and publishing. Never mixes stages, so the
// suggestion list always points at the single next action.
export const useFlowSuggestions = (): void => {
  const { entries } = useCommitEntriesView();
  const { draft } = useReleaseDraftView();

  const suggestions =
    entries.length === 0
      ? PARSE_STAGE_SUGGESTIONS
      : draft === null
        ? SELECT_STAGE_SUGGESTIONS
        : DRAFT_STAGE_SUGGESTIONS;

  useConfigureSuggestions({
    consumerAgentId: RELEASE_COPILOT_AGENT_ID,
    suggestions,
    available: 'always',
  });
};
