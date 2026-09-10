import { Calendar } from 'lucide-react';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import { cn } from '@/lib/cn.ts';
import type { ReleaseSummary } from '@/types/release.ts';

interface ReleaseHistoryListItemProps {
  release: ReleaseSummary;
  isLatest: boolean;
  onSelect: (version: string) => void;
}

const ReleaseHistoryListItem = ({
  release,
  isLatest,
  onSelect,
}: ReleaseHistoryListItemProps) => (
  <Card
    emphasis={CardEmphasis.Outlined}
    onClick={() => onSelect(release.version)}
    className={cn(
      'flex flex-col gap-1 rounded-lg p-4.25',
      isLatest && 'border-primary bg-primary/5',
    )}
  >
    <div className="flex items-center justify-between">
      <span
        className={cn(
          'text-headline-md',
          isLatest
            ? 'text-primary font-bold'
            : 'text-on-surface font-semibold',
        )}
      >
        {release.version}
      </span>
      {isLatest && (
        <span className="bg-primary text-on-primary text-label-mono-xs rounded-full px-2 py-0.5 font-mono font-bold tracking-wide uppercase">
          Latest
        </span>
      )}
    </div>
    <div className="text-body-md text-on-surface-variant">
      {release.title}
    </div>
    <div className="text-label-sm text-outline flex items-center gap-1">
      <Calendar className="size-3.5" />
      {release.date}
    </div>
  </Card>
);

export default ReleaseHistoryListItem;
