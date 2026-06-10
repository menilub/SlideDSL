# SlideDSL Language Framework: v2.0 Specification

**Version:** 2.0
**Status:** Draft
**Date:** 2026-06-10
**Replaces:** v1.0 (breaking changes — not backward-compatible)
**Source:** Gap analysis against PowerPoint/Keynote and Reveal.js/Slidev

---

## Part 1: Document Structure & Architecture

### 1.1 Front Matter — Full Field Reference

```yaml
---
title: "My Presentation"           # REQUIRED
author: "Jane Smith"               # optional, default: none
version: "2.0"                     # optional, default: "2.0"
language: "en-US"                  # optional, default: "en-US"
aspect_ratio: "16:9"               # optional, default: "16:9"
default_voice: "en-US-Neural-F"    # optional, default: none (TTS disabled if omitted)
global_theme: "enterprise-dark"    # optional, default: "default"

transitions:                       # optional block
  default: "fade"                  # optional, default: "fade"
  duration: "0.5s"                 # optional, default: "0.5s"
  easing: "ease-in-out"            # optional, default: "ease-in-out"

footer:                            # optional block
  left: "{{company}}"              # optional, default: none
  center: "{{title}}"              # optional, default: none
  right: "{{slide_number}} / {{slide_count}}"  # optional, default: none
  show: true                       # optional, default: false

header:                            # optional block
  right: "assets/logo.svg"        # optional, default: none
  show: true                       # optional, default: false

progress_bar: true                 # optional, default: false
slide_numbers: true                # optional, default: false

background_music: "assets/ambient.mp3"  # optional, default: none
background_music_volume: 0.15           # optional, default: 0.15

export:                            # optional block
  format: "mp4"                    # optional, default: "mp4"
  quality: "1080p"                 # optional, default: "1080p"
  fps: 30                          # optional, default: 30
  audio: true                      # optional, default: true
  subtitles: true                  # optional, default: false
  subtitles-language: "en-US"      # optional, default: inherits from `language`
  print-layout: false              # optional, default: false

toc:                               # optional block
  enabled: true                    # optional, default: false
  insert-after: "slide-intro"      # REQUIRED if toc.enabled: true
  depth: "sections"                # optional, default: "sections"

variables:                         # optional block, default: {}
  company: "Acme Corp"
  year: "2026"
  logo: "assets/logo.svg"
---
```

### 1.2 Section Delimiters

Sections group slides into chapters. Use `===` as the section delimiter:

```
=== {id="sec-intro" title="Introduction" theme="brand-dark" progress-color="brand-accent" music-file="assets/theme.mp3" music-volume="0.2" music-fade-in="2s"}
```

### 1.3 Slide Delimiters (breaking change from v1.0)

Slide-level config moves from `<!-- { } -->` HTML comments to inline attributes on the `---` delimiter:

```
--- {id="slide-arch" label="Architecture Overview" layout="hero" transition="zoom-in" transition-duration="0.8s" duration-hint="45s" hidden="false" footer="true" header="true" slide-number="true" voice="en-GB-Neural-A" voice-rate="0.9" language="en-US" bg-color="brand-dark" print-only="false" screen-only="false"}
```

All attributes are optional. Omitted attributes inherit from front matter or global defaults.

### 1.4 System Tokens (built-in variables)

| Token | Value |
|-------|-------|
| `{{slide_number}}` | Current slide index |
| `{{slide_count}}` | Total slide count |
| `{{section_title}}` | Title of the current `===` section |
| `{{title}}` | Presentation title from front matter |
| `{{author}}` | Author from front matter |
| `{{date}}` | Render date (ISO 8601) |

### 1.5 Mandatory Fields & Defaults

#### Minimum Valid Document

A valid SlideDSL v2.0 document must have:
1. A front matter block with at least `title`
2. At least one slide containing at least one content element (heading or paragraph)

```markdown
---
title: "My Presentation"
---

# First Slide
Welcome.
```

#### Front Matter Field Reference

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `title` | **YES** | — | Only mandatory front matter field |
| `author` | no | none | |
| `version` | no | `"2.0"` | Recommended for parser version targeting |
| `language` | no | `"en-US"` | Affects TTS routing and accessibility |
| `aspect_ratio` | no | `"16:9"` | Values: `"16:9"` \| `"4:3"` \| `"1:1"` |
| `default_voice` | no | none | TTS narration disabled if omitted |
| `global_theme` | no | `"default"` | |
| `transitions.default` | no | `"fade"` | |
| `transitions.duration` | no | `"0.5s"` | |
| `transitions.easing` | no | `"ease-in-out"` | |
| `footer.show` | no | `false` | |
| `footer.left/center/right` | no | none | |
| `header.show` | no | `false` | |
| `header.right` | no | none | |
| `progress_bar` | no | `false` | |
| `slide_numbers` | no | `false` | |
| `background_music` | no | none | |
| `background_music_volume` | no | `0.15` | Range: 0.0–1.0 |
| `export.format` | no | `"mp4"` | `"mp4"` \| `"pdf"` \| `"pptx"` \| `"html"` \| `"png"` |
| `export.quality` | no | `"1080p"` | `"720p"` \| `"1080p"` \| `"4k"` |
| `export.fps` | no | `30` | |
| `export.audio` | no | `true` | |
| `export.subtitles` | no | `false` | |
| `export.subtitles-language` | no | inherits `language` | |
| `export.print-layout` | no | `false` | |
| `toc.enabled` | no | `false` | |
| `toc.insert-after` | **YES** if `toc.enabled: true` | — | Must reference a valid slide `id` |
| `toc.depth` | no | `"sections"` | `"sections"` \| `"slides"` |
| `variables` | no | `{}` | |

#### Slide Delimiter Attribute Defaults

| Attribute | Required | Default |
|-----------|----------|---------|
| `id` | no | auto-generated (`"slide-1"`, `"slide-2"`, …) |
| `label` | no | derived from first `#` heading on the slide |
| `layout` | no | `"auto"` (AI engine determines) |
| `transition` | no | inherits `transitions.default` |
| `transition-duration` | no | inherits `transitions.duration` |
| `transition-easing` | no | inherits `transitions.easing` |
| `duration-hint` | no | none |
| `hidden` | no | `false` |
| `footer` | no | inherits `footer.show` |
| `header` | no | inherits `header.show` |
| `slide-number` | no | inherits `slide_numbers` |
| `voice` | no | inherits `default_voice` |
| `voice-rate` | no | `1.0` |
| `voice-pitch` | no | `"+0st"` |
| `language` | no | inherits `language` |
| `bg-color` | no | from theme |
| `bg-size` | no | `"cover"` |
| `bg-position` | no | `"center"` |
| `bg-opacity` | no | `1.0` |
| `bg-gradient-angle` | no | `"180deg"` |
| `bg-video-muted` | no | `true` |
| `bg-video-loop` | no | `true` |
| `print-only` | no | `false` |
| `screen-only` | no | `false` |

#### Animation Attribute Defaults

| Attribute | Required | Default |
|-----------|----------|---------|
| `phase` | **YES** | — |
| `effect` | **YES** | — |
| `trigger` | **YES** | — |
| `duration` | **YES** | — |
| `delay` | no | `"0s"` |
| `easing` | no | `"ease-out"` |
| `loop` | no | `1` |
| `sfx` | no | none |
| `sfx-volume` | no | `1.0` |

#### Element Attribute Defaults

| Attribute | Required | Default |
|-----------|----------|---------|
| `id` | no | none (required to be referenced by other elements) |
| `z-index` | no | `0` |
| `position-anchor` | no | determined by layout engine |
| `offset-x` / `offset-y` | no | `"0px"` |
| `text-align` | no | inherited from theme |
| `vertical-align` | no | inherited from theme |
| `text-size` | no | `"body"` |
| `text-weight` | no | `"regular"` |
| `text-color` | no | `"brand-primary"` |
| `aria-label` | no | recommended for non-image elements |

---

## Part 2: Content Types

### 2.1 Tables

Standard GFM table syntax with extended attributes on the following line:

```markdown
| Feature | Status | Priority |
|---------|--------|----------|
| Tables  | ✓      | High     |
| Video   | ✗      | Medium   |
{ id="tbl-features" style="zebra" highlight-rows="2" caption="Feature comparison" animate="in: fade trigger=onload duration=0.5s" }
```

`style` values: `minimal` | `zebra` | `bordered` | `card`

### 2.2 Code Blocks

Standard fenced code blocks with extended attributes:

````markdown
```python
def train_model(data):
    return model.fit(data)
```
{ id="code-1" theme="monokai" line-numbers="true" highlight-lines="1,3" caption="Training loop" animate="in: slide-up trigger=onload duration=0.6s" }
````

### 2.3 Video & Audio

Extend the existing `![]()` image syntax with a `type` attribute:

```markdown
![Demo walkthrough](assets/demo.mp4)
{ id="vid-demo" type="video" autoplay="false" controls="true" loop="false" muted="false" start="5s" end="30s" animate="in: fade trigger=onload duration=0.5s" }

![Ambient track](assets/ambient.mp3)
{ id="audio-bg" type="audio" autoplay="true" loop="true" volume="0.3" }
```

### 2.4 Charts

New `::: chart` block with YAML data body:

```markdown
::: chart {type="bar" id="chart-revenue" animate="in: fade trigger=onload duration=0.8s" aria-label="Bar chart showing Q1–Q4 revenue"}
labels: ["Q1", "Q2", "Q3", "Q4"]
datasets:
  - label: "Revenue"
    data: [420, 530, 610, 780]
    color: "brand-primary"
  - label: "Expenses"
    data: [310, 290, 350, 410]
    color: "brand-secondary"
:::
```

`type` values: `bar` | `line` | `pie` | `donut` | `scatter` | `area`

### 2.5 Diagrams

New `::: diagram` block (Mermaid-compatible):

```markdown
::: diagram {type="mermaid" id="flow-arch" animate="in: fade trigger=onload duration=0.8s"}
graph TD
    A[Ingest] --> B[Transform]
    B --> C[Deploy]
:::
```

`type` values: `mermaid` | `plantuml` | `dot`

### 2.6 Icons

New `@icon()` inline directive:

```markdown
@icon(check-circle)
{ id="icon-ok" size="48px" color="brand-success" animate="in: scale trigger=onload duration=0.3s" }

Status: @icon(warning) Degraded    ← inline usage within text
```

### 2.7 Mathematical Expressions

Standard LaTeX delimiters with optional extended attributes:

```markdown
Inline: $E = mc^2$

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
{ id="eq-1" animate="in: fade trigger=onload duration=0.5s" }
```

### 2.8 Shapes & Callouts

New `::: shape` block:

```markdown
::: shape {type="callout" direction="right" id="callout-1" fill="brand-accent" animate="in: scale trigger=after-chart-revenue duration=0.4s"}
Key insight: revenue up 86% YoY
:::

::: shape {type="rectangle" id="bg-overlay" width="100%" height="100%" fill="brand-dark" opacity="0.4" z-index="-1"}
:::
```

`type` values: `rectangle` | `circle` | `arrow` | `callout` | `line` | `triangle`

### 2.9 Blockquotes

Standard `>` syntax with extended attributes:

```markdown
> "The best way to predict the future is to invent it."
> — Alan Kay
{ id="quote-1" style="featured" animate="in: fade trigger=onload duration=0.8s" }
```

`style` values: `default` | `featured` | `minimal` | `bordered`

---

## Part 3: Slide Transitions

### 3.1 Global Defaults

Declared in front matter (see Section 1.1).

### 3.2 Per-Slide Override

```
--- {id="slide-arch" transition="zoom-in" transition-duration="0.8s" transition-easing="spring"}
```

### 3.3 Transition Type Vocabulary

| Value | Description |
|-------|-------------|
| `none` | Hard cut |
| `fade` | Cross-dissolve |
| `push-left` / `push-right` / `push-up` / `push-down` | New slide pushes current off |
| `wipe-left` / `wipe-right` | Curtain wipe |
| `zoom-in` / `zoom-out` | Scale transition |
| `flip-horizontal` / `flip-vertical` | 3D card flip |
| `cube-left` / `cube-right` | 3D cube rotation |
| `dissolve` | Pixel dissolve |
| `morph` | Content-aware morph (Keynote Magic Move equivalent) |

### 3.4 Morph Transition

Elements with matching `id` values on consecutive slides animate smoothly between their positions and sizes:

```
--- {id="slide-a" transition="morph"}
![Logo](logo.svg)
{ id="logo" position-anchor="middle-center" }

--- {id="slide-b"}
# Expanded view
![Logo](logo.svg)
{ id="logo" position-anchor="top-left" scale="0.5" }
```

---

## Part 4: Layout System v2

### 4.1 Slide Backgrounds

```
--- {bg-color="brand-dark"}
--- {bg-image="assets/hero.jpg" bg-size="cover" bg-position="center" bg-opacity="0.7"}
--- {bg-gradient="linear" bg-gradient-from="brand-primary" bg-gradient-to="brand-secondary" bg-gradient-angle="135deg"}
--- {bg-video="assets/loop.mp4" bg-video-muted="true" bg-video-loop="true"}
```

### 4.2 Grid Layout

New `::: grid` block alongside the existing `::: container`:

```markdown
::: grid {id="main-grid" columns="3" rows="2" gap="20px"}
::: cell {col="1" row="1" col-span="2" id="cell-main"}
### Primary content area
:::
::: cell {col="3" row="1" row-span="2" id="cell-sidebar"}
### Sidebar
:::
::: cell {col="1" row="2" id="cell-stat-a"}
420K
:::
::: cell {col="2" row="2" id="cell-stat-b"}
780K
:::
:::
```

### 4.3 Z-index / Layering

Formalized `z-index` attribute on any element. Positive floats above canvas default; negative sinks behind:

```markdown
::: shape {type="rectangle" id="bg-tint" z-index="-1" width="100%" height="100%" fill="brand-dark" opacity="0.5"}
:::

![Diagram](assets/arch.png)
{ id="img-arch" z-index="2" }
```

### 4.4 Positioning Anchors

```markdown
![Logo](assets/logo.svg)
{ id="logo" position-anchor="top-right" offset-x="24px" offset-y="24px" }
```

`position-anchor` values: `top-left` | `top-center` | `top-right` | `middle-left` | `middle-center` | `middle-right` | `bottom-left` | `bottom-center` | `bottom-right`

### 4.5 Alignment

Per-element and per-container:

```markdown
### Revenue grew 86% YoY
{ id="stat-headline" text-align="center" vertical-align="middle" }

::: container {distribution="equal" align-items="center" justify-content="space-between"}
```

`text-align`: `left` | `center` | `right` | `justify`
`align-items` / `justify-content`: standard flexbox vocabulary

### 4.6 Overflow

```markdown
::: container {distribution="equal" overflow="clip"}
::: column {id="col-summary" text-overflow="ellipsis" max-lines="4"}
```

`overflow`: `visible` | `clip` | `scroll`
`text-overflow`: `clip` | `ellipsis` | `scroll`

---

## Part 5: Slide Organization

### 5.1 Sections

`===` groups slides into chapters (see Section 1.2). Sections affect progress bar calculation, TOC generation, and allow chapter-level theme overrides.

### 5.2 Persistent Headers & Footers

Declared globally in front matter (see Section 1.1). Per-slide suppression:

```
--- {id="slide-title" footer="false" header="false"}
```

### 5.3 Progress Bar

Global flag in front matter. Per-section color override:

```
=== {id="sec-arch" title="Architecture" progress-color="brand-accent"}
```

### 5.4 Slide Numbers

Global flag in front matter. Per-slide suppression:

```
--- {id="slide-cover" slide-number="false"}
```

### 5.5 Hidden Slides

Excluded from render and slide count:

```
--- {id="slide-backup" hidden="true"}
```

### 5.6 Duration Hints

Target narration/display time per slide. Used by renderer to flag timing mismatches:

```
--- {id="slide-deep-dive" duration-hint="60s"}
```

### 5.7 Table of Contents

Opt-in via front matter (see Section 1.1). When `toc.enabled: true`, the renderer auto-generates a TOC slide inserted after the specified slide ID.

---

## Part 6: Narration & Audio v2

### 6.1 Per-Slide Voice Override

```
--- {id="slide-ceo-quote" voice="en-GB-Neural-A" voice-rate="0.9" voice-pitch="+2st"}
```

### 6.2 SSML Prosody in Notes

```markdown
::: notes {voice="en-US-Neural-F" voice-rate="0.85"}
Welcome to the architecture overview.
<break time="600ms"/>
Let me walk you through each layer.
<emphasis level="strong">This is the critical path.</emphasis>
<prosody rate="slow" pitch="-2st">Take a moment to study the diagram.</prosody>
<marker: show-diagram>
:::
```

Supported SSML tags: `<break time="Xms"/>` | `<emphasis level="strong|moderate|reduced">` | `<prosody rate|pitch|volume>` | `<say-as interpret-as="...">` | `<sub alias="...">`

### 6.3 Background Music

Global declaration in front matter. Per-section/slide control:

```
=== {id="sec-climax" music-file="assets/buildup.mp3" music-volume="0.25" music-fade-in="2s"}
--- {id="slide-end" music-stop="true" music-fade-out="3s"}
```

### 6.4 Sound Effects

Triggered by animation events via `sfx` attribute:

```markdown
* Revenue grew 86% YoY
{ id="stat-pop" animate="in: scale trigger=onload duration=0.3s" sfx="assets/pop.mp3" sfx-volume="0.6" }
```

### 6.5 Multi-Language Voice

Per-slide language override affects voice selection and TTS engine routing:

```
--- {id="slide-fr" language="fr-FR" voice="fr-FR-Neural-A"}
```

---

## Part 7: Animation v2

### 7.1 Easing Functions

New `easing` parameter on any `animate` attribute:

```markdown
{ id="card-1" animate="in: fade trigger=onload duration=0.6s easing=ease-out" }
```

`easing` values: `linear` | `ease` | `ease-in` | `ease-out` | `ease-in-out` | `spring` | `bounce`

### 7.2 Loop Count

Replaces boolean `loop="true"` from v1.0:

```markdown
{ id="pulse-stat" animate="emphasis: pulse trigger=after-intro duration=1.5s loop=3" }
{ id="spin-icon" animate="emphasis: spin trigger=onload duration=2.0s loop=infinite" }
```

`loop=1` is the default (runs once). `loop=infinite` repeats until slide exits.

### 7.3 Keyframe Animations

New `::: keyframes` definition block, referenced by id. Supported keyframe properties: `opacity`, `scale`, `rotate`, `translate-x`, `translate-y`.

```markdown
::: keyframes {id="kf-fly-in"}
0%   { opacity="0" translate-x="-80px" scale="0.8" }
60%  { opacity="1" translate-x="8px"   scale="1.05" }
100% { opacity="1" translate-x="0"     scale="1.0" }
:::

![Architecture diagram](assets/arch.png)
{ id="img-arch" animate="in: keyframe ref=kf-fly-in trigger=onload duration=1.2s easing=spring" }
```

### 7.4 Path Motion

```markdown
::: path {id="path-orbit" d="M 0 0 C 150 -80, 300 80, 450 0"}
:::

@icon(rocket)
{ id="icon-rocket" animate="move: path ref=path-orbit trigger=onload duration=2.5s easing=ease-in-out" }
```

### 7.5 Typewriter Effect

```markdown
### The future of AI infrastructure starts here.
{ id="hero-headline" animate="in: typewriter trigger=onload duration=2.0s char-delay=40ms" }
```

### 7.6 Color-Shift

```markdown
{ id="alert-box" animate="emphasis: color-shift from=brand-neutral to=brand-warning trigger=narrate-alert duration=0.4s" }
```

### 7.7 Morph Between Elements (within-slide)

```markdown
::: shape {type="circle" id="dot-a" fill="brand-primary"}
:::
::: shape {type="rectangle" id="rect-b" fill="brand-secondary" hidden="true"}
:::
{ id="dot-a" animate="out: morph target=rect-b trigger=after-step-3 duration=0.8s easing=spring" }
```

### 7.8 Exit Animations (formalized)

```markdown
{ id="intro-card" animate="out: slide-left trigger=narrate-transition duration=0.5s" }
```

Exit animations fire before the next entrance animation in timeline order.

---

## Part 8: Interactivity

### 8.1 Click Triggers

New `click` value in the animation trigger vocabulary. Fires in document order on each slide click:

```markdown
### Step 1: Data Ingestion
{ id="step-1" animate="in: slide-right trigger=click duration=0.4s" }

### Step 2: Model Training
{ id="step-2" animate="in: slide-right trigger=click duration=0.4s" }
```

### 8.2 Internal Slide Jumps

```markdown
[Skip to Architecture](#slide-arch)
[Back to Overview](#slide-overview)
```

### 8.3 External Hyperlinks

```markdown
[View live dashboard](https://metrics.example.com)
{ id="link-dashboard" target="_blank" style="button" }
```

`style` values: `inline` (default) | `button` | `hidden` (invisible hotspot)

### 8.4 Hotspot Regions

Invisible clickable areas over any element:

```markdown
![Architecture diagram](assets/arch.svg)
{ id="img-arch" }

::: hotspot {target-slide="#slide-layer-detail" region="top-right" width="25%" height="30%" id="hs-layer" tooltip="Click to zoom into this layer"}
:::
```

### 8.5 Tooltips

```markdown
the **transformer architecture**
{ id="term-transformer" tooltip="A neural network model using self-attention mechanisms." }
```

---

## Part 9: Typography & Text

### 9.1 Semantic Type Scale

```markdown
### Revenue: $4.2M
{ id="stat-revenue" text-size="display" text-weight="black" text-align="center" }

Compared to last quarter's $2.3M baseline.
{ id="stat-context" text-size="caption" text-weight="light" text-align="center" }
```

`text-size`: `display` | `title` | `subtitle` | `body` | `caption` | `label`
`text-weight`: `thin` | `light` | `regular` | `medium` | `bold` | `black`

### 9.2 Text Alignment

```markdown
{ id="headline" text-align="center" }
{ id="body-copy" text-align="left" }
{ id="legal" text-align="justify" }
```

### 9.3 Semantic Color Tokens

```markdown
### Warning: Latency spike detected
{ id="alert-heading" text-color="brand-warning" }
```

`text-color` values: `brand-primary` | `brand-secondary` | `brand-accent` | `brand-success` | `brand-warning` | `brand-danger` | `brand-muted` | `brand-inverse`

### 9.4 Inline Text Formatting Extensions

```markdown
This approach is ~~deprecated~~ and ==no longer recommended==.
```

`~~text~~` → strikethrough rendering
`==text==` → highlight (brand-accent background)

### 9.5 Text Overflow

```markdown
::: column {id="col-summary" text-overflow="ellipsis" max-lines="4"}
```

---

## Part 10: Variables & Modularity

### 10.1 Variables

Declared in front matter, used with `{{token}}` anywhere in slide content, including attribute values and asset paths. Template `{{variables}}` are resolved from `@use()` arguments at instantiation time, not from front matter.

```markdown
# {{product}} — {{year}} Roadmap
© {{year}} {{company}}
![Logo]({{logo}})
```

### 10.2 Include / Import

```markdown
@include(slides/intro-section.slidedsl)
@include(components/team-bios.slidedsl)
@include(shared/legal-footer-slide.slidedsl)
```

Included files are parsed as if inlined at that position. They may contain slide `---` delimiters and section `===` delimiters.

### 10.3 Slide Templates

Define reusable slide structures once, instantiate many times:

```markdown
::: template {id="tpl-section-header"}
--- {layout="hero" bg-color="brand-dark" footer="false"}
# {{title}}
## {{subtitle}}
:::

::: template {id="tpl-stat-card"}
::: shape {type="rectangle" fill="brand-surface" id="card-{{id}}"}
### {{label}}
#### {{value}}
{ text-size="display" text-color="brand-accent" }
:::
:::
```

Instantiate with `@use()`:

```markdown
@use(tpl-section-header title="Architecture" subtitle="Core Systems")
@use(tpl-stat-card id="revenue" label="Revenue" value="$4.2M")
@use(tpl-stat-card id="uptime"  label="Uptime"  value="99.97%")
```

---

## Part 11: Accessibility & Export

### 11.1 Language Declaration

Front matter `language` field (see Section 1.1). Per-slide override on `---` delimiter.

### 11.2 ARIA Labels

On any non-image element where visual rendering lacks semantic meaning:

```markdown
::: chart {type="bar" id="chart-revenue" aria-label="Bar chart: Q1 420K, Q2 530K, Q3 610K, Q4 780K revenue"}
:::

::: shape {type="arrow" id="arrow-flow" aria-label="Arrow indicating data flows from ingestion to training"}
:::
```

Image `alt` text is covered by standard markdown `![]()` syntax.

### 11.3 Reading Order

Explicit override for screen readers when visual layout differs from logical order:

```markdown
::: grid {id="main-grid" columns="3" reading-order="1,3,2"}
```

Value is a comma-separated list of cell positions in logical reading order.

### 11.4 Export Hints

Declared in front matter (see Section 1.1). Per-slide screen/print targeting:

```
--- {id="slide-appendix"    print-only="true"}
--- {id="slide-animation"   screen-only="true"}
```
