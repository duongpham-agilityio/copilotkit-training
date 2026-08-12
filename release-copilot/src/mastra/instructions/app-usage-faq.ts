export const APP_USAGE_FAQ = `# App Usage FAQ

## Input sources

Paste either raw \`git log\` output or a PR title (optionally with a description) into
the chat. Both feed the same classification pipeline; only the parsing step differs.

## Commit selection

After classification, every entry appears in a commit list (author, relative
timestamp, hash, Feature/Fix/Breaking badge) with filter tabs (All/Feat/Fix) and a
per-entry checkbox. Only checked entries are used for drafting. Unchecking a commit
removes it from the pipeline entirely, not just from display. Changing the selection
after a draft already exists marks that draft as outdated — it does not redraft
automatically; ask again to regenerate it.

## Copy and export

The rendered draft for each platform can be copied with one click, or exported to
Markdown (\`.md\`), plain text (\`.txt\`), or JSON (structured, machine-readable). Export
always operates on the currently generated draft — it doesn't re-run classification.

## Platform character limits

- GitHub: no limit
- App Store/TestFlight: 4000 characters
- Google Play: 500 characters`;
