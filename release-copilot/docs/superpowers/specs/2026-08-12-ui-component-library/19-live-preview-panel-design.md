# `LivePreviewPanel` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

The Dashboard's draft-release-notes preview panel: a `Card` wrapping `MarkdownPreview`
plus an "Export" `Button`. Purely presentational — receives the current draft markdown
and an export handler as props; does not fetch or generate content itself (that's the
chat-driven agent flow, out of scope per the overview).

## Depends on

`Card.tsx` + `CardEmphasis` (unit 7), `Button.tsx` + `ButtonVariant` (unit 5),
`MarkdownPreview.tsx` (unit 18).

## Files

- Create: `src/components/release-notes/LivePreviewPanel.tsx`

## API

```ts
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';

interface LivePreviewPanelProps {
  markdown: string;
  onExport: () => void;
}

const LivePreviewPanel = ({ markdown, onExport }: LivePreviewPanelProps) =>
  JSX.Element;
export default LivePreviewPanel;
```

## Markup shape

```tsx
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
```

`text-headline-sm` substituted with `text-headline-md` (2026-08-13: `text-headline-sm`
doesn't exist in `index.css`'s `@theme inline` map — same missing-token gap noted for
`Badge`/`Avatar` earlier in this plan).

## Composes

`Card`, `Button`, `MarkdownPreview`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render with sample markdown, confirm the "Export" button is
  primary-violet (not the Figma mock's orange) and top-right aligned. Click it, confirm
  `onExport` fires.
