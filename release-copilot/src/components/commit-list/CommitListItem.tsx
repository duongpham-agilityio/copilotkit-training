import Badge, { BadgeVariant } from '@/components/common/Badge.tsx';
import MonoTag from '@/components/common/MonoTag.tsx';
import Avatar, { AvatarSize } from '@/components/common/Avatar.tsx';
import { type Commit, CommitType } from '@/types/commit.ts';
import { formatRelativeTime } from '@/lib/format-relative-time.ts';
import { cn } from '@/lib/cn';

interface CommitListItemProps {
  commit: Commit;
  selected: boolean;
  onToggle: (hash: string) => void;
}

const COMMIT_TYPE_BADGE_VARIANT: Record<CommitType, BadgeVariant> = {
  [CommitType.Feat]: BadgeVariant.Success,
  [CommitType.Fix]: BadgeVariant.Error,
  [CommitType.Chore]: BadgeVariant.Warning,
};

const badgeVariantForType = (type: string): BadgeVariant =>
  (COMMIT_TYPE_BADGE_VARIANT as Record<string, BadgeVariant>)[type] ??
  BadgeVariant.Neutral;

const CommitListItem = ({
  commit,
  selected,
  onToggle,
}: CommitListItemProps) => (
  <button
    type="button"
    onClick={() => onToggle(commit.hash)}
    aria-pressed={selected}
    className={cn(
      'border-outline-variant flex w-full cursor-pointer flex-col gap-2 rounded-xl border p-4.25 text-left transition-colors',
      selected
        ? 'border-primary bg-primary/5'
        : 'bg-surface-container-lowest hover:bg-surface-container-low',
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <Badge variant={badgeVariantForType(commit.type)}>
          {commit.type.toUpperCase()}
        </Badge>
        <MonoTag>{commit.hash.slice(0, 7)}</MonoTag>
      </div>
      <span className="text-label-sm text-on-surface-variant shrink-0">
        {formatRelativeTime(commit.timestamp)}
      </span>
    </div>
    <span className="text-body-md text-on-surface font-semibold">
      {commit.message}
    </span>
    <div className="flex items-center gap-2">
      <Avatar name={commit.author} size={AvatarSize.Sm} />
      <span className="text-label-sm text-on-surface-variant">
        {commit.author}
      </span>
    </div>
  </button>
);

export default CommitListItem;
