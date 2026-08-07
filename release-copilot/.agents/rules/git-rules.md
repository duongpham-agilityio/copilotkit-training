# Git Rules

## MUST

- No direct commits to `main`. All work lands via a feature branch + PR, including
  solo/agent work.
- Commits follow Conventional Commits — same grammar this project's own classifier
  parses (see `release-notes-copilot` skill):
  - `feat:` / `feat!:` — new user-facing capability
  - `fix:` / `fix!:` — bug fix
  - `chore:`, `docs:`, `refactor:`, `test:` — non-user-facing, excluded from release
    notes
  - `!` after the type, or a `BREAKING CHANGE:` footer, marks a breaking change
  - Not enforced by tooling (no commitlint/husky) — self-discipline + review. A bad
    commit message here means this app would mis-classify its own history.
- No force-push to `main`. Force-push to your own feature branch is fine.
- Never commit `.env` or any file containing `GROQ_API_KEY` /
  `MASTRA_PLATFORM_ACCESS_TOKEN`.

## SHOULD

- Branch naming: `<type>/<short-description>` — e.g. `feat/pr-title-parser`,
  `fix/appstore-char-limit`, `chore/eslint-config`. `<type>` matches the commit-type
  list above.
- Rebase, don't merge, to keep a branch current with `main` before opening/updating a
  PR. Squash-merge the PR itself so `main` gets one commit per PR.
- PR description matters — it's parsed the same way a commit body is (see PR
  classification rules in `release-notes-copilot`). Write it like a release note, not
  a changelog dump.
