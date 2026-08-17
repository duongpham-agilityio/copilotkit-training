import { useState } from 'react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton from '@/components/common/CopyButton.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';
import MarkdownPreview from '@/components/release-notes/MarkdownPreview.tsx';
import { type ReleaseSummary, ReleaseStatus } from '@/types/release.ts';
import { Platform } from '@/types/platform.ts';

interface ReleaseVersionDetailProps {
  release: ReleaseSummary;
  notesByPlatform: Record<Platform, string>;
  onCopy: (platform: Platform) => void;
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
  const [activePlatform, setActivePlatform] = useState<Platform>(
    Platform.Github,
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
        <PlatformTabs value={activePlatform} onChange={setActivePlatform} />
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
