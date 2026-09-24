---
name: github-sync
description: Sync GitLab's v2-dev to the GitHub deploy repo — push v2-dev to GitHub, open a PR v2-dev → practice-one, and merge it. User-invoked only.
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *), Bash(command -v gh), Bash(date *)
---

# GitHub Sync

Running `/github-sync` IS the user's explicit request to push to GitHub and merge the
deploy PR. Source of truth is GitLab (`origin`); GitHub (`github`,
`duongpham-agilityio/copilotkit-training`) only mirrors it for deploy.

```
origin/v2-dev ──push──▶ github/v2-dev ──PR + merge──▶ github/practice-one (deploy)
```

On any failure, stop and report the exact error. **Never force-push. Never push to
`practice-one` directly.** No work log entry for this skill.

## 1. Fetch

```bash
git fetch origin
git fetch github
```

## 2. Push v2-dev to GitHub (fast-forward only)

```bash
git push github origin/v2-dev:refs/heads/v2-dev
```

- Rejected as non-fast-forward → GitHub's `v2-dev` has commits GitLab doesn't. Stop,
  list them (`git log --oneline origin/v2-dev..github/v2-dev`), and ask the user.
- "Everything up-to-date" is fine — continue.

## 3. Anything to deploy?

```bash
git fetch github
git log --oneline github/practice-one..github/v2-dev
```

Empty → stop: "practice-one already has everything in v2-dev."
Otherwise keep this list — it becomes the PR body.

## 4. gh available?

```bash
command -v gh && gh auth status
```

Missing or not logged in → stop after the push and give the user the manual link:
`https://github.com/duongpham-agilityio/copilotkit-training/compare/practice-one...v2-dev`
plus a one-line hint: `brew install gh && gh auth login`.

## 5. Pull request

Always pass `--repo` — this checkout has two remotes and `gh` must not guess.

- Reuse an open PR if one exists:
  `gh pr list --repo duongpham-agilityio/copilotkit-training --base practice-one --head v2-dev --state open`
- Otherwise create one:

```bash
gh pr create \
  --repo duongpham-agilityio/copilotkit-training \
  --base practice-one \
  --head v2-dev \
  --title "sync: v2-dev → practice-one ($(date +%F))" \
  --body-file - <<'EOF'
Sync from GitLab v2-dev.

<one bullet per commit from step 3, merge commits excluded>
EOF
```

## 6. Merge

Use a **merge commit**, not squash or rebase — squashing would make `practice-one`
diverge from `v2-dev`, so every later sync PR would re-show old commits and conflict.

```bash
gh pr merge <number> --repo duongpham-agilityio/copilotkit-training --merge
```

Not mergeable (conflict / failing required checks) → stop and report the PR URL and
reason. Do not resolve conflicts on GitHub.

## 7. Report

Reply with: PR URL, merged yes/no, number of commits synced.
