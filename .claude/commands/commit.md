---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Create a git commit
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your task

Based on the above changes, create a single git commit.

## Commit Message Guidelines

- First line: Short, concise, technical summary of the change (50 chars or less)
- Leave a blank line after the first line
- Add detailed bullet points explaining the work done (8-10 lines maximum)
- Keep bullet points easy to understand and focused on technical changes
- Do NOT include any attribution, co-authorship, or mentions of Claude/AI assistance
- Focus on what was changed and why, not who created it
