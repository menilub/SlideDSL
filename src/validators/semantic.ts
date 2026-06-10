import type { SlideDSLDocument, Issue, SlideElement } from '../parser/types.ts';

export function runSemantic(doc: SlideDSLDocument, filePath: string): Issue[] {
  const issues: Issue[] = [];

  // Collect document-level ids for cross-slide lookups
  const slideIds = new Set(doc.slides.map(s => s.id).filter(Boolean) as string[]);
  const allElements = doc.slides.flatMap(s => [...walkElements(s.elements)]);
  const keyframeIds = new Set(allElements.filter(e => e.type === 'keyframes').map(e => e.id).filter(Boolean) as string[]);
  const pathIds = new Set(allElements.filter(e => e.type === 'path').map(e => e.id).filter(Boolean) as string[]);
  const templateIds = new Set(allElements.filter(e => e.type === 'template').map(e => e.id).filter(Boolean) as string[]);

  // semantic/toc-anchor-missing
  const tocAnchor = doc.frontMatter.toc?.['insert-after'];
  if (doc.frontMatter.toc?.enabled && tocAnchor && !slideIds.has(tocAnchor)) {
    issues.push({ code: 'semantic/toc-anchor-missing', severity: 'error',
      line: doc.frontMatter.lineNumber, file: filePath,
      message: `toc.insert-after references slide id '${tocAnchor}' which does not exist.` });
  }

  for (const slide of doc.slides) {
    const slideElementIds = new Set(
      [...walkElements(slide.elements)].map(e => e.id).filter(Boolean) as string[]
    );
    const notesMarkers = new Set(slide.notes?.markers ?? []);
    const referencedMarkers = new Set<string>();

    for (const el of walkElements(slide.elements)) {
      const anim = el.animate;
      if (anim) {
        const trigger = anim.trigger;

        // semantic/undefined-trigger
        if (trigger.startsWith('after-') || trigger.startsWith('with-')) {
          const refId = trigger.startsWith('after-') ? trigger.slice(6) : trigger.slice(5);
          if (!slideElementIds.has(refId)) {
            issues.push({ code: 'semantic/undefined-trigger', severity: 'error',
              line: el.lineNumber, file: filePath,
              message: `Animation trigger '${trigger}' references id '${refId}' which does not exist on this slide.` });
          }
        }

        // semantic/marker-undefined
        if (trigger.startsWith('narrate-')) {
          const markerName = trigger.slice(8);
          referencedMarkers.add(markerName);
          if (!notesMarkers.has(markerName)) {
            issues.push({ code: 'semantic/marker-undefined', severity: 'error',
              line: el.lineNumber, file: filePath,
              message: `Animation trigger '${trigger}' references marker '${markerName}' not found in this slide's notes block.` });
          }
        }

        // semantic/keyframe-ref-undefined
        if (anim.effect === 'keyframe' && anim.ref && !keyframeIds.has(anim.ref)) {
          issues.push({ code: 'semantic/keyframe-ref-undefined', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `Animation references keyframes ref='${anim.ref}' but no ::: keyframes block with that id exists.` });
        }

        // semantic/path-ref-undefined
        if (anim.phase === 'move' && anim.ref && !pathIds.has(anim.ref)) {
          issues.push({ code: 'semantic/path-ref-undefined', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `Animation references path ref='${anim.ref}' but no ::: path block with that id exists.` });
        }

        // semantic/morph-target-undefined
        if (anim.effect === 'morph' && anim.target && !slideElementIds.has(anim.target)) {
          issues.push({ code: 'semantic/morph-target-undefined', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `Morph animation target='${anim.target}' does not exist on this slide.` });
        }
      }

      // semantic/template-use-missing
      if ((el.type as string) === 'use') {
        const ref = el.attributes?.['ref'];
        if (ref && !templateIds.has(ref)) {
          issues.push({ code: 'semantic/template-use-missing', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `@use references template id '${ref}' but no ::: template block with that id exists.` });
        }
      }

      // semantic/hotspot-target-undefined
      if (el.type === 'hotspot') {
        const targetSlide = el.attributes?.['target-slide']?.replace(/^#/, '');
        if (targetSlide && !slideIds.has(targetSlide)) {
          issues.push({ code: 'semantic/hotspot-target-undefined', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `Hotspot target-slide='#${targetSlide}' references a slide id that does not exist.` });
        }
      }
    }

    // semantic/unreferenced-marker
    for (const marker of notesMarkers) {
      if (!referencedMarkers.has(marker)) {
        issues.push({ code: 'semantic/unreferenced-marker', severity: 'error',
          line: slide.notes?.lineNumber ?? slide.startLine, file: filePath,
          message: `Notes marker '<marker: ${marker}>' has no corresponding trigger=narrate-${marker} animation on this slide.` });
      }
    }
  }

  return issues;
}

function* walkElements(elements: SlideElement[]): Generator<SlideElement> {
  for (const el of elements) {
    yield el;
    if (el.children) yield* walkElements(el.children);
  }
}
