import { stripMarkdown } from '@/lib/export/strip-markdown.ts';
import { ExportFormat } from '@/types/export-format.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';

export interface ExportFile {
  filename: string;
  mimeType: string;
  content: string;
}

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  [ExportFormat.Markdown]: 'md',
  [ExportFormat.PlainText]: 'txt',
  [ExportFormat.Json]: 'json',
};

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  [ExportFormat.Markdown]: 'text/markdown',
  [ExportFormat.PlainText]: 'text/plain',
  [ExportFormat.Json]: 'application/json',
};

interface ExportSection {
  type: string;
  entries: ReleaseEntry[];
}

// Structured JSON export groups by the classification the agent already
// assigned each entry (breaking / feat / fix / any custom label) rather than
// by platform wording — the platform-specific prose in `platform.content` is
// what the markdown/plain-text exports use instead.
const buildSections = (entries: ReleaseEntry[]): ExportSection[] => {
  const breaking = entries.filter((entry) => entry.breaking);
  const nonBreaking = entries.filter((entry) => !entry.breaking);
  const typeOrder = Array.from(new Set(nonBreaking.map((entry) => entry.type)));

  return [
    { type: 'breaking', entries: breaking },
    ...typeOrder.map((type) => ({
      type,
      entries: nonBreaking.filter((entry) => entry.type === type),
    })),
  ].filter((section) => section.entries.length > 0);
};

const buildJsonContent = (
  platform: PlatformOption,
  entries: ReleaseEntry[],
): string =>
  JSON.stringify(
    { platform: platform.platformId, sections: buildSections(entries) },
    null,
    2,
  );

export const buildExportFile = (
  platform: PlatformOption,
  entries: ReleaseEntry[],
  format: ExportFormat,
): ExportFile => {
  const filename = `release-notes-${platform.platformId}.${EXTENSION_BY_FORMAT[format]}`;
  const mimeType = MIME_BY_FORMAT[format];

  if (format === ExportFormat.Json) {
    return { filename, mimeType, content: buildJsonContent(platform, entries) };
  }

  const content =
    format === ExportFormat.PlainText
      ? stripMarkdown(platform.content)
      : platform.content;

  return { filename, mimeType, content };
};
