import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import { type ReleaseSummary, ReleaseStatus } from '@/types/release.ts';

interface ReleaseHistoryListItemProps {
  release: ReleaseSummary;
  onSelect: (version: string) => void;
}

const RELEASE_STATUS_BADGE_VARIANT: Record<ReleaseStatus, BadgeVariant> = {
  [ReleaseStatus.Published]: BadgeVariant.Success,
  [ReleaseStatus.Draft]: BadgeVariant.Warning,
  [ReleaseStatus.Archived]: BadgeVariant.Neutral,
};

const ReleaseHistoryListItem = ({
  release,
  onSelect,
}: ReleaseHistoryListItemProps) => (
  <Card
    emphasis={CardEmphasis.Outlined}
    onClick={() => onSelect(release.version)}
  >
    <div className="flex items-center justify-between">
      <div>
        <span className="text-body-lg text-on-surface font-medium">
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
    <div className="text-label-sm text-on-surface-variant mt-2">
      {release.date} · {release.featCount} feat · {release.fixCount} fix
    </div>
  </Card>
);

export default ReleaseHistoryListItem;
