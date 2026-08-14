import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import MonoTag from '@/components/common/MonoTag.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';
import type { Platform } from '@/types/platform.ts';

interface LivePreviewPanelProps {
  markdown: string | null;
  platform: Platform;
  onPlatformChange: (platform: Platform) => void;
  onCopy: () => void;
}

const LivePreviewPanel = ({
  markdown,
  platform,
  onPlatformChange,
  onCopy,
}: LivePreviewPanelProps) => (
  <Card emphasis={CardEmphasis.Outlined}>
    <Card.Header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-headline-md text-on-surface font-semibold">
            Live Preview
          </span>
          <MonoTag>RELEASE_NOTES.md</MonoTag>
        </div>
        <div className="flex items-center gap-3">
          <PlatformTabs value={platform} onChange={onPlatformChange} />
          <Button
            variant={ButtonVariant.Ghost}
            className="border-primary border"
            onClick={onCopy}
            disabled={!markdown}
          >
            Copy
          </Button>
        </div>
      </div>
    </Card.Header>
    <MarkdownPreview markdown={markdown} />
  </Card>
);

export default LivePreviewPanel;
