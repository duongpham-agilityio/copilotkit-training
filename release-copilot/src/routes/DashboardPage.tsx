import { useState } from 'react';
import CommitListPanel from '@/components/commit-list/CommitListPanel.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { useShowEntryListTool } from '@/hooks/use-show-entry-list-tool.ts';
import type { Commit } from '@/types/commit.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';
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

const MARKDOWN_BY_PLATFORM: Record<Platform, string> = {
  [Platform.Github]: `# 🚀 What's New in MVP v1.0

We are thrilled to announce the first major release of our platform! Here is what is included:

## ✨ New Features

- **Offline Sync:** Seamlessly continue working without an internet connection. Changes will sync automatically when back online. \`a1b2c3d\`
- **Dark Mode Support:** Easy on the eyes for those late-night coding sessions.

## 🐛 Bug Fixes

- Resolved critical null pointer exception in the primary authentication flow. \`e4f5g6h\`
`,
  [Platform.AppStore]: `What's New in v1.0

- Work offline — changes sync automatically when you're back online
- Added Dark Mode support
- Fixed a crash that could occur when signing in
`,
  [Platform.GooglePlay]: `Offline sync, Dark Mode, and a fix for a sign-in crash. Update now!`,
};

const DashboardPage = () => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<Platform>(Platform.AppStore);

  useShowEntryListTool({
    onEntryListShown: (entries) => {
      const nextCommits = entries.map(toCommit);
      setCommits(nextCommits);
      setSelectedHashes(new Set(nextCommits.map((commit) => commit.hash)));
    },
  });

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

  const handleCopy = () => {
    void navigator.clipboard.writeText(MARKDOWN_BY_PLATFORM[platform]);
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
            markdown={MARKDOWN_BY_PLATFORM[platform]}
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
