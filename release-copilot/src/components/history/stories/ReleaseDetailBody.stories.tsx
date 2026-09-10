import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseDetailBody from '../ReleaseDetailBody.tsx';
import { ReleaseStatus, type ReleaseSummary } from '@/types/release.ts';

const meta: Meta<typeof ReleaseDetailBody> = {
  component: ReleaseDetailBody,
  title: 'history/ReleaseDetailBody',
};

export default meta;

type Story = StoryObj<typeof ReleaseDetailBody>;

const RELEASE: ReleaseSummary = {
  id: 'release-1',
  version: 'v2.4.0',
  status: ReleaseStatus.Published,
  title: 'Custom commit types',
  date: '2026-08-13',
  featCount: 4,
  fixCount: 2,
};

const MARKDOWN = `This release focuses on significant performance enhancements across the core platform, alongside several highly requested UI refinements to the dashboard.

### 🚀 New Features

- Introduced a new 'Dark Mode' toggle in user settings.
- Added bulk export functionality for historical release notes.
- Integrated preliminary support for webhook notifications on deployment.

### ✨ Improvements

- Optimized dashboard loading times by 40% using lazy loading for historical data.
- Refined the visual contrast of primary action buttons for better accessibility.
- Updated underlying typography tokens for better readability on smaller tablet screens.

### 🐛 Bug Fixes

- Resolved an issue where markdown preview would occasionally fail to render bullet points correctly.
- Fixed a race condition during authentication that caused intermittent login failures.
`;

export const Default: Story = {
  args: {
    release: RELEASE,
    markdown: MARKDOWN,
  },
};

export const NoContent: Story = {
  args: {
    release: RELEASE,
    markdown: null,
  },
};
