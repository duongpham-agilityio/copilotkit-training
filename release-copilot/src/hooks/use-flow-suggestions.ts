import { useConfigureSuggestions } from '@copilotkit/react-core/v2';
import { useCommitEntriesView } from '@/hooks/use-commit-entries-view.ts';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';

const SELECT_STAGE_SUGGESTIONS = [
  { title: 'Draft for GitHub', message: 'Draft release notes for GitHub' },
  {
    title: 'Draft for all platforms',
    message: 'Draft release notes for GitHub, App Store, and Google Play',
  },
];

const DRAFT_STAGE_SUGGESTIONS = [
  {
    title: 'Make the release notes shorter',
    message: 'Make the release notes shorter',
  },
  {
    title: 'Translate the release notes to VI',
    message: 'Translate the release notes to VI',
  },
  {
    title: 'Post the release notes to Slack',
    message: 'Post the release notes to Slack',
  },
];

// Owns the "Suggestions" domain: reads entries/draft via the two read-only
// view hooks and registers useConfigureSuggestions — SINGLE CALL SITE, see
// Task 11. Suggestions only show once the user has a parsed entry list, and
// then guide the flow one stage at a time: parsed but no draft -> prompt to
// build; draft exists -> offer edits and publishing. Never mixes stages, so
// the suggestion list always points at the single next action.
export const useFlowSuggestions = (): void => {
  const { entries } = useCommitEntriesView();
  const { draft } = useReleaseDraftView();

  const suggestions = draft === null ? SELECT_STAGE_SUGGESTIONS : DRAFT_STAGE_SUGGESTIONS;

  useConfigureSuggestions({
    consumerAgentId: RELEASE_COPILOT_AGENT_ID,
    suggestions,
    available: entries.length === 0 ? 'disabled' : 'always',
  });
};
