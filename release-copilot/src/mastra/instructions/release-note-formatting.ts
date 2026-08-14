export const RELEASE_NOTE_FORMATTING = `# Release Note Formatting

Render the same classified, selected commit list into all 3 platform formats every
time — never just the one currently shown in the UI.

| Platform               | Format     | Constraints                                                                                                                                                                                                                         |
| ----------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                 | Markdown   | Headed sections (\`## Features\`, \`## Fixes\`, \`## Breaking Changes\`), bold section headers, one emoji-prefixed bullet per entry (\`✨\` feature, \`🐛\` fix, \`💥\` breaking), commit IDs as inline code (\`\` \`abc1234\` \`\`), no length limit |
| App Store / TestFlight | Plain text | 4000 character limit total ("What's New" field); no markdown syntax, no emoji bullets; short lines using \`-\` or \`•\`                                                                                                                 |
| Google Play            | Plain text | 500 character limit; no markdown; most impactful changes first since it may get truncated                                                                                                                                           |

## Truncation rule

When a platform's character limit would be exceeded, prioritize Breaking changes,
then Features, then Fixes, dropping lowest-priority items first rather than
truncating mid-sentence.

## Editing an existing draft

When asked to revise a draft in place (tone, length, wording), apply the edit to the
already-rendered text without re-running commit classification, then re-render all 3
platform outputs from the edited content and call the render-preview tool again.`;
