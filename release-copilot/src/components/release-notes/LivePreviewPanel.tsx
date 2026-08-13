import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';

interface LivePreviewPanelProps {
  markdown: string;
  onExport: () => void;
}

const LivePreviewPanel = ({ markdown, onExport }: LivePreviewPanelProps) => (
  <Card emphasis={CardEmphasis.Outlined}>
    <Card.Header>
      <div className="flex items-center justify-between">
        <span className="text-headline-md text-on-surface font-semibold">
          Preview
        </span>
        <Button variant={ButtonVariant.Primary} onClick={onExport}>
          Export
        </Button>
      </div>
    </Card.Header>
    <MarkdownPreview markdown={markdown} />
  </Card>
);

export default LivePreviewPanel;
