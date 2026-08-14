// Shared between the Mastra tool registry key (agent.tools / mastra.tools) and
// CopilotKit's `useRenderTool({ name })` — no compiler link between them otherwise,
// so a rename on one side would fail silently at runtime, not at build time.
export const RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME = 'renderReleaseNotesPreview';
