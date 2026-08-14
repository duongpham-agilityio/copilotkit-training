import { useState } from 'react';
import CommitListPanel from '@/components/commit-list/CommitListPanel.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { useShowEntryListTool } from '@/hooks/use-show-entry-list-tool.ts';
import { useEntrySelectionContext } from '@/hooks/use-entry-selection-context.ts';
import { useRenderReleaseNotesPreviewTool } from '@/hooks/use-render-release-notes-preview-tool.tsx';
import type { Commit } from '@/types/commit.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';
import { Platform } from '@/types/platform.ts';

// 'breaking' isn't a CommitType member — Commit.type is deliberately a loose
// string, and CommitListPanel/CommitListItem already fall back gracefully for
// unrecognized type values (see badgeVariantForType/filterLabelForType).
const toCommit = (entry: ReleaseEntry): Commit => ({
  hash: entry.id,
  type: entry.breaking ? 'breaking' : entry.type,
  message: entry.title,
  author: entry.author,
  timestamp: entry.timestamp,
});

const DRAFT_FIELD_BY_PLATFORM: Record<Platform, keyof ReleaseNotesDraft> = {
  [Platform.Github]: 'github',
  [Platform.AppStore]: 'appStore',
  [Platform.GooglePlay]: 'googlePlay',
};

const DashboardPage = () => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<ReleaseEntry[]>([]);
  const [platform, setPlatform] = useState<Platform>(Platform.AppStore);
  const [draft, setDraft] = useState<ReleaseNotesDraft | null>(null);

  useShowEntryListTool({
    onEntryListShown: (nextEntries) => {
      const nextCommits = nextEntries.map(toCommit);
      setCommits(nextCommits);
      setSelectedHashes(new Set(nextCommits.map((commit) => commit.hash)));
      setEntries(nextEntries);
    },
  });

  useRenderReleaseNotesPreviewTool({ onDraftRendered: setDraft });

  const activeEntries = entries.filter((entry) => selectedHashes.has(entry.id));

  useEntrySelectionContext({ entries: activeEntries });

  const handleToggle = (hash: string) => {
    setSelectedHashes((current) => {
      const next = new Set(current);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });
  };

  const markdown = draft ? draft[DRAFT_FIELD_BY_PLATFORM[platform]] : null;

  const handleCopy = () => {
    if (!markdown) return;
    void navigator.clipboard.writeText(markdown);
  };

  return (
    <SplitPane
      leftWidthPercent={65}
      left={
        <div className="flex flex-col gap-6">
          <CommitListPanel
            commits={commits}
            selectedHashes={selectedHashes}
            onToggle={handleToggle}
          />
          <LivePreviewPanel
            markdown={markdown}
            platform={platform}
            onPlatformChange={setPlatform}
            onCopy={handleCopy}
          />
        </div>
      }
      right={<CopilotAssistantPanel />}
    />
  );
};

export default DashboardPage;
