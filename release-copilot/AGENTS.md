# AGENTS.md

## CRITICAL: Load `mastra` skill first

Load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — APIs change between versions.

## Load `release-notes-copilot` skill for domain work

For git-log/PR classification rules, per-platform formatting rules, or deciding which
folder new code belongs in, load the `release-notes-copilot` skill.

## Rules

@.agents/rules/code-style.md
@.agents/rules/conventions.md
@.agents/rules/git-rules.md

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
