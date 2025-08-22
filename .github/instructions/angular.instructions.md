# Angular + GitHub Copilot: Practical Guide

This guide helps you use GitHub Copilot and Copilot Chat effectively on real-world Angular projects. It’s written for developers who want fast, reliable outcomes without losing control over code quality and security.

---

## 1) Prerequisites

- **GitHub Copilot subscription** (Individual, Business, or Enterprise).
- **Editor**: VS Code (recommended) or JetBrains IDEs (WebStorm, IntelliJ with Angular plugin).
- **Node.js**: Install LTS (use `nvm`/`fnm`).
- **Angular CLI**: `npm i -g @angular/cli`

> Verify:
```bash
node -v
npm -v
ng version
```

---

## 2) Install & Enable Copilot

### VS Code
1. Install **GitHub Copilot** and **GitHub Copilot Chat** extensions.
2. Sign in to GitHub → allow extension access.
3. Ensure **Copilot: Enabled** (status bar icon).
4. Optional: Install **GitHub Pull Requests & Issues** for PR reviews.

**Quick shortcuts**
- Trigger inline suggestion: <kbd>Tab</kbd> (accept) • <kbd>Esc</kbd> (dismiss) • <kbd>Alt/Option</kbd>+<kbd>[</kbd>/<kbd>]</kbd> (cycle).
- Open Chat: <kbd>Ctrl/Cmd</kbd>+<kbd>I</kbd> (inline chat) or sidebar chat icon.

### JetBrains (WebStorm/IntelliJ)
1. Settings → Plugins → search **GitHub Copilot** and **Copilot Chat**.
2. Sign in to GitHub → enable.
3. Use **⌥\** (Mac) or **Alt+\** (Win/Linux) to accept suggestions.

---

## 3) Project Setup Patterns Copilot Understands Well

Create a new project with strong defaults so Copilot completes consistently.

```bash
ng new acme-portal   --routing   --style=scss   --ssr=false   --standalone   --strict
cd acme-portal
ng add @angular-eslint/schematics
npm i -D prettier @trivago/prettier-plugin-sort-imports
```

**.editorconfig**
```ini
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

**.prettierrc**
```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "plugins": ["@trivago/prettier-plugin-sort-imports"],
  "importOrder": ["^@angular/(.*)$", "^rxjs(.*)$", "^@?\w", "^@app/(.*)$", "^[./]"]
}
```

**.eslintrc.json** (snippet)
```json
{
  "overrides": [
    {
      "files": ["*.ts"],
      "extends": [
        "plugin:@angular-eslint/recommended",
        "plugin:@angular-eslint/template/process-inline-templates"
      ],
      "rules": {
        "@angular-eslint/directive-selector": ["error", { "type": "attribute", "prefix": "app", "style": "camelCase" }],
        "@angular-eslint/component-selector": ["error", { "type": "element", "prefix": "app", "style": "kebab-case" }]
      }
    }
  ]
}
```

> These guardrails help Copilot generate code that passes lint and format checks automatically.

---

## 4) Prompting Patterns That Work

Copilot is strongest with **concrete context**. Show it where code will live and give constraints.

### A. Inline comment prompts (inside a file)
```ts
// Create a Standalone component that shows a paginated table of Users fetched from /api/users.
// Use HttpClient, OnPush change detection, RxJS switchMap, takeUntilDestroyed,
// skeleton loader while loading, and MatTable with mat-paginator. Include basic unit tests.
```

### B. Structured request in Copilot Chat
```
In src/app/users/users.component.ts:
- Standalone component
- Route: /users
- Fetch GET /api/users?page={page}&pageSize={size}
- Display table with name, email, createdAt
- Add search debounced by 300ms
- Use Signals for local UI state where helpful
- Provide spec using TestBed + HttpClientTestingModule
Return only the code blocks per file.
```

### C. “Constrain and critique” pattern
```
Goal: create a robust AuthService for JWT handling.
Constraints:
- Never store tokens in localStorage; use cookie with Secure, HttpOnly, SameSite=Lax
- Expose user$ as a signal for template binding
- Auto-refresh token with backoff; cancel on logout
- 100% typed; no any
After proposing code, critique potential race conditions or memory leaks.
```

### D. “Diff or patch” pattern
```
Modify existing UsersComponent to use MatTableDataSource with client-side sorting/filtering.
Show only the unified diff.
```

---

## 5) Angular-Specific Tips for Better Completions

- Prefer **standalone components** and **feature-based folders**. Copilot has fewer module wiring errors.
- Put **type-first APIs** up front (interfaces, types, enums). It learns your shapes and generates consistent code.
- Use **Angular CLI schematics** to scaffold first, then ask Copilot to fill logic/tests. Example:
  ```bash
  ng g c features/users/users --standalone --changeDetection OnPush
  ng g s features/users/users
  ```
- In templates, favor **`@if`/`@for`** (Angular v17+) to hint structure.
- For RxJS, name streams with `$` suffix and prefer `switchMap`, `shareReplay({refCount:true, bufferSize:1})`, `takeUntilDestroyed()`.
- Use **signals** for local UI state; continue **observables** for async data from services.
- Ask Copilot to add **`OnDestroy` + `takeUntilDestroyed()`** when creating long-lived subscriptions.
- Keep **`HttpClient` return types** explicit: `get<User[]>('/api/users')`.

---

## 6) Reliable Workflows

### Generate + Verify
1. Scaffold file or test shell.
2. Prompt Copilot inline with constraints.
3. **Run checks early**:
   ```bash
   npm run lint
   npm run test -- --watch=false
   npm run start
   ```
4. Ask Chat to **explain any ESLint violations** and propose minimal fixes.

### Unit & Component Tests
Prompts that nudge good Angular tests:
```
Create users.component.spec.ts using TestBed with Standalone component import,
HttpClientTestingModule, and a fake UsersService. Test loading state, data render,
error state, and paginator interaction.
```

### Commit Messages & PRs
- Use the chat command: “Generate a conventional commit message for the staged changes.”
- In PR description: “Summarize the diff, list risks, testing notes, and migration steps.”
- Ask Copilot Chat: “Review this PR focusing on performance and accessibility. Point to specific lines.”

---

## 7) Security & Privacy Defaults

- Prefer **cookie-based auth** with **HttpOnly** tokens; avoid storing secrets in the client.
- Sanitize any **`[innerHTML]`** usage; ask Copilot to add `DomSanitizer` only when necessary.
- Validate all inputs and **strip unknown fields** at boundaries.
- Never paste proprietary code into public prompts outside your editor. In VS Code, keep **“Allow suggestions from public code”** disabled if required by policy.
- Review licenses: if Copilot shows **verbatim code** from popular repos, **reject** it and request an original implementation.

---

## 8) Performance & Accessibility Prompts

**Performance**
```
Optimize UsersComponent for large lists:
- OnPush, trackBy functions
- Virtual scroll via CDK
- Avoid nested async pipes
- Memoize derived data with computed() signals
Provide before/after profile notes.
```

**Accessibility**
```
Audit the UsersComponent for WCAG 2.2 AA:
- ARIA roles, labels for table & paginator
- Keyboard navigation
- Color contrast suggestions
Return a checklist and code diffs.
```

---

## 9) Example End-to-End Prompt Set

1. Scaffold:
   ```bash
   ng g c features/users/users --standalone --changeDetection OnPush
   ng g s features/users/users
   ng g interceptor core/auth/auth
   ```
2. Services + models:
   ```
   Create User model and UsersService with typed methods (list, get, create).
   Use HttpClient, map DTOs to domain types, centralize API url in environment.
   Include unit tests with HttpTestingController.
   ```
3. Component + template:
   ```
   Implement UsersComponent with debounced search, server paging, error handling.
   Use MatTable + MatPaginator + skeleton loaders. Provide spec.
   ```
4. Routing:
   ```
   Add route /users guarded by AuthGuard. Show auth flow in app.routes.ts.
   ```
5. PR polish:
   ```
   Generate commit message and PR body with risks & testing steps.
   ```

---

## 10) Troubleshooting Prompts

- “Explain this TypeScript error and fix it without using `any`: `<error message>`.”
- “Refactor to remove memory leaks and use `takeUntilDestroyed()`.”
- “Why is change detection not updating after HTTP? Provide minimal repro and fix.”
- “Convert this RxJS pipeline to signals while keeping testability.”

---

## 11) Minimal Copilot Settings (VS Code)

**settings.json** (project or user)
```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "markdown": true
  },
  "github.copilot.inlineSuggest.enable": true,
  "github.copilot.editor.enableAutoCompletions": true,
  "github.copilot.chat.enabled": true,
  "editor.inlineSuggest.enabled": true
}
```

> Keep Markdown and YAML completions **on** to speed up CI, configs, and docs.

---

## 12) Keep It Human-in-the-Loop

- Treat Copilot as an **accelerator**, not an authority.
- Keep prompts **specific**, **constrained**, and **typed**.
- Always run **tests and linters** before accepting large suggestions.
- Prefer **small, iterative** generations over one giant ask.

---

### Appendix: Handy Angular Snippets for Copilot to Learn

**Typed API response**
```ts
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

**Destroy signal helper (Angular 16+)**
```ts
import { inject, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

export abstract class Destroyable implements OnDestroy {
  protected readonly destroy$ = new Subject<void>();
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
```

**HTTP error handler**
```ts
import { HttpErrorResponse } from '@angular/common/http';
export function toUserMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return err.error?.message ?? `HTTP ${err.status}`;
  }
  return 'Unexpected error';
}
```

---

**Enjoy the speed-up, but keep your standards high.** 🚀
