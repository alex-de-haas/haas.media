# Code Cleanup Review

> **Generated:** October 23, 2025  
> **Purpose:** Identify unused, deprecated, or legacy code for cleanup

## Executive Summary

This document identifies code that can potentially be removed or refactored to improve maintainability. Items are categorized by priority and risk level.

---

## 1. Deprecated API Endpoints

### High Priority - Safe to Remove

#### `/app/api/token/route.ts` (Frontend)

**Status:** Deprecated (returns 410 Gone)  
**Reason:** Token retrieval now handled client-side via localStorage  
**Replacement:** `lib/auth/token.ts` with `getValidToken()`

**Action:**

- ✅ Delete `/src/Haas.Media.Web/app/api/token/route.ts`
- ✅ Update any references in documentation to use `getValidToken()` instead

**References to Update:**

- `/docs/frontend/video-player-troubleshooting.md:125` - shows old `/api/token` usage
- `/docs/frontend/AUTHENTICATION-COMPLETE-GUIDE.md:906` - mentions endpoint verification

**Estimated Impact:** Low (endpoint already returns 410 Gone)

---

## 2. Legacy Type Aliases

### Medium Priority - Consider Removal

#### `CopyFileRequest` and `MoveFileRequest`

**Status:** Legacy aliases for backward compatibility  
**Current:** Type aliases exist in both backend and frontend  
**Replacement:** Use `CopyRequest` and `MoveRequest` directly

**Backend Locations:**

```csharp
// src/Haas.Media.Services/Files/FileRequests.cs
public record CopyFileRequest : CopyRequest;  // Line 34
public record MoveFileRequest : MoveRequest;  // Line 35
```

**Frontend Locations:**

```typescript
// src/Haas.Media.Web/types/file.ts
export interface CopyFileRequest extends CopyRequest {} // Line 52
export interface MoveFileRequest extends MoveRequest {} // Line 53
```

**Current Usage:**

- Used in `FilesConfiguration.cs` endpoints (lines 132, 143)
- Used in `copy-move-modal.tsx` component imports
- Used in `file-actions-modal.tsx` component imports
- Documented in `/src/Haas.Media.Web/features/files/components/README.md`

**Action Plan:**

1. ✅ Update all imports to use `CopyRequest`/`MoveRequest` instead
2. ✅ Update endpoint handlers in `FilesConfiguration.cs`
3. ✅ Update component imports
4. ✅ Update documentation
5. ✅ Remove legacy type aliases

**Estimated Impact:** Medium (multiple files affected, but straightforward refactor)

---

## 3. Empty Files

### High Priority - Safe to Remove

#### `/src/Haas.Media.Web/features/useTorrentMedia.ts`

**Status:** Empty file  
**Usage:** No usages found in codebase  
**Action:** ✅ Delete file

**Estimated Impact:** None

#### `/src/Haas.Media.Web/index.ts`

**Status:** Only contains default exports, no custom code  
**Content:** `import "./app/globals.css"; export * from "next";`  
**Action:** ⚠️ Review if needed for CSS import side-effect, otherwise remove

**Estimated Impact:** Low (may be needed for CSS imports)

---

## 4. Documentation Cleanup

### High Priority - Archive or Remove

#### Summary Documents (Should Not Be Created Per Instructions)

According to `.github/copilot-instructions.md`, these types of documents should NOT be created:

- Task summaries or completion reports
- Issue descriptions or refactoring overviews

**Candidates for Removal:**

1. **`/docs/AUDIO-FIX-SUMMARY.md`**
   - Type: Task completion summary
   - Content: Documents audio playback fix
   - Action: ✅ Archive information into relevant feature docs, then delete

2. **`/docs/URGENT-VIDEO-STREAMING-FIX.md`**
   - Type: Issue resolution document
   - Content: 403 error fix with Auth0 setup
   - Action: ✅ Extract useful Auth0 setup info into local auth guide, then delete

3. **`/docs/QUICK-REFERENCE-FFMPEG-STREAMING.md`**
   - Type: Likely a summary/quick ref
   - Action: ⚠️ Review content - may be useful as actual reference docs
   - If it duplicates `/docs/backend/ffmpeg-streaming-quickstart.md`, remove

4. **`/docs/backend/local-auth-implementation-summary.md`**
   - Type: Implementation summary
   - Action: ✅ Content should be in `/docs/backend/local-auth-complete-guide.md`, remove if duplicate

5. **`/docs/backend/JELLYFIN-INFUSE-UPDATE-SUMMARY.md`**
   - Type: Update summary
   - Action: ✅ Remove (info should be in main Jellyfin docs)

6. **`/docs/backend/video-streaming-fix-summary.md`**
   - Type: Fix summary
   - Action: ✅ Remove (info should be in video streaming docs)

7. **`/docs/backend/ffmpeg-streaming-implementation-summary.md`**
   - Type: Implementation summary
   - Action: ✅ Remove (info should be in main FFmpeg docs)

8. **`/docs/operations/apphost-configuration-fix.md`**
   - Type: Fix documentation
   - Action: ⚠️ Keep if it's a troubleshooting guide, remove if it's a fix summary

#### Archived/Consolidated Documentation

Per `/docs/frontend/AUTHENTICATION-README.md`, these are explicitly marked as legacy:

- `authentication-relogin.md` (if exists)
- `auto-relogin-implementation.md` (if exists)
- `fetch-with-auth-migration.md` (if exists)
- `QUICK-REFERENCE-fetchWithAuth.md` (if exists)
- `AUTO-RELOGIN-SUMMARY.md` (if exists)

**Action:** ✅ Verify these files don't exist, or remove if found

#### Web Component Documentation in Wrong Location

1. **`/src/Haas.Media.Web/docs/DARK_THEME_IMPLEMENTATION.md`**
   - Current: In Web project root
   - Should be: `/docs/frontend/dark-theme.md`
   - Action: ✅ Move to proper location

2. **`/src/Haas.Media.Web/docs/THEME_SWITCH_IMPLEMENTATION.md`**
   - Current: In Web project root
   - Should be: `/docs/frontend/theme-system.md`
   - Action: ✅ Move to proper location

#### Outdated API Documentation

**`/docs/API.md`**

- Status: May be outdated or incomplete
- Content: References Auth0 (project now uses local auth)
- Action: ⚠️ Review and either update or remove in favor of OpenAPI/feature-specific docs

**Estimated Impact:** Low (documentation only)

---

## 5. TODO Items

### Medium Priority - Review and Address

#### Backend TODO

**`/src/Haas.Media.Services/Jellyfin/JellyfinConfiguration.cs:274`**

```csharp
// TODO: Implement resume functionality when playback progress is persisted
```

**Action:** ⚠️ Playback info IS now persisted - implement resume feature or update comment

---

## 6. Potential Refactoring Candidates

### Low Priority - Consider in Future

#### BackgroundTaskBase Constructor Pattern

**Location:** `/src/Haas.Media.Core/BackgroundTasks/BackgroundTaskBase.cs`

Current constructor allows optional ID but all derived classes pass specific IDs anyway. Consider:

- Removing optional parameter
- Or making it required if external ID injection is needed

**Usage:** 17 usages across the codebase  
**Action:** 🔍 Review during next background task refactor

#### MediaManager and MediaHelper

**Files:**

- `/src/Haas.Media.Core/MediaManager.cs` (static class, 3 usages)
- `/src/Haas.Media.Core/MediaHelper.cs` (static class, 544 lines)

Both are large static utility classes. Consider:

- Splitting into smaller, focused classes
- Converting to services with DI for better testability

**Action:** 🔍 Consider during next media handling refactor

---

## 7. Deprecated NPM Packages

### Low Priority - Monitor for Updates

The following deprecated packages are used (from `package-lock.json`):

- `@eslint/eslintrc` - deprecated, use `@eslint/config-array`
- `@eslint/object-schema` - deprecated, use replacement
- `eslint@8.x` - no longer supported
- `inflight` - deprecated, has memory leaks
- `rimraf@<4` - versions prior to v4 no longer supported
- `glob@<9` - versions prior to v9 no longer supported

**Action:** 🔍 Plan upgrade during next maintenance window

---

## 8. Component/Export Review

### Low Priority - Verify Usage

#### Component Index Files

Several index files re-export components. Verify all exports are actually used:

1. **`/src/Haas.Media.Web/components/index.ts`**
2. **`/src/Haas.Media.Web/components/ui/index.ts`**
3. **`/src/Haas.Media.Web/features/*/index.ts`** files

**Action:** 🔍 Run unused export analysis tool

---

## Cleanup Execution Plan

### Phase 1: Quick Wins (Estimated: 1 hour)

1. ✅ Delete `/app/api/token/route.ts`
2. ✅ Delete `/features/useTorrentMedia.ts`
3. ✅ Update documentation references to old token endpoint
4. ✅ Remove summary documents (backup first)

### Phase 2: Type Alias Migration (Estimated: 2 hours)

1. ✅ Update all `CopyFileRequest`/`MoveFileRequest` usages
2. ✅ Remove legacy type aliases
3. ✅ Run tests to verify

### Phase 3: Documentation Reorganization (Estimated: 3 hours)

1. ✅ Move theme docs to proper location
2. ✅ Archive/remove summary documents
3. ✅ Review and update `/docs/API.md`
4. ✅ Verify all cross-references are valid

### Phase 4: Code Reviews (Ongoing)

1. 🔍 Review TODO items
2. 🔍 Consider MediaManager/MediaHelper refactor
3. 🔍 Plan NPM package upgrades
4. 🔍 Run unused export analysis

---

## Risk Assessment

| Category              | Risk Level | Reason                                                 |
| --------------------- | ---------- | ------------------------------------------------------ |
| API Endpoint Removal  | ✅ Low     | Already returns 410, documented deprecation            |
| Empty File Removal    | ✅ Low     | No usages found                                        |
| Type Alias Migration  | ⚠️ Medium  | Multiple files affected, needs careful testing         |
| Documentation Cleanup | ✅ Low     | Documentation only, can be backed up                   |
| Code Refactoring      | 🔴 High    | Requires architectural decisions and extensive testing |

---

## Recommendations

1. **Start with Phase 1** - Low-risk, immediate cleanup
2. **Backup before Phase 2** - Create feature branch for type migration
3. **Archive don't delete** - Move summary docs to `/docs/archive/` first
4. **Add tests** - Ensure good test coverage before major refactors
5. **Monitor deprecations** - Set calendar reminder to review NPM packages quarterly

---

## Next Actions

- [ ] Review this document with team
- [ ] Prioritize cleanup phases
- [ ] Create GitHub issues/tasks for each phase
- [ ] Schedule cleanup work in next sprint
- [ ] Create backup branch before starting

---

## Appendix: Search Commands Used

```bash
# Find TODO/FIXME comments
grep -r "TODO\|FIXME\|HACK\|XXX\|DEPRECATED\|OBSOLETE" --include="*.cs" --include="*.ts" --include="*.tsx"

# Find empty files
find . -type f -size 0

# Find deprecated endpoints
grep -r "410\|deprecated" --include="*.ts" --include="*.tsx"

# Find legacy type aliases
grep -r "extends.*Request\|: .*Request" --include="*.cs" --include="*.ts"
```

---

**Document Maintainer:** GitHub Copilot  
**Last Updated:** October 23, 2025  
**Review Frequency:** Quarterly or before major releases
