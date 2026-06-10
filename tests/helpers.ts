import type { SlideDSLDocument, FrontMatter, Section, Slide, SlideElement, NotesBlock } from '../src/parser/types.ts';

export function buildFrontMatter(overrides: Partial<FrontMatter> = {}): FrontMatter {
  return { title: 'Test Deck', lineNumber: 1, ...overrides };
}

export function buildNotes(overrides: Partial<NotesBlock> = {}): NotesBlock {
  return { raw: 'Speaker notes.', markers: [], lineNumber: 99, ...overrides };
}

export function buildElement(overrides: Partial<SlideElement> = {}): SlideElement {
  return { type: 'paragraph', content: 'text', lineNumber: 10, ...overrides };
}

export function buildSlide(overrides: Partial<Slide> = {}): Slide {
  return {
    index: 0, startLine: 5, endLine: 20,
    elements: [],
    ...overrides,
  };
}

export function buildDoc(overrides: {
  slides?: Slide[];
  sections?: Section[];
  frontMatter?: FrontMatter;
} = {}): SlideDSLDocument {
  const slides = overrides.slides ?? [];
  const sections = overrides.sections ?? [{ slides, lineNumber: 1 }];
  return {
    frontMatter: overrides.frontMatter ?? buildFrontMatter(),
    sections,
    slides,
  };
}
