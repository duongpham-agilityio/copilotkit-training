import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton from '@/components/common/CopyButton.tsx';
import MonoTag from '@/components/common/MonoTag.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';

interface LivePreviewPanelProps {
  markdown: string | null;
  onCopy: () => void;
}

const LivePreviewPanel = ({ markdown, onCopy }: LivePreviewPanelProps) => (
  <Card emphasis={CardEmphasis.Outlined}>
    <Card.Header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-headline-md text-on-surface font-semibold">
            Live Preview
          </span>
          <MonoTag>RELEASE_NOTES.md</MonoTag>
        </div>
        <CopyButton
          variant={ButtonVariant.Ghost}
          className="border-primary border"
          onCopy={onCopy}
          disabled={!markdown}
        />
      </div>
    </Card.Header>
    <MarkdownPreview markdown={markdown} />
  </Card>
);

export default LivePreviewPanel;
