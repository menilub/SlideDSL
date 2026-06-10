import type { SlideDSLDocument, FrontMatter, Section, Slide, SlideElement, AnimationAttr, ChartData, KeyframeStop } from './types.ts';
import { ParseError } from './types.ts';
import { parseAttributes, parseAnimationAttr } from './attrParser.ts';
import { parseDirective } from './directiveParser.ts';

type BlockType = 'container' | 'grid' | 'column' | 'cell' | 'chart' | 'notes' |
  'hotspot' | 'keyframes' | 'path' | 'shape' | 'template' | 'diagram';

type Phase = 'front_matter' | 'content';

interface ParserState {
  phase: Phase;
  frontMatterLines: string[];
  frontMatterStart: number;
  sections: Section[];
  slides: Slide[];
  currentSection: Section;
  currentSlide: Slide | null;
  slideIndex: number;
  blockStack: Array<{ type: BlockType; element: SlideElement; startLine: number }>;
  inCodeFence: boolean;
  codeFenceStartLine: number;
  codeFenceLang: string;
  codeFenceLines: string[];
  inMathBlock: boolean;
  mathBlockStartLine: number;
  mathLines: string[];
  tableLines: string[];
  inTable: boolean;
  pendingAttrTarget: SlideElement | null;
  lineNumber: number;
}

export function parseDocument(src: string, _filePath: string): SlideDSLDocument {
  const lines = src.split('\n');
  const defaultSection: Section = { slides: [], lineNumber: 1 };
  const state: ParserState = {
    phase: 'content',
    frontMatterLines: [],
    frontMatterStart: 1,
    sections: [defaultSection],
    slides: [],
    currentSection: defaultSection,
    currentSlide: null,
    slideIndex: 0,
    blockStack: [],
    inCodeFence: false,
    codeFenceStartLine: 0,
    codeFenceLang: '',
    codeFenceLines: [],
    inMathBlock: false,
    mathBlockStartLine: 0,
    mathLines: [],
    tableLines: [],
    inTable: false,
    pendingAttrTarget: null,
    lineNumber: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    state.lineNumber = i + 1;
    processLine(lines[i], i + 1, state);
  }

  // Flush any trailing table
  if (state.inTable && state.tableLines.length > 0) flushTable(state);

  finalizeSlide(state, state.lineNumber);

  const frontMatter = state.frontMatterLines.length > 0
    ? parseFrontMatterYaml(state.frontMatterLines, state.frontMatterStart)
    : { title: '', lineNumber: 1 };

  return {
    frontMatter,
    sections: state.sections,
    slides: state.slides,
  };
}

function processLine(line: string, lineNum: number, state: ParserState): void {
  // Front matter open
  if (lineNum === 1 && line.trim() === '---') {
    state.phase = 'front_matter';
    state.frontMatterStart = lineNum;
    return;
  }

  // Front matter close
  if (state.phase === 'front_matter' && line.trim() === '---') {
    state.phase = 'content';
    return;
  }

  if (state.phase === 'front_matter') {
    state.frontMatterLines.push(line);
    return;
  }

  // Track attribute lines (must come before code fence check)
  if (state.phase === 'content' && !state.inCodeFence && !state.inMathBlock) {
    const attrLine = line.match(/^\s*\{(.*)\}\s*$/);
    if (attrLine) {
      const attrs = parseAttributes(line.trim());
      if (state.pendingAttrTarget) {
        applyAttributes(state.pendingAttrTarget, attrs);
        state.pendingAttrTarget = null;
      }
      return;
    }
  }

  // Code fence handling
  if (state.inCodeFence) {
    if (line.startsWith('```')) {
      // Close code fence
      const el: SlideElement = {
        type: 'code',
        content: state.codeFenceLines.join('\n'),
        lineNumber: state.codeFenceStartLine,
        attributes: state.codeFenceLang ? { lang: state.codeFenceLang } : undefined,
      };
      state.inCodeFence = false;
      state.pendingAttrTarget = el;
      appendElement(el, state);
    } else {
      state.codeFenceLines.push(line);
    }
    return;
  }

  // Math block handling
  if (state.inMathBlock) {
    if (line.trim() === '$$') {
      const el: SlideElement = { type: 'math', content: state.mathLines.join('\n'), lineNumber: state.mathBlockStartLine };
      state.inMathBlock = false;
      state.mathLines = [];
      appendElement(el, state);
    } else {
      state.mathLines.push(line);
    }
    return;
  }

  // Open code fence
  if (line.startsWith('```')) {
    if (state.inTable) { flushTable(state); }
    if (!state.currentSlide) openSlide({}, lineNum, state);
    state.inCodeFence = true;
    state.codeFenceStartLine = lineNum;
    state.codeFenceLang = line.slice(3).trim();
    state.codeFenceLines = [];
    return;
  }

  // Open math block
  if (line.trim() === '$$') {
    if (state.inTable) { flushTable(state); }
    if (!state.currentSlide) openSlide({}, lineNum, state);
    state.inMathBlock = true;
    state.mathBlockStartLine = lineNum;
    state.mathLines = [];
    return;
  }

  // Table rows
  if (line.trim().startsWith('|')) {
    if (!state.currentSlide) openSlide({}, lineNum, state);
    state.tableLines.push(line);
    state.inTable = true;
    return;
  } else if (state.inTable) {
    flushTable(state);
  }

  const trimmed = line.trim();

  // Slide delimiter: --- or --- {attrs}
  const slideMatch = line.match(/^---\s*(\{.*\})?\s*$/);
  if (slideMatch && state.phase === 'content') {
    finalizeSlide(state, lineNum);
    const attrs = slideMatch[1] ? parseAttributes(slideMatch[1]) : {};
    openSlide(attrs, lineNum, state);
    return;
  }

  // Section delimiter: === Title {attrs}
  const sectionMatch = line.match(/^===\s*(.*?)(\{.*\})?\s*$/);
  if (sectionMatch) {
    finalizeSlide(state, lineNum);
    const attrs = sectionMatch[2] ? parseAttributes(sectionMatch[2]) : {};
    const section: Section = {
      id: attrs['id'],
      title: sectionMatch[1].trim() || undefined,
      theme: attrs['theme'],
      'progress-color': attrs['progress-color'] as any,
      'music-file': attrs['music-file'] as any,
      slides: [],
      lineNumber: lineNum,
    };
    state.sections.push(section);
    state.currentSection = section;
    return;
  }

  // ::: block open
  const blockOpen = trimmed.match(/^:::\s+(\w+)(?:\s+(\{.*\}))?\s*$/);
  if (blockOpen) {
    if (state.inTable) { flushTable(state); }
    if (!state.currentSlide) openSlide({}, lineNum, state);
    const VALID_BLOCK_TYPES = new Set(['container', 'grid', 'column', 'cell', 'chart', 'notes',
      'hotspot', 'keyframes', 'path', 'shape', 'template', 'diagram']);
    const blockTypeName = blockOpen[1];
    if (!VALID_BLOCK_TYPES.has(blockTypeName)) return; // skip unknown blocks
    const blockType = blockTypeName as BlockType;
    const attrs = blockOpen[2] ? parseAttributes(blockOpen[2]) : {};
    const el: SlideElement = { type: blockType as ElementType, lineNumber: lineNum, children: [], attributes: attrs };
    if (attrs['id']) el.id = attrs['id'];
    state.blockStack.push({ type: blockType, element: el, startLine: lineNum });
    return;
  }

  // ::: block close
  if (trimmed === ':::') {
    if (state.blockStack.length > 0) {
      const popped = state.blockStack.pop()!;
      if (popped.type === 'notes') {
        const notesEl = popped.element;
        const raw = notesEl.content ?? '';
        const markers = [...raw.matchAll(/<marker:\s*([\w-]+)>/g)].map(m => m[1]);
        if (state.currentSlide) {
          state.currentSlide.notes = {
            raw,
            markers,
            voice: notesEl.attributes?.['voice'],
            'voice-rate': notesEl.attributes?.['voice-rate'] ? Number(notesEl.attributes['voice-rate']) : undefined,
            lineNumber: popped.startLine,
          };
        }
      } else {
        // Finalize chart data
        if (popped.type === 'chart') {
          const chartType = popped.element.attributes?.['type'] ?? 'bar';
          popped.element.chartData = parseChartData(popped.element.content ?? '', chartType);
        }

        // Finalize keyframe stops
        if (popped.type === 'keyframes') {
          popped.element.keyframeStops = parseKeyframeStops(popped.element.content ?? '');
        }

        // Finalize path
        if (popped.type === 'path') {
          popped.element.pathD = popped.element.content?.trim();
        }

        appendElement(popped.element, state);
      }
    }
    return;
  }

  // Content inside a block — accumulate as raw text for notes; dispatch for others
  if (state.blockStack.length > 0) {
    const top = state.blockStack[state.blockStack.length - 1];
    if (top.type === 'notes') {
      top.element.content = (top.element.content ?? '') + (top.element.content ? '\n' : '') + line;
    } else if (top.type === 'chart' || top.type === 'keyframes' || top.type === 'path' || top.type === 'diagram') {
      top.element.content = (top.element.content ?? '') + (top.element.content ? '\n' : '') + line;
    } else {
      // For container/grid/column/etc., dispatch content as child elements
      if (trimmed) dispatchContent(line, lineNum, state);
    }
    return;
  }

  // Don't open a slide on blank lines — wait for actual content
  if (!trimmed) {
    state.pendingAttrTarget = null;
    return;
  }

  if (!state.currentSlide) openSlide({}, lineNum, state);

  dispatchContent(line, lineNum, state);
}

function openSlide(attrs: Record<string, string>, lineNum: number, state: ParserState): void {
  const slide: Slide = {
    index: state.slideIndex++,
    startLine: lineNum,
    endLine: lineNum,
    sectionId: state.currentSection.id,
    elements: [],
  };
  if (attrs['id']) slide.id = attrs['id'];
  if (attrs['transition']) slide.transition = attrs['transition'];
  if (attrs['hidden'] === 'true') slide.hidden = true;
  if (attrs['duration-hint']) slide['duration-hint'] = attrs['duration-hint'];
  slide.background = parseBackground(attrs);
  state.currentSlide = slide;
  state.currentSection.slides.push(slide);
}

function finalizeSlide(state: ParserState, lineNum: number): void {
  if (state.currentSlide) {
    state.currentSlide.endLine = lineNum;
    state.slides.push(state.currentSlide);
    state.currentSlide = null;
  }
}

function parseBackground(attrs: Record<string, string>): Slide['background'] {
  if (attrs['bg-color']) return { type: 'color', value: attrs['bg-color'] };
  if (attrs['bg-image']) return {
    type: 'image', value: attrs['bg-image'],
    size: attrs['bg-size'],
    position: attrs['bg-position'],
    opacity: attrs['bg-opacity'] ? Number(attrs['bg-opacity']) : undefined,
  };
  if (attrs['bg-gradient']) return {
    type: 'gradient', value: attrs['bg-gradient'],
    from: attrs['bg-gradient-from'], to: attrs['bg-gradient-to'],
    angle: attrs['bg-gradient-angle'],
  };
  if (attrs['bg-video']) return {
    type: 'video', value: attrs['bg-video'],
    muted: attrs['bg-video-muted'] !== 'false',
    loop: attrs['bg-video-loop'] !== 'false',
  };
  return undefined;
}

function applyAttributes(el: SlideElement, attrs: Record<string, string>): void {
  if (attrs['id']) el.id = attrs['id'];
  if (attrs['animate']) {
    try {
      el.animate = parseAnimationAttr(attrs['animate']);
    } catch {
      // Store partial parse so structural validator can catch phase/duration errors
      const raw = attrs['animate'];
      const phaseMatch = raw.match(/^(\w+):/);
      const phase = (phaseMatch?.[1] ?? '') as AnimationAttr['phase'];
      const afterColon = raw.slice(raw.indexOf(':') + 1).trim().split(/\s+/);
      const effect = afterColon[0] ?? '';
      const kv: Record<string, string> = {};
      for (const p of afterColon.slice(1)) {
        const eqIdx = p.indexOf('=');
        if (eqIdx > 0) kv[p.slice(0, eqIdx)] = p.slice(eqIdx + 1);
      }
      el.animate = {
        phase,
        effect,
        trigger: kv['trigger'] ?? 'onload',
        duration: kv['duration'] ?? '',
      };
    }
  }
  if (!el.attributes) el.attributes = {};
  Object.assign(el.attributes, attrs);
}

function appendElement(el: SlideElement, state: ParserState): void {
  if (state.blockStack.length > 0) {
    const top = state.blockStack[state.blockStack.length - 1];
    if (!top.element.children) top.element.children = [];
    top.element.children.push(el);
    state.pendingAttrTarget = el;
  } else if (state.currentSlide) {
    state.currentSlide.elements.push(el);
    state.pendingAttrTarget = el;
  }
}

function dispatchContent(line: string, lineNum: number, state: ParserState): void {
  const trimmed = line.trim();
  if (!trimmed) {
    state.pendingAttrTarget = null;
    return;
  }

  // @directive
  if (trimmed.startsWith('@')) {
    try {
      const dir = parseDirective(trimmed);
      const el: SlideElement = { type: dir.name as ElementType, attributes: dir.args as Record<string, string>, lineNumber: lineNum };
      if (dir.args['id']) el.id = dir.args['id'];
      appendElement(el, state);
    } catch { /* skip unknown directives */ }
    return;
  }

  // Heading
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
  if (headingMatch) {
    const el: SlideElement = { type: 'heading', level: headingMatch[1].length, content: headingMatch[2], lineNumber: lineNum };
    appendElement(el, state);
    return;
  }

  // Blockquote
  if (trimmed.startsWith('> ')) {
    const el: SlideElement = { type: 'blockquote', content: trimmed.slice(2), lineNumber: lineNum };
    appendElement(el, state);
    return;
  }

  // Unordered list
  if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
    const el: SlideElement = { type: 'list', content: trimmed.slice(2), lineNumber: lineNum };
    appendElement(el, state);
    return;
  }

  // Ordered list
  if (/^\d+\.\s/.test(trimmed)) {
    const el: SlideElement = { type: 'list', content: trimmed.replace(/^\d+\.\s/, ''), lineNumber: lineNum };
    appendElement(el, state);
    return;
  }

  // Image
  const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
  if (imgMatch) {
    const el: SlideElement = { type: 'image', content: imgMatch[1], attributes: { src: imgMatch[2] }, lineNumber: lineNum };
    appendElement(el, state);
    return;
  }

  // Paragraph (fallback)
  const el: SlideElement = { type: 'paragraph', content: trimmed, lineNumber: lineNum };
  appendElement(el, state);
}

function flushTable(state: ParserState): void {
  if (state.tableLines.length === 0) return;
  const el: SlideElement = { type: 'table', content: state.tableLines.join('\n'), lineNumber: state.lineNumber };
  appendElement(el, state);
  state.tableLines = [];
  state.inTable = false;
}

function parseFrontMatterYaml(lines: string[], startLine: number): FrontMatter {
  const fm: FrontMatter = { title: '', lineNumber: startLine };
  // Simple YAML parser for the fields we need
  const text = lines.join('\n');

  // Parse using a basic approach — read key: value pairs and nested objects
  const obj = parseSimpleYaml(text);

  fm.title = (obj['title'] as string | undefined) ?? '';
  if (obj['author']) fm.author = obj['author'] as string;
  if (obj['version']) fm.version = obj['version'] as string;
  if (obj['language']) fm.language = obj['language'] as string;
  if (obj['default_voice']) fm.default_voice = obj['default_voice'] as string;
  if (obj['global_theme']) fm.global_theme = obj['global_theme'] as string;
  if (obj['progress_bar'] !== undefined) fm.progress_bar = obj['progress_bar'] === true || obj['progress_bar'] === 'true';
  if (obj['slide_numbers'] !== undefined) fm.slide_numbers = obj['slide_numbers'] === true || obj['slide_numbers'] === 'true';

  const vars = obj['variables'] as Record<string, unknown> | undefined;
  if (vars) fm.variables = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)]));

  const header = obj['header'] as Record<string, unknown> | undefined;
  if (header) fm.header = {
    left: getString(header, 'left'),
    center: getString(header, 'center'),
    right: getString(header, 'right'),
    show: typeof header['show'] === 'boolean' ? header['show'] : undefined,
  };

  const footer = obj['footer'] as Record<string, unknown> | undefined;
  if (footer) fm.footer = {
    left: getString(footer, 'left'),
    center: getString(footer, 'center'),
    right: getString(footer, 'right'),
    show: typeof footer['show'] === 'boolean' ? footer['show'] : undefined,
  };

  const exp = obj['export'] as Record<string, unknown> | undefined;
  if (exp) fm.export = {
    format: getString(exp, 'format') as any,
    quality: getString(exp, 'quality') as any,
    fps: exp['fps'] ? Number(exp['fps']) : undefined,
    audio: exp['audio'] === true || exp['audio'] === 'true',
    subtitles: exp['subtitles'] === true || exp['subtitles'] === 'true',
    'subtitles-language': getString(exp, 'subtitles-language'),
  };

  const toc = obj['toc'] as Record<string, unknown> | undefined;
  if (toc) fm.toc = {
    enabled: toc['enabled'] === true || toc['enabled'] === 'true',
    depth: getString(toc, 'depth') as any,
    'insert-after': getString(toc, 'insert-after'),
  };

  const trans = obj['transitions'] as Record<string, unknown> | undefined;
  if (trans) fm.transitions = {
    default: getString(trans, 'default'),
    duration: getString(trans, 'duration'),
    easing: getString(trans, 'easing'),
  };

  return fm;
}

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n');
  let i = 0;

  function parseValue(raw: string): unknown {
    const trimmed = raw.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null' || trimmed === '~') return null;
    const n = Number(trimmed);
    if (!isNaN(n) && trimmed !== '') return n;
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  function parseBlock(indent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
      if (lineIndent < indent) break;
      const kvMatch = line.match(/^(\s*)([\w_-]+):\s*(.*)/);
      if (!kvMatch) { i++; continue; }
      const key = kvMatch[2];
      const rest = kvMatch[3].trim();
      i++;
      if (rest === '' || rest === '|' || rest === '>') {
        // Nested block
        if (i < lines.length) {
          const nextLine = lines[i];
          const nextIndent = nextLine.match(/^(\s*)/)?.[1].length ?? 0;
          if (nextIndent > lineIndent) {
            // Check if it's a list
            if (nextLine.trim().startsWith('- ')) {
              const arr: unknown[] = [];
              while (i < lines.length) {
                const l = lines[i];
                if (!l.trim()) { i++; continue; }
                const li = l.match(/^(\s*)/)?.[1].length ?? 0;
                if (li < nextIndent) break;
                const listMatch = l.match(/^\s*-\s+(.*)/);
                if (listMatch) {
                  const rest2 = listMatch[1].trim();
                  i++;
                  if (rest2 === '' || rest2.endsWith(':')) {
                    arr.push(parseBlock(li + 2));
                  } else {
                    arr.push(parseValue(rest2));
                  }
                } else {
                  i++;
                }
              }
              obj[key] = arr;
            } else {
              obj[key] = parseBlock(nextIndent);
            }
          } else {
            obj[key] = '';
          }
        }
      } else {
        obj[key] = parseValue(rest);
      }
    }
    return obj;
  }

  i = 0;
  return parseBlock(0);
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function parseChartData(raw: string, chartType: string): ChartData {
  const lines = raw.split('\n').filter(l => l.trim());
  const result: ChartData = {
    type: chartType as ChartData['type'],
    datasets: [],
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('labels:')) {
      // labels: ["Q1", "Q2"]
      const match = line.match(/labels:\s*(\[.*\])/);
      if (match) {
        try {
          result.labels = JSON.parse(match[1].replace(/'/g, '"'));
        } catch { /* ignore */ }
      }
      i++;
      continue;
    }

    if (line === 'datasets:') {
      i++;
      while (i < lines.length) {
        const dLine = lines[i];
        const labelMatch = dLine.match(/^\s*-\s+label:\s+"?([^"]+)"?/);
        if (!labelMatch) { i++; continue; }
        const dataset: { label: string; data: number[]; color?: string } = {
          label: labelMatch[1],
          data: [],
        };
        i++;
        while (i < lines.length) {
          const inner = lines[i].trim();
          if (inner.startsWith('data:')) {
            const dataMatch = inner.match(/data:\s*(\[.*\])/);
            if (dataMatch) {
              try { dataset.data = JSON.parse(dataMatch[1]); } catch { /* ignore */ }
            }
          } else if (inner.startsWith('color:')) {
            dataset.color = inner.replace(/^color:\s*/, '').replace(/"/g, '');
          } else if (inner.startsWith('- ') || inner.startsWith('label:')) {
            break;
          }
          i++;
        }
        result.datasets.push(dataset);
      }
      continue;
    }

    i++;
  }
  return result;
}

function parseKeyframeStops(raw: string): KeyframeStop[] {
  const stops: KeyframeStop[] = [];
  for (const line of raw.split('\n')) {
    const match = line.trim().match(/^(\d+)%\s*\{(.*)\}/);
    if (!match) continue;
    const percent = Number(match[1]);
    const propsRaw = match[2];
    const props: Record<string, string> = {};
    for (const kv of propsRaw.matchAll(/([\w-]+)="([^"]*)"/g)) {
      props[kv[1]] = kv[2];
    }
    stops.push({ percent, props });
  }
  return stops;
}
