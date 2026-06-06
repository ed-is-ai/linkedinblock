# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 1-Foundation
**Areas discussed:** Scaffolding approach

---

## Scaffolding Approach

### Question 1: Project initialization

| Option | Description | Selected |
|--------|-------------|----------|
| From scratch (vanilla-ts) | npm create vite@latest --template vanilla-ts, then manually add vite-plugin-web-extension and manifest. Full control, no template opinions. | |
| Web extension template | Use aklinker1's/nicepkg's vite-plugin-web-extension starter template. Faster start but may scaffold unwanted opinions. | ✓ |

**User's choice:** Web extension template
**Notes:** Preferred the template approach for faster setup. Acknowledged the risk that the template may include unwanted framework choices or outdated deps.

---

### Question 2: Handling template noise

| Option | Description | Selected |
|--------|-------------|----------|
| Use template, strip/replace as needed | Start from template, explicitly plan to clean up what doesn't match our stack. | |
| Use template as reference only | Copy vite.config.ts and manifest.json patterns but scaffold project from vanilla-ts. | |
| Let the researcher verify first | Researcher checks current state of the template before planner commits to this path. | ✓ |

**User's choice:** Let the researcher verify first
**Notes:** Researcher should confirm: Does a clean MV3 + TypeScript template exist? What does it scaffold? Is it Vite 5 compatible?

---

### Question 3: Folder structure

| Option | Description | Selected |
|--------|-------------|----------|
| src/ flat with subfolders | src/content/, src/background/, src/popup/, src/shared/ — mirrors vite-plugin-web-extension's expected entry point layout. | ✓ |
| Flat src/ + separate popup dir | content/background in src/, popup at root. Less conventional but some templates do this. | |

**User's choice:** src/ flat with subfolders
**Notes:** Standard layout that mirrors vite-plugin-web-extension's expectations.

---

## Claude's Discretion

- Observer anchor strategy (narrow-first vs body-always) — not discussed; planner decides per research docs
- SPA navigation detection method (monkey-patch vs URL polling vs Navigation API) — not discussed; planner decides per research docs
- Phase 1 scope boundary (health sentinel, deduplication, error logging) — not discussed; planner decides per PITFALLS.md guidance
- ESLint/Prettier config details
- TypeScript strictness settings
- Service worker stub completeness

## Deferred Ideas

- Full cross-context error logging utility — belongs in Phase 2 or later when popup exists to surface it
- processedPosts LRU eviction strategy — Phase 2/3 concern
- Infinite scroll sentinel test — Phase 2 concern (no hiding in Phase 1)
