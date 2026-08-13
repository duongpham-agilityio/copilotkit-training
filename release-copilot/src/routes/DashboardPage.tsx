import { useState } from 'react';
import CommitListPanel from '@/components/commit-list/CommitListPanel.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { type Commit, CommitType } from '@/types/commit.ts';
import { Platform } from '@/types/platform.ts';

const MOCK_COMMITS: Commit[] = [
  {
    hash: 'a1b2c3d4e5f6',
    type: CommitType.Feat,
    message: 'Implement real-time sync for offline mode',
    author: 'Sarah Jenkins',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    hash: 'e4f5g6h7i8j9',
    type: CommitType.Fix,
    message: 'Resolve null pointer exception in auth flow',
    author: 'Alex Chen',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    hash: 'i7j8k9l0m1n2',
    type: CommitType.Chore,
    message: 'Update dependencies and bump version to v1.0',
    author: 'Dependabot',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

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
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(
    () => new Set(MOCK_COMMITS.map((commit) => commit.hash)),
  );
  const [platform, setPlatform] = useState<Platform>(Platform.AppStore);

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
            commits={MOCK_COMMITS}
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
