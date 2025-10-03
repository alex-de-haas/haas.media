# Commit Message Instructions (for humans & GitHub Copilot)

> Put this file at the repo root as `instructions.md`. It defines how we write commit messages and how to prompt GitHub Copilot to generate good ones.

---

## Goals

- Make history easy to scan, search, and revert.
- Communicate _why_ a change exists, not just _what_ changed.
- Keep messages consistent and machine‑friendly (release notes, changelogs, CI rules).

---

## Conventional Commits (required)

We follow **Conventional Commits 1.0**:

```
<type>(<optional scope>): <subject>

<body>

<footer>
```

**Types** (choose one): `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `revert`.

**Scopes**: small, lowercase nouns that group the change (examples for this repo type): `api`, `ui`, `db`, `infra`, `auth`, `logging`, `http`, `cli`, `ci`, `nuget`, `ef`, `mapper`, `serialization`.

**Subject**: imperative, ≤ 72 chars, no period. Examples: `add`, `fix`, `remove`, `update`, `refactor`.

**Body**: free‑form paragraphs (wrap at \~100 col) explaining motivation, approach, and trade‑offs. Include benchmarks or links if relevant.

**Footer**: issue links and trailers.

- Closing keywords: `Fixes #123`, `Closes #456` (auto‑closes in GitHub).
- `BREAKING CHANGE: <description>` for breaking API/behavior.
- `Co-authored-by: Name <email>` for pair/mob sessions.

---

## Style Guide (strongly enforced)

- **Imperative mood**: “add”, “fix”, “remove”, not “added/adding”.
- **One logical change per commit**. Split refactors from behavior changes.
- **Avoid noise**: no `WIP`, no “minor changes”, no emoji prefixes.
- **Be specific**: reference symbols when useful (`FooService`, `OrderController.Post`).
- **Security**: do not include secrets, tokens, or stack traces with sensitive data.
- **English only.**

---

## Examples

**Feature**

```
feat(api): add pagination to GET /orders

Implements cursor-based pagination using createdAt + id for stable ordering.
Adds `next` and `prev` cursors to response. Keeps default page size 50.

Fixes #342
```

**Fix**

```
fix(auth): handle null principal in JwtMiddleware

Return 401 when token validation yields no principal instead of 500.
Adds unit tests for malformed tokens.

Closes #518
```

**Refactor**

```
refactor(db): extract UnitOfWork from repositories

Reduces duplication and simplifies transaction boundaries.
No behavior change.
```

**Breaking change**

```
feat(api): replace offset pagination with cursors

BREAKING CHANGE: removes `page` and `pageSize` query params; use `cursor` instead.
```

**Revert**

```
revert: feat(api): replace offset pagination with cursors

This reverts commit abcdef1 because of downstream contract breakage.
```

---

## Copilot prompts (copy/paste)

> Use these in your commit editor when Copilot is enabled, or in the CLI (`gh copilot`) prompt.

**Generate a message from the staged diff (preferred):**

```
Generate a Conventional Commit message. Use one of: feat, fix, refactor, perf, docs, test, build, ci, chore, revert.
Scope with a short noun if possible. Subject ≤ 72 chars, imperative.
Body: 1–3 paragraphs: motivation, approach, side-effects. Mention tests.
If behavior changes compat, add BREAKING CHANGE in footer.
If issues are referenced in code or branch name, include Fixes/Closes.
Only describe what’s in the diff. No generic fluff.
```

**Generate a message for a bugfix:**

```
Write a Conventional Commit for a bugfix in <scope>. Include root cause, why previous behavior was wrong, and how the fix was validated.
```

**Summarize multiple staged files into one message:**

```
Summarize this diff into one Conventional Commit. If multiple unrelated changes are present, suggest how to split them.
```

**.NET‑specific detail (optional):**

```
When code touches C#/.NET: mention affected types/methods (namespaces), DI registrations, async/await behavior, nullable annotations, EF Core migrations, and public API deltas.
```

---

## Commit Template (optional but recommended)

Create a global or repo commit template (e.g., `.gitmessage.txt`) and point Git to it:

```bash
git config commit.template .gitmessage.txt
```

**.gitmessage.txt**

```
<type>(<scope>): <subject>

# Motivation
#
# What is the problem or user story?

# Approach
#
# How did you solve it? Alternatives considered?

# Validation
#
# Tests added/updated, manual steps, perf impact.

# Footers (uncomment as needed)
# Fixes #123
# Closes #123
# BREAKING CHANGE: <explain>
# Co-authored-by: Name <email>
```

---

## Pre‑commit Checklist

- ***

## Useful Hooks (optional)

Add a `commit-msg` hook to enforce the format (example using a simple regex):

`.git/hooks/commit-msg`

```bash
#!/usr/bin/env bash
msgFile="$1"

# Basic check: type(scope): subject
if ! grep -E -q '^(feat|fix|refactor|perf|docs|test|build|ci|chore|revert)(\([a-z0-9._-]+\))?: .{1,72}$' "$msgFile"; then
  echo "Commit message must match Conventional Commits and subject ≤72 chars" >&2
  echo "Example: feat(api): add pagination" >&2
  exit 1
fi

exit 0
```

Make it executable: `chmod +x .git/hooks/commit-msg`.

---

## FAQ

**Q: Can I squash merge?** Yes. Keep individual commits clean anyway; they help code review and bisect.

**Q: Emoji?** Not in the subject. If you insist, put them in the body only when they add clarity (rare).

**Q: Multiple types in one commit?** Choose the primary intent. If you need two types, likely split the commit.

---

## TL;DR

Use Conventional Commits with clear, imperative subjects. Explain the _why_ in the body. Link issues. Mark breaking changes. Prefer one logical change per commit. Use the prompts above to get high‑quality suggestions from Copilot and then edit for accuracy.
