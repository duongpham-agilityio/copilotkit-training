// Best-effort plain-text conversion for the .txt export path: strips the
// handful of Markdown constructs the agent is instructed to produce (see
// RELEASE_NOTE_FORMATTING) — headings, bold/italic emphasis, and inline code
// fences — without pulling in a full Markdown parser for one export format.
export const stripMarkdown = (markdown: string): string =>
  markdown
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '- ');
