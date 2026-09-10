import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import MarkdownPreview from '@/components/release-notes/MarkdownPreview.tsx';
import type { ReleaseSummary } from '@/types/release.ts';
import { KnownPlatformId } from '@/types/platform.ts';

const PLATFORM_LABELS: Record<KnownPlatformId, string> = {
  [KnownPlatformId.AppStore]: 'App Store',
  [KnownPlatformId.GooglePlay]: 'Google Play',
  [KnownPlatformId.Github]: 'GitHub',
};

interface ReleaseDetailBodyProps {
  release: ReleaseSummary;
  markdown: string | null;
  activePlatform: KnownPlatformId;
}

const ReleaseDetailBody = ({
  release,
  markdown,
  activePlatform,
}: ReleaseDetailBodyProps) => (
  <Card emphasis={CardEmphasis.Outlined} className="rounded-lg p-8 shadow-sm">
    <div className="border-outline-variant flex flex-col border-b pb-2">
      <span className="text-headline-md text-on-surface font-bold">
        What's New in {release.version}
      </span>
    </div>
    <div className="pt-2">
      <MarkdownPreview
        markdown={markdown}
        className="[&_li]:text-on-surface-variant"
      />
    </div>
    <div className="bg-surface-variant/30 border-outline-variant mt-4 rounded border border-dashed p-4.25 text-center">
      <span className="text-label-mono-xs text-outline font-mono">
        End of release notes preview for {PLATFORM_LABELS[activePlatform]}.
      </span>
    </div>
  </Card>
);

export default ReleaseDetailBody;
