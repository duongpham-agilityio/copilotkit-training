# `MarkdownPreview` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Renders release-notes markdown with `theme.md`'s own type scale — no
`@tailwindcss/typography` (`prose`), per the overview's out-of-scope note. Styles
markdown elements directly via Tailwind arbitrary child-selector variants so only
already-registered theme tokens are used.

## Files

- Create: `src/components/release-notes/MarkdownPreview.tsx`

## API

```ts
import ReactMarkdown from 'react-markdown';

interface MarkdownPreviewProps {
  markdown: string;
}

const MarkdownPreview = ({ markdown }: MarkdownPreviewProps) => JSX.Element;
export default MarkdownPreview;
```

Uses the already-installed `react-markdown` dependency (`package.json`) — no new
package.

## Markup

```tsx
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
```

## Composes

`cn`, `react-markdown` (existing dependency).

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render markdown with an `h1`, `h2`, a paragraph, a bullet list,
  and inline `` `code` ``. Confirm each element uses the `theme.md` type-scale token
  (not browser default `h1`/`h2`/`ul` styling) and inline code renders in
  `font-mono`.
