// Tool names are a three-way contract with no compiler link between the sides: the
// registry key (agent.tools / mastra.tools or CopilotKit's hook `name`), the React
// hook that renders the call, and the agent instructions that tell the model which
// tool to call. Renaming one side alone fails silently at runtime, so every name
// lives here and every side imports it — including the instructions, which name the
// tools verbatim rather than describing them in prose.
export const RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME =
  'renderReleaseNotesPreview';

export const SHOW_ENTRY_LIST_TOOL_NAME = 'showEntryList';

export const CONFIRM_SLACK_PUBLISH_TOOL_NAME = 'confirmSlackPublish';
