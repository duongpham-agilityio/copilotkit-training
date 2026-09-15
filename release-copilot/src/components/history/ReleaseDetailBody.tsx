import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import MarkdownPreview from '@/components/release-notes/MarkdownPreview.tsx';
import type { ReleaseSummary } from '@/types/release.ts';

interface ReleaseDetailBodyProps {
  release: ReleaseSummary;
  markdown: string | null;
}

const ReleaseDetailBody = ({ release, markdown }: ReleaseDetailBodyProps) => (
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
  </Card>
);

export default ReleaseDetailBody;
