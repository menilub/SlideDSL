---
title: "Full v2.0 Feature Test"
author: "Test Author"
version: "2.0"
language: "en-US"
default_voice: "en-US-Neural-F"
global_theme: "enterprise-dark"
transitions:
  default: "fade"
  duration: "0.5s"
progress_bar: true
slide_numbers: true
variables:
  company: "Acme Corp"
---

--- {id="slide-title" transition="fade"}

# Welcome to {{company}}
{ id="hero-title" animate="in: fade trigger=onload duration=0.8s" }

::: notes
Welcome to the presentation.
:::

--- {id="slide-content" bg-color="brand-dark"}

::: container {distribution="equal" gap="20px"}
::: column {id="col-left"}
## Left Column
* Item A
* Item B
:::
::: column {id="col-right"}
![Diagram](assets/arch.png)
{ id="img-arch" animate="in: fade trigger=onload duration=0.5s" }
:::
:::

::: notes
This slide shows a two-column layout.
:::

--- {id="slide-chart"}

::: chart {type="bar" id="chart-rev" aria-label="Revenue chart Q1 to Q4"}
labels: ["Q1", "Q2", "Q3", "Q4"]
datasets:
  - label: "Revenue"
    data: [420, 530, 610, 780]
    color: "brand-primary"
:::

::: notes
The chart shows quarterly revenue growth.
:::

--- {id="slide-code"}

```typescript
const x: number = 42;
```
{ id="code-snippet" }

::: notes
Here is some TypeScript code.
:::

--- {id="slide-diagram"}

::: diagram {type="mermaid" id="flow-1"}
graph TD
    A[Start] --> B[End]
:::

::: notes
A simple Mermaid diagram.
:::
