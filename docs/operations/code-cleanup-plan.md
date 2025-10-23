# Code Cleanup Plan

> **Created:** October 23, 2025  
> **Status:** Planning  
> **Related:** `/docs/CODE-CLEANUP-REVIEW.md`

## Overview

This document provides a structured, prioritized plan for executing the code cleanup identified in CODE-CLEANUP-REVIEW.md. It focuses on actionable steps, validation procedures, and rollback strategies.

## Guiding Principles

1. **Safety First:** Back up before making changes, verify after each phase
2. **Incremental Progress:** Complete one phase before moving to the next
3. **Test Coverage:** Run tests after each significant change
4. **Documentation:** Update docs as code changes

## Phase 1: Quick Wins (Low Risk)

**Estimated Time:** 1-2 hours  
**Risk Level:** ✅ Low  
**Prerequisites:** None

### 1.1 Remove Deprecated Token Endpoint

**Files to Delete:**
- `/src/Haas.Media.Web/app/api/token/route.ts`

**Files to Update:**
```
/docs/frontend/video-player-troubleshooting.md
/docs/frontend/AUTHENTICATION-COMPLETE-GUIDE.md
```

**Actions:**
1. Delete the deprecated endpoint file
2. Search for `/api/token` references in docs
3. Update references to use `getValidToken()` from `lib/auth/token.ts`
4. Verify no code imports the deleted file

**Validation:**
```bash
# Verify no imports remain
grep -r "app/api/token" src/
grep -r "/api/token" docs/
```

**Rollback:** Git revert commit

---

### 1.2 Remove Empty Files

**Files to Delete:**
- `/src/Haas.Media.Web/features/useTorrentMedia.ts`

**Files to Review (may have side effects):**
- `/src/Haas.Media.Web/index.ts` - Check if CSS import is needed

**Actions:**
1. Delete `useTorrentMedia.ts`
2. Review `index.ts` - if only used for CSS import side-effect, keep; otherwise remove
3. Search for any imports of these files

**Validation:**
```bash
# Verify no imports remain
grep -r "useTorrentMedia" src/
grep -r "from.*['\"]@/index['\"]" src/
```

**Rollback:** Git revert commit

---

### 1.3 Remove Summary Documents

**Files to Delete/Archive:**

Move to `/docs/archive/` (create if needed):
```
/docs/AUDIO-FIX-SUMMARY.md
/docs/URGENT-VIDEO-STREAMING-FIX.md
/docs/backend/local-auth-implementation-summary.md
/docs/backend/JELLYFIN-INFUSE-UPDATE-SUMMARY.md
/docs/backend/video-streaming-fix-summary.md
/docs/backend/ffmpeg-streaming-implementation-summary.md
```

Review and conditionally remove:
```
/docs/QUICK-REFERENCE-FFMPEG-STREAMING.md (if duplicates ffmpeg-streaming-quickstart.md)
/docs/operations/apphost-configuration-fix.md (keep if troubleshooting guide)
```

**Actions:**
1. Create `/docs/archive/` directory
2. Move summary documents to archive
3. Review quick-reference doc for duplication
4. Verify cross-references in other docs

**Validation:**
```bash
# Check for broken doc links
grep -r "AUDIO-FIX-SUMMARY\|URGENT-VIDEO-STREAMING-FIX" docs/
grep -r "local-auth-implementation-summary\|JELLYFIN-INFUSE-UPDATE-SUMMARY" docs/
grep -r "video-streaming-fix-summary\|ffmpeg-streaming-implementation-summary" docs/
```

**Rollback:** Git revert commit or restore from archive

---

## Phase 2: Type Alias Migration (Medium Risk)

**Estimated Time:** 2-3 hours  
**Risk Level:** ⚠️ Medium  
**Prerequisites:** Phase 1 complete, all tests passing

### 2.1 Update Backend Type References

**Target Files:**
- `/src/Haas.Media.Services/Files/FilesConfiguration.cs` (lines 132, 143)

**Actions:**
1. Create feature branch: `refactor/remove-legacy-type-aliases`
2. Replace `CopyFileRequest` with `CopyRequest`
3. Replace `MoveFileRequest` with `MoveRequest`
4. Update any using statements

**Example Change:**
```csharp
// Before
app.MapPost("/api/files/copy", (CopyFileRequest request) => { ... })

// After
app.MapPost("/api/files/copy", (CopyRequest request) => { ... })
```

**Validation:**
```bash
# Build backend
dotnet build src/Haas.Media.Services

# Run affected tests
dotnet test --filter "FullyQualifiedName~Files"
```

---

### 2.2 Update Frontend Type References

**Target Files:**
- `/src/Haas.Media.Web/features/files/components/copy-move-modal.tsx`
- `/src/Haas.Media.Web/features/files/components/file-actions-modal.tsx`

**Actions:**
1. Update imports to use `CopyRequest` and `MoveRequest`
2. Update component type annotations
3. Verify TypeScript compilation

**Example Change:**
```typescript
// Before
import { CopyFileRequest, MoveFileRequest } from '@/types/file';

// After
import { CopyRequest, MoveRequest } from '@/types/file';
```

**Validation:**
```bash
# TypeScript check
cd src/Haas.Media.Web
npm run type-check

# Build frontend
npm run build
```

---

### 2.3 Remove Legacy Type Definitions

**Target Files:**
- `/src/Haas.Media.Services/Files/FileRequests.cs` (lines 34-35)
- `/src/Haas.Media.Web/types/file.ts` (lines 52-53)

**Actions:**
1. Remove legacy type alias definitions
2. Update documentation in `/src/Haas.Media.Web/features/files/components/README.md`

**Validation:**
```bash
# Full build both projects
dotnet build
cd src/Haas.Media.Web && npm run build

# Verify no remaining references
grep -r "CopyFileRequest\|MoveFileRequest" src/
```

---

### 2.4 Integration Testing

**Actions:**
1. Start Aspire host: `dotnet run --project src/Haas.Media.Aspire`
2. Test file copy operation via UI
3. Test file move operation via UI
4. Verify API requests use correct types in browser DevTools

**Rollback:** Merge --abort and revert branch

---

## Phase 3: Documentation Reorganization (Low Risk)

**Estimated Time:** 2-3 hours  
**Risk Level:** ✅ Low  
**Prerequisites:** Phase 2 complete

### 3.1 Move Misplaced Theme Documentation

**Files to Move:**
```
/src/Haas.Media.Web/docs/DARK_THEME_IMPLEMENTATION.md → /docs/frontend/dark-theme.md
/src/Haas.Media.Web/docs/THEME_SWITCH_IMPLEMENTATION.md → /docs/frontend/theme-system.md
```

**Actions:**
1. Check if target files already exist (may need to merge)
2. Move or merge content
3. Delete source files
4. Update any cross-references

**Validation:**
```bash
# Check for references to old locations
grep -r "src/Haas.Media.Web/docs/DARK_THEME" .
grep -r "src/Haas.Media.Web/docs/THEME_SWITCH" .
```

---

### 3.2 Review and Update API Documentation

**Target File:** `/docs/API.md`

**Actions:**
1. Review content for accuracy
2. Remove Auth0 references (project uses local auth)
3. Verify all endpoints are documented
4. Consider if OpenAPI/Swagger is better alternative
5. Update or remove based on findings

**Decision Points:**
- Keep if updated for current API surface
- Remove if superseded by OpenAPI docs
- Archive if historical reference only

---

### 3.3 Verify Documentation Cross-References

**Actions:**
1. Run link checker on all docs
2. Fix broken internal references
3. Update outdated examples

**Validation:**
```bash
# Check for common broken link patterns
grep -r "\[.*\](.*\.md)" docs/ | grep -v "^Binary"
```

---

## Phase 4: Code Quality Improvements (Ongoing)

**Estimated Time:** Variable  
**Risk Level:** Varies by task  
**Prerequisites:** Previous phases complete

### 4.1 Address TODO Items

**Target:** `/src/Haas.Media.Services/Jellyfin/JellyfinConfiguration.cs:274`

**TODO:**
```csharp
// TODO: Implement resume functionality when playback progress is persisted
```

**Actions:**
1. Verify playback progress persistence is implemented
2. Implement resume functionality OR
3. Update comment if not applicable

**Priority:** Medium (feature enhancement)

---

### 4.2 NPM Package Updates (Future)

**Deprecated Packages:**
- `@eslint/eslintrc` → `@eslint/config-array`
- `eslint@8.x` → `eslint@9.x`
- `inflight` → modern alternative
- `rimraf@<4` → `rimraf@4+`
- `glob@<9` → `glob@9+`

**Actions:**
1. Create separate branch for dependency updates
2. Update one package at a time
3. Run full test suite after each update
4. Test in development environment

**Priority:** Low (monitor security advisories)

---

### 4.3 Static Utility Class Refactoring (Future)

**Target Files:**
- `/src/Haas.Media.Core/MediaManager.cs`
- `/src/Haas.Media.Core/MediaHelper.cs`

**Considerations:**
- Large static classes (544 lines for MediaHelper)
- Could benefit from DI for testability
- Would require architectural changes

**Actions:**
1. Analyze current usage patterns (17 usages for MediaManager)
2. Identify logical groupings for splitting
3. Design service-based alternatives
4. Plan gradual migration strategy

**Priority:** Low (defer to next major refactor)

---

## Success Criteria

### Phase 1
- [ ] All deprecated files deleted
- [ ] No build errors
- [ ] Documentation updated
- [ ] No broken references found

### Phase 2
- [ ] All legacy type aliases removed
- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] File operations work in UI
- [ ] Tests pass

### Phase 3
- [ ] All documentation in correct locations
- [ ] No broken doc links
- [ ] API.md reviewed/updated
- [ ] Cross-references validated

### Phase 4
- [ ] TODOs addressed or tracked
- [ ] Dependency update plan created
- [ ] Refactoring candidates documented

---

## Rollback Procedures

### Per-Phase Rollback
1. **Git Revert:** `git revert <commit-hash>`
2. **Branch Reset:** `git reset --hard origin/main`
3. **Restore Archive:** Copy files back from `/docs/archive/`

### Emergency Rollback
```bash
# If cleanup causes production issues
git log --oneline -10  # Find last good commit
git reset --hard <commit-hash>
git push --force origin main  # Use with caution
```

---

## Pre-Execution Checklist

- [ ] All tests passing on main branch
- [ ] Backup created (git tag `pre-cleanup-backup`)
- [ ] Team notified of cleanup work
- [ ] Development environment ready
- [ ] Time allocated for each phase

---

## Execution Commands

### Create Backup Tag
```bash
git tag -a pre-cleanup-backup -m "Backup before code cleanup"
git push origin pre-cleanup-backup
```

### Phase 1 Branch
```bash
git checkout -b cleanup/phase-1-quick-wins
# Make changes
git add .
git commit -m "chore: remove deprecated endpoint and empty files"
git push origin cleanup/phase-1-quick-wins
```

### Phase 2 Branch
```bash
git checkout main
git pull
git checkout -b refactor/remove-legacy-type-aliases
# Make changes
git add .
git commit -m "refactor: migrate from CopyFileRequest/MoveFileRequest to CopyRequest/MoveRequest"
git push origin refactor/remove-legacy-type-aliases
```

### Phase 3 Branch
```bash
git checkout main
git pull
git checkout -b docs/reorganize-documentation
# Make changes
git add .
git commit -m "docs: reorganize and update documentation structure"
git push origin docs/reorganize-documentation
```

---

## Monitoring and Validation

### After Each Phase
1. Run full build: `dotnet build`
2. Run all tests: `dotnet test`
3. Start Aspire: `dotnet run --project src/Haas.Media.Aspire`
4. Smoke test key features in UI
5. Check browser console for errors

### Metrics to Track
- Build time (should not increase)
- Test pass rate (should remain 100%)
- Bundle size (Phase 2 may reduce slightly)
- Documentation coverage

---

## Notes

- **Incremental Commits:** Commit after each file change for easy rollback
- **PR Reviews:** Create PR for each phase for team review
- **Documentation:** Update this plan as work progresses
- **Defer if Needed:** Skip non-critical phases if time-constrained

---

## Next Steps

1. Review this plan with team
2. Set calendar time for Phase 1 execution
3. Create GitHub issues for tracking (optional)
4. Execute Phase 1 and validate
5. Update this document with findings
6. Proceed to Phase 2 after approval

---

**Plan Owner:** Development Team  
**Review Date:** October 23, 2025  
**Next Review:** After Phase 2 completion
