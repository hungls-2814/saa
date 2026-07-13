# Favicon & Icon Implementation + ESLint Configuration Fix

**Date**: 2026-07-13 09:00
**Severity**: Low
**Component**: Branding Assets / Build Configuration
**Status**: Resolved

## What Happened

Shipped favicon and app icon assets alongside the responsive-website feature work. Regenerated `app/favicon.ico` as a multi-size PNG-in-ICO format and created `app/icon.png` (256x256) by cropping the "S" glyph from `public/login/logo.png`, dropping the wordmark text to preserve legibility at tab size. Next.js App Router picked these up via file-convention routing — no manual metadata.icons configuration needed.

During pre-ship gate checks, ESLint was failing because it scanned gitignored `.vercel/output/` build artifacts. Fixed by adding `".vercel/**"` to globalIgnores in `eslint.config.mjs`.

Version bumped 0.4.5 → 0.4.6. Changelog entry added. All gates passed: typecheck clean, lint 0 errors, 855 tests pass, reviewer verdict SEALED (0 critical).

## The Brutal Truth

Routine work with no drama — which is exactly right. The only friction was discovering ESLint scanning build artifacts after `.vercel/` sat in the tree for months, untouched. Small oversight, caught in pre-flight checks, fixed in seconds. The kind of quiet win that keeps the pipes clean without rattling the cage.

## Technical Details

**Files modified:**
- `app/favicon.ico` — multi-size PNG embedded in ICO wrapper
- `app/icon.png` — 256x256 PNG, cropped from "S" glyph in `public/login/logo.png`
- `eslint.config.mjs` — added `.vercel/**` to globalIgnores array
- `package.json` — version bumped to 0.4.6
- `docs/project-changelog.md` — v0.4.6 entry added

**Build & gate results:**
- TypeScript: 0 errors
- ESLint: 0 errors (post-fix)
- Test suite: 855 passing
- Reviewer: SEALED, 0 critical findings

## What We Tried

Considered SVG favicon reference but chose PNG-in-ICO for predictable tab rendering at 16x16 — SVG in browser tabs remains inconsistent across platforms. Icon cropping was straightforward; wordmark text dropped to keep the mark legible small.

## Root Cause Analysis

ESLint scans all files by design; the oversight was not adding `.vercel/` to globalIgnores when build output first appeared in the tree. Low-priority miss since `.vercel/` is already gitignored, but ESLint doesn't read gitignore by default. This created noise in lint output during gate checks.

## Lessons Learned

When a new build artifact directory lands in the tree (even gitignored), update `eslint.config.mjs`'s globalIgnores in the same commit. Tiny gaps like this don't break the build but muddy the lint signal and gate-check experience.

Favicon/icon sourcing works cleanly when the design system has assets ready in one place. Next.js file conventions eliminate boilerplate — no metadata configuration needed.

## Next Steps

None — ship is complete and gated. Monitor favicon and icon render across browsers and devices in next QA pass. No blockers.
