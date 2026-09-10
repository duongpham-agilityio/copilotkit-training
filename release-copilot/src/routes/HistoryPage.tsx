import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import ReleaseHistoryList from '@/components/history/ReleaseHistoryList.tsx';
import ReleaseDetailHeader from '@/components/history/ReleaseDetailHeader.tsx';
import ReleaseDetailBody from '@/components/history/ReleaseDetailBody.tsx';
import { copyText } from '@/lib/clipboard.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { useReleaseHistory } from '@/hooks/use-release-history.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { CopyHandler } from '@/components/common/CopyButton.tsx';

const PLATFORM_LABELS: Record<KnownPlatformId, string> = {
  [KnownPlatformId.AppStore]: 'App Store',
  [KnownPlatformId.GooglePlay]: 'Google Play',
  [KnownPlatformId.Github]: 'GitHub',
};

const HistoryPage = () => {
  const {
    releases,
    selectedRelease,
    selectedReleaseId,
    activePlatform,
    markdown,
    isReleasesLoading,
    isReleasesError,
    selectRelease,
    setActivePlatform,
  } = useReleaseHistory();

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
      <div className="w-100 min-w-[320px] shrink-0 overflow-hidden">
        <ErrorBoundary title="Release history unavailable">
          {isReleasesLoading && (
            <p className="text-body-md text-on-surface-variant">
              Loading releases…
            </p>
          )}
          {isReleasesError && (
            <p className="text-body-md text-error">
              Failed to load release history.
            </p>
          )}
          {!isReleasesLoading && !isReleasesError && releases?.length === 0 && (
            <p className="text-body-md text-on-surface-variant">
              No releases yet.
            </p>
          )}
          {!isReleasesLoading && !isReleasesError && releases && releases.length > 0 && (
            <ReleaseHistoryList
              releases={releases}
              selectedReleaseId={selectedReleaseId}
              onSelectRelease={selectRelease}
            />
          )}
        </ErrorBoundary>
      </div>
      <div className="border-outline-variant flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <ErrorBoundary title="Release detail unavailable">
          {selectedRelease && (
            <ReleaseDetailHeader
              release={selectedRelease}
              activePlatform={activePlatform}
              onPlatformChange={setActivePlatform}
              onCopy={() => void handleCopy()}
              onSendToSlack={handleSendToSlack}
            />
          )}
        </ErrorBoundary>
        <div className="bg-surface-container-lowest flex-1 overflow-auto px-14 py-8">
          <ErrorBoundary title="Release notes unavailable">
            {selectedRelease && (
              <ReleaseDetailBody release={selectedRelease} markdown={markdown} />
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
