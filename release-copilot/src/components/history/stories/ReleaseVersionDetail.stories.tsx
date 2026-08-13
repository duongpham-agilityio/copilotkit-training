import type { Meta, StoryObj } from '@storybook/react-vite';
import ReleaseVersionDetail from '../ReleaseVersionDetail.tsx';
import { ReleaseStatus, type ReleaseSummary } from '@/types/release.ts';
import { Platform } from '@/types/platform.ts';

const meta: Meta<typeof ReleaseVersionDetail> = {
  component: ReleaseVersionDetail,
  title: 'history/ReleaseVersionDetail',
};

export default meta;

type Story = StoryObj<typeof ReleaseVersionDetail>;

const RELEASE: ReleaseSummary = {
  version: 'v2.4.0',
  status: ReleaseStatus.Published,
  title: 'Custom commit types',
  date: '2026-08-13',
  featCount: 4,
  fixCount: 2,
};

const NOTES_BY_PLATFORM: Record<Platform, string> = {
  [Platform.Github]: `## Features

- Add \`PlatformTabs\` component for selecting release destinations
- Support custom commit-type prefixes like \`hotfix:\`

## Fixes

- Fix App Store character-limit truncation on export
`,
  [Platform.AppStore]: `New:
- Select the destination platform right from the release notes editor
- Custom commit prefixes like "hotfix:" are now recognized

Fixed:
- App Store character-limit truncation on export
`,
  [Platform.GooglePlay]: `Select release destinations and use custom commit prefixes like "hotfix:". Fixed character-limit truncation on export.`,
};

export const Default: Story = {
  args: {
    release: RELEASE,
    notesByPlatform: NOTES_BY_PLATFORM,
    onCopy: () => {},
  },
};
