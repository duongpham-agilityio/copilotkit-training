import { useState } from 'react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton from '@/components/common/CopyButton.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import type { TabItem } from '@/components/common/Tabs.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';
import MarkdownPreview from '@/components/release-notes/MarkdownPreview.tsx';
import { type ReleaseSummary, ReleaseStatus } from '@/types/release.ts';
import { KnownPlatformId } from '@/types/platform.ts';

const PLATFORM_ITEMS: TabItem[] = [
  { value: KnownPlatformId.Github, label: 'GitHub' },
  { value: KnownPlatformId.AppStore, label: 'App Store' },
  { value: KnownPlatformId.GooglePlay, label: 'Google Play' },
];

interface ReleaseVersionDetailProps {
  release: ReleaseSummary;
  notesByPlatform: Record<KnownPlatformId, string>;
  onCopy: (platform: KnownPlatformId) => void;
}

const RELEASE_STATUS_BADGE_VARIANT: Record<ReleaseStatus, BadgeVariant> = {
  [ReleaseStatus.Published]: BadgeVariant.Success,
  [ReleaseStatus.Draft]: BadgeVariant.Warning,
  [ReleaseStatus.Archived]: BadgeVariant.Neutral,
};

const ReleaseVersionDetail = ({
  release,
  notesByPlatform,
  onCopy,
}: ReleaseVersionDetailProps) => {
  const [activePlatform, setActivePlatform] = useState<KnownPlatformId>(
    KnownPlatformId.Github,
  );

  return (
    <Card emphasis={CardEmphasis.Raised}>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-headline-md text-on-surface font-semibold">
              {release.title}
            </span>
            <span className="text-label-sm text-on-surface-variant ml-2">
              {release.version}
            </span>
          </div>
          <Badge variant={RELEASE_STATUS_BADGE_VARIANT[release.status]}>
            {release.status}
          </Badge>
        </div>
      </Card.Header>
      <div className="mb-4 flex items-center justify-between">
        <PlatformTabs
          items={PLATFORM_ITEMS}
          value={activePlatform}
          onChange={(value) => setActivePlatform(value as KnownPlatformId)}
        />
        <CopyButton
          variant={ButtonVariant.Secondary}
          onCopy={() => onCopy(activePlatform)}
        />
      </div>
      <MarkdownPreview markdown={notesByPlatform[activePlatform]} />
    </Card>
  );
};

export default ReleaseVersionDetail;
