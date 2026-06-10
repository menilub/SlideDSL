# SlideDSL v2.0 Specification Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the complete SlideDSL v2.0 language specification document covering all 11 gap categories identified in the brainstorming session.

**Architecture:** Single Markdown document at `docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md` containing the full v2.0 spec. All content was designed and approved in the brainstorming session; the source is `/Users/menilub/.claude/plans/system-instruction-you-are-working-snuggly-hamster.md`. No code implementation — this plan produces the specification document only. Parser/compiler implementation is explicitly out of scope.

**Tech Stack:** Markdown, Git

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md` | Create | Full v2.0 specification document |

---

### Task 1: Create the v2.0 Spec File

**Files:**
- Create: `docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md`

- [ ] **Step 1: Read the approved source content**

Read the plan file to confirm all 11 Parts are present before writing:

```bash
grep -c "^## Part" /Users/menilub/.claude/plans/system-instruction-you-are-working-snuggly-hamster.md
```

Expected output: `11`

Also confirm no placeholders remain:

```bash
grep -in "TBD\|TODO\|fill in\|implement later" /Users/menilub/.claude/plans/system-instruction-you-are-working-snuggly-hamster.md
```

Expected output: (empty — no matches)

- [ ] **Step 2: Create the spec file**

Create `docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md` with this exact header, followed by the full content from Parts 1–11 in the plan file (everything between `## Full v2.0 Spec Content` and `## Implementation Steps`):

```markdown
# SlideDSL Language Framework: v2.0 Specification

**Version:** 2.0
**Status:** Draft
**Date:** 2026-06-10
**Replaces:** v1.0 (breaking changes — not backward-compatible)
**Source:** Gap analysis against PowerPoint/Keynote and Reveal.js/Slidev

---
```

The body of the file must contain exactly these 11 Parts in order:

- Part 1: Document Structure & Architecture (Sections 1.1–1.5)
- Part 2: Content Types (Sections 2.1–2.9)
- Part 3: Slide Transitions (Sections 3.1–3.4)
- Part 4: Layout System v2 (Sections 4.1–4.6)
- Part 5: Slide Organization (Sections 5.1–5.7)
- Part 6: Narration & Audio v2 (Sections 6.1–6.5)
- Part 7: Animation v2 (Sections 7.1–7.8)
- Part 8: Interactivity (Sections 8.1–8.5)
- Part 9: Typography & Text (Sections 9.1–9.5)
- Part 10: Variables & Modularity (Sections 10.1–10.3)
- Part 11: Accessibility & Export (Sections 11.1–11.4)

- [ ] **Step 3: Verify completeness**

Run each check and confirm all pass:

```bash
# All 11 Parts present
grep -c "^## Part" docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md
# Expected: 11

# Section 1.5 mandatory/defaults tables present
grep -c "Mandatory Fields" docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md
# Expected: 1 or more

# All 15 content types present (spot-check 5 of them)
grep -c "chart\|diagram\|@icon\|:::  shape\|code block" docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md
# Expected: 5 or more

# No placeholders
grep -in "TBD\|TODO" docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md
# Expected: (empty)
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md
git commit -m "docs: add SlideDSL v2.0 comprehensive spec with 11 gap categories"
```

Expected output: `1 file changed, N insertions(+)`

---

## Out of Scope — Separate Plans Required

| Future Plan | Description |
|-------------|-------------|
| v2.0 Parser | Extend the TypeScript CLI validator (`src/`) to parse all new v2.0 syntax blocks |
| AI Compiler Extensions | Update AI agent orchestration to handle new content types (charts, diagrams, video, shapes) |
| Migration Guide | Document for converting v1.0 presentations to v2.0 syntax with before/after examples |

---

## Self-Review Notes

- Spec coverage: All 11 brainstorming categories map to a Part in the spec ✓
- No placeholder patterns ✓
- Single task is correct — this is a documentation deliverable, not a code implementation ✓
- Type consistency: N/A (no code) ✓
