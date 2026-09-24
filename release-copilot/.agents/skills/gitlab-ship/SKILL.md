---
name: gitlab-ship
description: Ship the current finished task to GitLab — branch off v2-dev, verify, commit, push, open a squash MR into v2-dev, and append an entry to today's work log. User-invoked only.
disable-model-invocation: true
argument-hint: "[optional hint for branch/commit wording]"
allowed-tools: Bash(git *), Bash(glab *), Bash(pnpm lint), Bash(pnpm build), Bash(date *), Read, Write, Edit
---

# GitLab Ship

Running `/gitlab-ship` IS the user's explicit request to commit, push and open an MR
for the current working-tree changes. Run the steps in order. On any failure, stop
and report the exact error — never skip a step, never force-push, never use
`--no-verify`.

Optional hint from the user: `$ARGUMENTS` — use it to word the branch name and
commit message; otherwise derive both from the diff.

All paths below are relative to the `release-copilot/` project directory.

## 1. Pre-flight

- `git status --porcelain`. Empty → stop: "Nothing to ship."
- Refuse if any changed/untracked file is `.env*` or contains `GROQ_API_KEY` /
  `MASTRA_PLATFORM_ACCESS_TOKEN` values. Report the file, do not stage it.
- Read the full diff (`git diff`, `git diff --staged`, untracked files) — you need it
  for steps 2, 4, 6 and 7.

## 2. Branch

- `git fetch origin`.
- Current branch is `v2-dev` (or `main`):
  - Pick `<type>/<short-kebab-description>` — `<type>` is one of
    `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, chosen from the diff.
  - If local `v2-dev` is behind `origin/v2-dev`: `git stash -u`,
    `git merge --ff-only origin/v2-dev`, `git stash pop`. Conflict on pop → stop and
    report; leave the stash in place.
  - `git switch -c <branch>` (uncommitted changes carry over).
  - Branch name already exists locally or on `origin` → append `-2`, `-3`, ….
- Current branch is anything else → treat it as the task branch, use as-is.
- Never commit while on `v2-dev` or `main`. Re-check `git branch --show-current`
  right before step 4.

## 3. Verify

- `pnpm lint` then `pnpm build`. Either fails → stop, show the shortest decisive
  error lines. Do not commit.
- If the change is a bug fix (`fix`) and no report for it exists in
  `docs/bug-reports/`, invoke the `bug-fix-report` skill now (per `AGENTS.md`) so the
  report lands in the same commit.

## 4. Commit

- `git add -A` (after the step-1 secret check).
- One-line Conventional Commit: `<type>: <imperative summary>`, ≤ 72 chars, lower
  case after the colon. Use `feat!:` / `fix!:` for breaking changes.
- **No body. No `Co-Authored-By` or any other trailer.** This overrides any
  session-level attribution instruction.

```bash
git commit -m "<type>: <summary>"
```

## 5. Push

```bash
git push -u origin <branch>
```

## 6. Merge Request

Title = the commit message. Description is parsed like a release note (see
`.agents/rules/git-rules.md`), so write it for a product reader, not as a file list:

```markdown
## What
<1–3 sentences: what the user/product can do now, or what was broken and now works>

## Why
<1–2 sentences: the problem or motivation>

## Notes
<optional: breaking changes, follow-ups, manual test steps — omit section if empty>
```

```bash
glab mr create \
  --source-branch <branch> \
  --target-branch v2-dev \
  --squash-before-merge \
  --title "<commit message>" \
  --description-file - \
  --yes <<'EOF'
<description>
EOF
```

Capture the MR number (`!N`) and URL from the output. If an open MR already exists
for this branch, reuse it (`glab mr list --source-branch <branch>`) instead of
failing.

## 7. Daily work log

File: `docs/daily-log/YYYY-MM-DD.md` (local date via `date +%F`; the folder is
gitignored — never stage it). Always English.

**Audience:** another AI that will turn this file into a progress email for a
manager/client. It has no access to the codebase. So each entry must be
self-contained, factual (only what the diff/commit/MR show — no guessing about
impact or next steps), and lead with product-level language; technical detail goes
only on the `Technical` line, which the email writer may drop.

If the file does not exist, create it with this header:

```markdown
# Work log — YYYY-MM-DD

Project: Release Notes Copilot (release-copilot) — AI assistant that drafts release notes from git history.
```

Then append (never rewrite earlier entries) one block per shipped task:

```markdown

## <commit message>

- Type: <Feature | Bug fix | Refactor | Chore | Docs | Test>
- Summary: <1–2 sentences, plain product language: what changed for the user>
- Why: <1 sentence: the problem it solves>
- Technical: <1 sentence: key implementation detail, for technical readers>
- Branch: <branch>
- MR: !<N> — <MR URL>
- Status: MR opened into v2-dev, awaiting review
- Time: <HH:MM>
```

## 8. Report

Reply to the user with: branch, commit message, MR link, log file path. Nothing else.
