import {
  APP_STORE_CHARACTER_LIMIT,
  GOOGLE_PLAY_CHARACTER_LIMIT,
} from '../../constants/config/lib-config';

export const RELEASE_NOTE_FORMATTING = `# Release Note Formatting

Render the same classified, selected commit list into GitHub, App Store, and Google
Play every time a draft is requested — never just the one currently shown in the UI.
Only add an entry to \`platforms\` when the user named a destination outside those
three; it is never a default output. Never write a title line in any of them; the app
prepends it (see Release date and title above).

## Section order — all platforms

Breaking changes first, then Features, then Fixes. **Omit any section that has no
entries** — never print an empty heading, "None", or "N/A".

## GitHub (Markdown, no length limit)

- Section headings exactly: \`## 💥 Breaking Changes\`, \`## ✨ Features\`, \`## 🐛 Fixes\`
- One bullet per entry, starting with an imperative verb, commit ID as inline code in
  parentheses at the end of the bullet. A Features section looks exactly like this:

      ## ✨ Features

      - Add JSON export for release notes (\`abc1234\`)
      - Support filtering the commit list by author (\`def5678\`)

- Emoji belong in the section headings, not on every bullet

## App Store / TestFlight (plain text, ${APP_STORE_CHARACTER_LIMIT} characters total)

- No markdown, no emoji, no \`#\`, \`*\`, or backticks — the store shows them literally
- **No commit hashes, no PR numbers, no file/module/branch names.** This text is read
  by end users, not by developers
- Rewrite each entry as the user-visible outcome rather than copying the commit
  message: \`fix: null deref in export worker\` becomes "Fixed a crash when exporting
  large files"
- One short line per change, prefixed with \`- \` or \`• \`; a one-sentence summary line
  before the list is fine
- Group by theme when it reads better than by commit type

## Google Play (plain text, ${GOOGLE_PLAY_CHARACTER_LIMIT} characters total)

- Same plain-text and no-jargon rules as App Store
- Most impactful change first — Play truncates the rest
- 3 to 5 lines at most; brevity beats completeness here

## Dynamic platforms (Slack, Discord, a customer email, etc.)

Only produced when the user explicitly names a destination other than GitHub, App
Store, or Google Play — for example "also make a Slack version" or "draft one for the
customer newsletter". Add one entry to \`platforms\` per requested destination:

- \`platformId\`: kebab-case, e.g. \`slack\`, \`discord\`, \`email-customer\`,
  \`changelog\`. Never use \`github\`, \`app-store\`, or \`google-play\` here — those
  three always go in their own dedicated fields above, never in this array.
- \`label\`: the display name the user would recognize, e.g. "Slack", "Customer
  Email".
- \`body\`: same content rules as App Store/Google Play (plain text, no markdown, no
  commit hashes, user-facing wording) unless the destination's own nature calls for
  something else — a "changelog" entry may keep Markdown, since that platform reads
  as a changelog page, not a notification. Never write a title line — the app
  prepends it, same as every other platform.
- \`characterLimit\`: set only if the user states one for that destination. Leave it
  unset otherwise — the app already enforces its own limits for platforms it knows
  about (Slack, X/Twitter) regardless of what is sent here.

## Fitting a character limit

Shorten before dropping. In order:

1. Tighten each line to its user-facing essence — drop qualifiers, merge near-duplicate
   entries into one line.
2. Only if it still doesn't fit, drop whole entries, lowest priority first (Fixes,
   then Features, then Breaking changes).
3. Never truncate mid-sentence, and never emit a body that exceeds the limit — the
   draft tool rejects it and the turn is wasted.

## Editing an existing draft

When asked to revise the current draft (tone, length, wording), apply the edit to the
draft already in your context without re-running commit classification, then re-render
all 3 platform bodies from the edited content within their limits.`;
