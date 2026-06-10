import type { SlideDSLDocument, Issue, SlideElement } from '../parser/types.ts';

const VALID_TRANSITIONS = new Set([
  'none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down',
  'zoom', 'flip', 'morph', 'wipe',
]);

const VALID_EXPORT_FORMATS = new Set(['mp4', 'pdf', 'pptx', 'html', 'png']);

const VALID_PHASES = new Set(['in', 'out', 'emphasis', 'move']);

export function runStructural(doc: SlideDSLDocument, filePath: string): Issue[] {
  const issues: Issue[] = [];

  // structural/missing-title
  if (!doc.frontMatter.title?.trim()) {
    issues.push({ code: 'structural/missing-title', severity: 'error',
      line: doc.frontMatter.lineNumber, file: filePath,
      message: 'Front matter must include a non-empty title field.' });
  }

  // structural/invalid-export-format
  const fmt = doc.frontMatter.export?.format;
  if (fmt && !VALID_EXPORT_FORMATS.has(fmt)) {
    issues.push({ code: 'structural/invalid-export-format', severity: 'error',
      line: doc.frontMatter.lineNumber, file: filePath,
      message: `export.format '${fmt}' is not valid. Allowed: ${[...VALID_EXPORT_FORMATS].join(', ')}.` });
  }

  for (const slide of doc.slides) {
    // structural/invalid-transition-type
    if (slide.transition && !VALID_TRANSITIONS.has(slide.transition)) {
      issues.push({ code: 'structural/invalid-transition-type', severity: 'error',
        line: slide.startLine, file: filePath,
        message: `Transition '${slide.transition}' is not a valid transition type.` });
    }

    for (const el of walkElements(slide.elements)) {
      checkElement(el, filePath, issues);
    }
  }

  return issues;
}

function checkElement(el: SlideElement, filePath: string, issues: Issue[]): void {
  if (el.animate) {
    // structural/animation-invalid-phase
    if (!VALID_PHASES.has(el.animate.phase)) {
      issues.push({ code: 'structural/animation-invalid-phase', severity: 'error',
        line: el.lineNumber, file: filePath,
        message: `Animation phase '${el.animate.phase}' is not valid. Allowed: ${[...VALID_PHASES].join(', ')}.` });
    }

    // structural/animation-missing-field
    if (!el.animate.duration) {
      issues.push({ code: 'structural/animation-missing-field', severity: 'error',
        line: el.lineNumber, file: filePath,
        message: `Animation is missing required 'duration' field.` });
    }
  }

  // structural/chart-missing-datasets
  if (el.type === 'chart' && (!el.chartData || el.chartData.datasets.length === 0)) {
    issues.push({ code: 'structural/chart-missing-datasets', severity: 'error',
      line: el.lineNumber, file: filePath,
      message: '::: chart block must have at least one entry in datasets.' });
  }

  // structural/grid-missing-columns
  if (el.type === 'grid' && !el.attributes?.['columns']) {
    issues.push({ code: 'structural/grid-missing-columns', severity: 'error',
      line: el.lineNumber, file: filePath,
      message: '::: grid block must have a columns attribute.' });
  }

  // structural/template-missing-id
  if (el.type === 'template' && !el.id && !el.attributes?.['id']) {
    issues.push({ code: 'structural/template-missing-id', severity: 'error',
      line: el.lineNumber, file: filePath,
      message: '::: template block must have an id attribute.' });
  }

  // structural/keyframe-invalid-stop
  if (el.type === 'keyframes' && el.keyframeStops) {
    for (const stop of el.keyframeStops) {
      if (stop.percent < 0 || stop.percent > 100) {
        issues.push({ code: 'structural/keyframe-invalid-stop', severity: 'error',
          line: el.lineNumber, file: filePath,
          message: `Keyframe stop ${stop.percent}% is outside the valid range 0–100.` });
      }
    }
  }
}

function* walkElements(elements: SlideElement[]): Generator<SlideElement> {
  for (const el of elements) {
    yield el;
    if (el.children) yield* walkElements(el.children);
  }
}
