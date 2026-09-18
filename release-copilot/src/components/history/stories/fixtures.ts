import { ReleaseSendStatus, type ReleaseHistoryItem } from '@/types/release.ts';

export const GITHUB_ITEM: ReleaseHistoryItem = {
  id: 'release-2:github',
  releaseId: 'release-2',
  version: 'v2.4.0',
  title: 'Faster changelog parsing',
  platformId: 'github',
  platformLabel: 'GitHub',
  sendStatus: ReleaseSendStatus.Sent,
  date: 'Sep 2, 2026',
  shortDate: 'Sep 2',
  monthLabel: 'September 2026',
  markdown: `## Performance

- Incremental changelog parsing \`4c2d9e1\`
- Cache resolved tags between runs \`e08f3a7\`

## Fixes

- Doubled entries when duplicate tags exist \`7b5a102\`
`,
};

export const APP_STORE_ITEM: ReleaseHistoryItem = {
  id: 'release-1:app-store',
  releaseId: 'release-1',
  version: 'v2.5.0',
  title: 'Slack digests & per-platform templates',
  platformId: 'app-store',
  platformLabel: 'App Store',
  sendStatus: ReleaseSendStatus.NotSent,
  date: 'Sep 16, 2026',
  shortDate: 'Sep 16',
  monthLabel: 'September 2026',
  markdown: `- Preview your release digest in Slack before it goes out.
- Send the digest to your team's channel in one click.
- Choose a template for App Store, Google Play, or GitHub.
`,
};

export const GOOGLE_PLAY_ITEM: ReleaseHistoryItem = {
  id: 'release-3:google-play',
  releaseId: 'release-3',
  version: 'v2.3.1',
  title: 'Hotfix for duplicate tags',
  platformId: 'google-play',
  platformLabel: 'Google Play',
  sendStatus: ReleaseSendStatus.Sent,
  date: 'Aug 26, 2026',
  shortDate: 'Aug 26',
  monthLabel: 'August 2026',
  markdown: 'Fixed a crash with duplicate tags. Steadier release range detection.',
};
