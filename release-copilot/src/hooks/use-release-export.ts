import { useCommitEntriesView } from '@/hooks/use-commit-entries-view.ts';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { buildExportFile } from '@/lib/export/build-export-file.ts';
import { ExportFormat } from '@/types/export-format.ts';

interface ExportOptions {
  format: ExportFormat;
}

interface UseReleaseExportResult {
  canExport: boolean;
  exportDraft: (options: ExportOptions) => void;
}

// Owns the "Download" domain: reads the active platform content and selected
// entries via the two read-only view hooks, converts to the requested format,
// and triggers a real browser download. Registers no CopilotKit primitives —
// unlike useCommitEntries/useReleaseDraft/useSlackPublish/useFlowSuggestions,
// this hook is safe to call from more than one component.
export const useReleaseExport = (): UseReleaseExportResult => {
  const { selectedEntries } = useCommitEntriesView();
  const { options, activePlatformId } = useReleaseDraftView();

  const activeOption = options.find(
    (option) => option.platformId === activePlatformId,
  );

  const exportDraft = ({ format }: ExportOptions): void => {
    if (!activeOption) return;

    const file = buildExportFile(activeOption, selectedEntries, format);
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { canExport: Boolean(activeOption), exportDraft };
};
