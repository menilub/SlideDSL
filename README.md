# SlideDSL Language Framework

**Version:** 1.0 | **Status:** Approved Standard

A domain-specific extension of Markdown for generating AI-driven multimedia presentations. Write structured slides in plain text; an AI orchestration layer produces the layout, synthesized narration audio, and animated video composition automatically.

---

## Overview

SlideDSL formalizes the semantic, structural, spatial, and temporal properties of slide-based presentations in a human-readable format. A SlideDSL document is a deterministic input for a downstream AI agent that executes three core functions:

1. **Structural Layout Composition** — Builds canvas element trees, establishes parent-child containment boundaries, and calculates proportional spatial constraints from a brand style template.
2. **Synthesized Audio Generation** — Converts inline speaker notes into time-aligned voice narratives using a TTS synthesis engine.
3. **Motion Graphic Sequencing** — Translates declaratively defined animations and timing parameters into absolute video timeline compositions.

> Deploying unified SlideDSL automation pipelines compresses multimedia engineering timelines by over 80%, allowing documentation files to serve directly as production-ready corporate video presentations.

---

## Core Features

- **Pure Markdown base** — valid standard Markdown with SlideDSL extensions layered on top
- **YAML Front Matter** for presentation-wide config (title, voice model, theme, aspect ratio)
- **Flex column containers** (`:::`) for multi-column layouts with proportional weight control
- **Declarative animations** — phase, effect, trigger, delay, and duration in a single attribute string
- **Narration-synchronized animations** — trigger element entrances at exact words in the audio track via `<marker: name>` tags
- **Presentation-agnostic styles** — coordinates, colors, and typography are injected by the AI compiler from an external brand style guide; the DSL stays content-focused

---

## Quick Start

```yaml
---
title: "Enterprise AI Product Lifecycle"
author: "AI Engineering & Operations Group"
aspect_ratio: "16:9"
default_voice: "en-US-Neural-Standard-M"
global_theme: "slate-minimal"
---
```

```markdown
# Engineering the Modern AI Lifecycle
## A Blueprint for Scalable Model Orchestration and Continuous Training
{ id="main-subtitle" animate="in: fade trigger=onload delay=0.5s duration=1.0s" }

::: notes
Welcome team to the AI engineering strategy overview. Today, we will step through
the core pipeline required to productionalize large scale machine learning models
securely and reliably.
:::

---
# The Three-Core Architecture Pillars

::: container {distribution="split-even" gap="30px"}
::: column {id="col-left"}
## Core Pipelines
1. Continuous Data Ingestion
   { id="step-1" animate="in: slide-right trigger=onload duration=0.4s" }
2. Distributed Training Clusters
   { id="step-2" animate="in: slide-right trigger=after-step-1 duration=0.4s" }
3. Automated Evaluation Matrix
   { id="step-3" animate="in: slide-right trigger=after-step-2 duration=0.4s" }
:::
::: column {id="col-right"}
## Topology Mapping
![Pipeline Flow Diagram](assets/pipeline-flow.svg)
{ id="img-pipeline" animate="in: scale trigger=narrate-show-pipeline duration=0.6s" }
:::
:::

::: notes
To scale models efficiently, our infrastructure relies on three core architecture pillars.
Let us analyze how these systems communicate <marker: show-pipeline> by looking at the
topology layout now appearing on the right side of our screen.
:::
```

---

## Language Reference

### Visual Element Types

| Element | SlideDSL Syntax | AI Engine Interpretation |
|---|---|---|
| Main Heading | `# Slide Title` | Slide title canvas node. One per slide; absolute visual focal point. |
| Sub-Heading | `## Section Label` | Structural group header inside layout containers. |
| Body Text | `Paragraph text` | Typography layer bounded by parent column limits. |
| Unordered List | `* Item A` | Bullet array layout. Nodes can be animated sequentially. |
| Ordered List | `1. Step One` | Chronological step layout mapping to sequence matrices. |
| Image | `![Alt](path.png)` | Asset viewport layer; AI controls object fit and positioning. |

### Animation Attribute Format

```
animate="[phase]: [effect] trigger=[event] delay=[time] duration=[time]"
```

| Parameter | Values |
|---|---|
| **phase** | `in` (entrance), `out` (exit), `emphasis` (looping attention) |
| **effect** | `fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `zoom`, `wipe`, `spin` |
| **trigger** | `onload`, `after-[id]`, `with-[id]`, `narrate-[marker]` |
| **delay / duration** | seconds (`0.5s`) or milliseconds (`500ms`) |

### Slide Delimiters

Use `---` or `***` on a standalone line to begin a new slide canvas.

### Container Blocks

```markdown
::: container {distribution="equal" gap="20px"}
::: column {weight="1"}
Left content
:::
::: column {weight="2"}
Right content (twice as wide)
:::
:::
```

### Narration Markers

Embed `<marker: name>` inside a `::: notes` block to trigger animations at that exact point in the audio track:

```markdown
::: notes
First we initialize <marker: step1>. Then the cluster provisions infrastructure <marker: step2>.
:::
```

---

## Architecture Principles

| Principle | Description |
|---|---|
| Presentation-Agnostic Styles | Coordinates, dimensions, typography, and colors are omitted from the DSL and injected by the AI compiler from an external brand style template. |
| Strict Temporal Alignment | Every canvas mutation is mapped to a unified timeline synchronized to the generated narration audio track. |
| Deterministic Hierarchical Nesting | Structural nesting cleanly limits parent-child container scopes, grouping assets logically (e.g., a chart matched to its text block). |

---

## Validator CLI (v2.0)

The `src/cli.ts` tool validates SlideDSL documents against the v2.0 specification. It runs three layers of checks: structural (schema errors), semantic (cross-reference errors), and lint (style warnings).

### Usage

```bash
node --experimental-strip-types src/cli.ts <file.md> [--format human|json] [--strict]
```

| Flag | Description |
|---|---|
| `--format human` | Human-readable output with `[ERROR]`/`[WARNING]` prefixes (default) |
| `--format json` | Machine-readable JSON array of issues |
| `--strict` | Treat warnings as errors (exit code 1 if any warnings exist) |

### Exit Codes

| Code | Meaning |
|---|---|
| `0` | Valid — no errors (warnings allowed unless `--strict`) |
| `1` | Invalid — one or more errors, or warnings under `--strict` |
| `2` | Bad arguments or unreadable file |

### Examples

```bash
# Validate a file (human output)
node --experimental-strip-types src/cli.ts presentation.md

# ✓ Valid — no issues found.

# Validate with JSON output
node --experimental-strip-types src/cli.ts presentation.md --format json

# [{"code":"lint/slide-no-id","severity":"warning","line":12,"message":"...","file":"..."}]

# Fail on warnings too
node --experimental-strip-types src/cli.ts presentation.md --strict
```

### Running Tests

```bash
npm test
```

73 tests cover the parser, all three validator layers, and the reporters.

---

## Status

This repository contains the **v1.0 Approved Standard** specification for the SlideDSL language, plus a **v2.0 validator CLI** (see above).

**Target audience for the spec:** AI Engineering Teams, Compiler Implementers, Content Creators, Motion Design Modules.

See the full specification and user guide: [`docs/The SlideDSL Language Framework: Comprehensive Specification & Comprehensive User Guide.md`](docs/The%20SlideDSL%20Language%20Framework_%20Comprehensive%20Specification%20%26%20Comprehensive%20User%20Guide.md)
