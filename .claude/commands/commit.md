---
description: Stage all changed files and create a git commit
allowed-tools: Bash(git:*)
---

Stage all changed files and create a git commit following the repository's commit message conventions.

## Step 1: Gather Context

Run these in parallel:

- `git status` to see all untracked and modified files (never use `-uall`)
- `git diff` to see unstaged changes
- `git diff --cached` to see already-staged changes
- `git log --oneline -10` to see recent commit message style

## Step 2: Plan Commits

**Every changed file must be included in a commit — do not leave any files uncommitted.** Review all changed files and group them into logical commits. Each commit should represent a single coherent change (e.g., a feature, a bug fix, a refactor, a test addition). If all changes are closely related, a single commit is fine. If there are distinct logical groups, plan multiple commits and process each group through Steps 3–5 before moving to the next. Every file from `git status` must be assigned to exactly one commit group.

## Step 3: Stage Changes

Stage the files for the current commit. Prefer adding specific files by name rather than `git add -A`. Do not stage files that likely contain secrets (`.env`, credentials, etc.) — warn the user if any are present.

If there are no changes to stage and nothing already staged, inform the user and stop.

## Step 4: Draft Commit Message

Analyze the staged changes and draft a commit message following this repository's conventions:

- Use conventional commit format: `type: description`
- **Always include a suitable emoji** at the start of the description to visually categorize the change (e.g., `fix: 🐛 resolve null check in quiz flow`, `feat: ✨ add job-risk treemap`, `refactor: ♻️ extract error utility`, `test: ✅ add unit tests for auth service`, `docs: 📝 update type safety guidelines`, `ci: 🔧 add backend test job`)
- Common types from this repo: `fix`, `feat`, `refactor`, `docs`, `ci`, `test`
- Keep the first line concise (under 72 characters)
- Use imperative mood ("add" not "added")
- Focus on the "why" rather than the "what"

If `$ARGUMENTS` is provided, use it as guidance for the commit message.

## Step 5: Commit

Create the commit using a HEREDOC for the message:

```
git commit -m "$(cat <<'EOF'
<commit message>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Step 6: Repeat or Finish

If there are more commit groups planned in Step 2, return to Step 3 for the next group. Once all commits are done, run `git status` to confirm the working tree is clean (no uncommitted changes remain). If any changed files were missed, commit them now. Report all commit hashes to the user.
