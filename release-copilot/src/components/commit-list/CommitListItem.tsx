import Checkbox from '@/components/common/Checkbox.tsx';
import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import MonoTag from '@/components/common/MonoTag.tsx';
import Avatar from '@/components/common/Avatar.tsx';
import { type Commit, CommitType } from '@/types/commit.ts';

interface CommitListItemProps {
  commit: Commit;
  selected: boolean;
  onToggle: (hash: string) => void;
}

const COMMIT_TYPE_BADGE_VARIANT: Record<CommitType, BadgeVariant> = {
  [CommitType.Feat]: BadgeVariant.Success,
  [CommitType.Fix]: BadgeVariant.Error,
  [CommitType.Chore]: BadgeVariant.Neutral,
};

const badgeVariantForType = (type: string): BadgeVariant =>
  (COMMIT_TYPE_BADGE_VARIANT as Record<string, BadgeVariant>)[type] ??
  BadgeVariant.Neutral;

const CommitListItem = ({
  commit,
  selected,
  onToggle,
}: CommitListItemProps) => (
  <div className="flex items-center gap-3 py-3">
    <Checkbox
      checked={selected}
      onChange={() => onToggle(commit.hash)}
      aria-label={`Select commit ${commit.hash}`}
    />
    <Badge variant={badgeVariantForType(commit.type)}>{commit.type}</Badge>
    <span className="text-body-md text-on-surface flex-1 truncate">
      {commit.message}
    </span>
    <Avatar name={commit.author} />
    <MonoTag>{commit.hash.slice(0, 7)}</MonoTag>
  </div>
);

export default CommitListItem;
