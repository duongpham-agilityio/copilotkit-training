import { useState } from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import ReleaseHistoryList from '@/components/history/ReleaseHistoryList.tsx';
import ReleaseDetailHeader from '@/components/history/ReleaseDetailHeader.tsx';
import ReleaseDetailBody from '@/components/history/ReleaseDetailBody.tsx';
import { copyText } from '@/lib/clipboard.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { ReleaseStatus, type ReleaseSummary } from '@/types/release.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { CopyHandler } from '@/components/common/CopyButton.tsx';

const PLATFORM_LABELS: Record<KnownPlatformId, string> = {
  [KnownPlatformId.AppStore]: 'App Store',
  [KnownPlatformId.GooglePlay]: 'Google Play',
  [KnownPlatformId.Github]: 'GitHub',
};

// Local fixture data — placeholder until /release-history wiring lands.
const RELEASES: ReleaseSummary[] = [
  {
    version: 'v2.4.0-stable',
    status: ReleaseStatus.Published,
    title: 'Performance enhancements and UI updates',
    date: 'Oct 24, 2023',
    featCount: 3,
    fixCount: 2,
  },
  {
    version: 'v2.3.1',
    status: ReleaseStatus.Published,
    title: 'Hotfix for authentication bug',
    date: 'Oct 12, 2023',
    featCount: 0,
    fixCount: 1,
  },
  {
    version: 'v2.3.0',
    status: ReleaseStatus.Published,
    title: 'New analytics dashboard',
    date: 'Sep 28, 2023',
    featCount: 2,
    fixCount: 0,
  },
];

const NOTES_BY_VERSION: Record<string, Record<KnownPlatformId, string>> = {
  'v2.4.0-stable': {
    [KnownPlatformId.AppStore]: `This release focuses on significant performance enhancements across the core platform, alongside several highly requested UI refinements to the dashboard.

### 🚀 New Features

- Introduced a new 'Dark Mode' toggle in user settings.
- Added bulk export functionality for historical release notes.
- Integrated preliminary support for webhook notifications on deployment.

### ✨ Improvements

- Optimized dashboard loading times by 40% using lazy loading for historical data.
- Refined the visual contrast of primary action buttons for better accessibility.
- Updated underlying typography tokens for better readability on smaller tablet screens.

### 🐛 Bug Fixes

- Resolved an issue where markdown preview would occasionally fail to render bullet points correctly.
- Fixed a race condition during authentication that caused intermittent login failures.
`,
    [KnownPlatformId.GooglePlay]: `Performance and UI updates: dashboard loads up to 40% faster, new Dark Mode toggle, bulk export for release notes, and several bug fixes including a login race condition.`,
    [KnownPlatformId.Github]: `## Features

- Add Dark Mode toggle in user settings
- Add bulk export for historical release notes
- Add preliminary webhook notifications on deployment

## Fixes

- Fix markdown preview occasionally failing to render bullet points
- Fix race condition during authentication causing intermittent login failures
`,
  },
  'v2.3.1': {
    [KnownPlatformId.AppStore]: `This is a hotfix release addressing an authentication issue reported by several users.

### 🐛 Bug Fixes

- Fixed an authentication bug that could cause failed logins under certain conditions.
`,
    [KnownPlatformId.GooglePlay]: `Hotfix: resolved an authentication bug affecting some logins.`,
    [KnownPlatformId.Github]: `## Fixes

- Fix authentication bug causing failed logins under certain conditions
`,
  },
  'v2.3.0': {
    [KnownPlatformId.AppStore]: `This release introduces a brand-new analytics dashboard for tracking release activity over time.

### 🚀 New Features

- Added a new analytics dashboard with release activity charts.
`,
    [KnownPlatformId.GooglePlay]: `New: analytics dashboard for tracking release activity over time.`,
    [KnownPlatformId.Github]: `## Features

- Add analytics dashboard with release activity charts
`,
  },
};

const HistoryPage = () => {
  const [selectedVersion, setSelectedVersion] = useState(RELEASES[0].version);
  const [activePlatform, setActivePlatform] = useState<KnownPlatformId>(
    KnownPlatformId.AppStore,
  );

  const selectedRelease =
    RELEASES.find((release) => release.version === selectedVersion) ??
    RELEASES[0];
  const markdown =
    NOTES_BY_VERSION[selectedVersion]?.[activePlatform] ?? null;

  const handleCopy: CopyHandler = async () => {
    if (!markdown) return false;
    return copyText(markdown);
  };

  const handleSendToSlack: CopyHandler = async () => {
    if (!markdown) return false;
    const result = await publishToSlack({
      platformId: activePlatform,
      label: PLATFORM_LABELS[activePlatform],
      content: markdown,
    });
    return result.ok;
  };

  return (
    <div className="flex h-full gap-6">
      <div className="w-100 min-w-[320px] shrink-0">
        <ErrorBoundary title="Release history unavailable">
          <ReleaseHistoryList
            releases={RELEASES}
            selectedVersion={selectedVersion}
            onSelectVersion={setSelectedVersion}
          />
        </ErrorBoundary>
      </div>
      <div className="border-outline-variant flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <ErrorBoundary title="Release detail unavailable">
          <ReleaseDetailHeader
            release={selectedRelease}
            activePlatform={activePlatform}
            onPlatformChange={setActivePlatform}
            onCopy={() => void handleCopy()}
            onSendToSlack={handleSendToSlack}
          />
        </ErrorBoundary>
        <div className="bg-surface-container-lowest flex-1 overflow-auto px-14 py-8">
          <ErrorBoundary title="Release notes unavailable">
            <ReleaseDetailBody release={selectedRelease} markdown={markdown} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
