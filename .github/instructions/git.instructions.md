---
description: Commit Message Instructions
---

# Commit Message Instructions

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

## Formatting

Pre-commit hooks automatically format staged files so you never commit inconsistent styles.

- **Frontend & Docs**: Prettier runs on staged JavaScript, TypeScript, Markdown, JSON, and stylesheet files.
- **Backend (.NET)**: CSharpier formats staged C# files.

To format everything manually:

```bash
npm run format
```

To verify formatting without making changes:

```bash
npm run format:check
```

---

## TL;DR

Use Conventional Commits with clear, imperative subjects. Explain the _why_ in the body. Link issues. Mark breaking changes. Prefer one logical change per commit. Use the prompts above to get high‑quality suggestions from Copilot and then edit for accuracy.
