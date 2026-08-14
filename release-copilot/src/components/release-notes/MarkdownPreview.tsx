import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/cn';

interface MarkdownPreviewProps {
  markdown: string | null;
}

const MarkdownPreview = ({ markdown }: MarkdownPreviewProps) => {
  if (!markdown) {
    return (
      <p className="text-body-md text-on-surface-variant">
        No content yet — ask Copilot to draft release notes from the selected
        commits.
      </p>
    );
  }

  return (
    <div
      className={cn(
        '[&_h1]:text-headline-lg [&_h1]:mb-4 [&_h1]:font-semibold',
        '[&_h2]:text-headline-md [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:font-semibold',
        '[&_p]:text-body-md [&_p]:text-on-surface [&_p]:mb-3',
        '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_li]:text-body-md [&_li]:text-on-surface',
        '[&_code]:text-label-sm [&_code]:bg-surface-container [&_code]:rounded [&_code]:px-1 [&_code]:font-mono',
      )}
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
