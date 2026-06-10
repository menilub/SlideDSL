export interface SlideDSLDocument {
  frontMatter: FrontMatter;
  sections: Section[];
  slides: Slide[];
}

export interface FrontMatter {
  title: string;
  author?: string;
  version?: string;
  language?: string;
  aspect_ratio?: string;
  default_voice?: string;
  global_theme?: string;
  transitions?: TransitionsConfig;
  footer?: FooterConfig;
  header?: HeaderConfig;
  progress_bar?: boolean;
  slide_numbers?: boolean;
  background_music?: string;
  background_music_volume?: number;
  export?: ExportConfig;
  toc?: TocConfig;
  variables?: Record<string, string>;
  lineNumber: number;
}

export interface TransitionsConfig {
  default?: string;
  duration?: string;
  easing?: string;
}

export interface FooterConfig {
  left?: string;
  center?: string;
  right?: string;
  show?: boolean;
}

export interface HeaderConfig {
  left?: string;
  center?: string;
  right?: string;
  show?: boolean;
}

export interface ExportConfig {
  format?: 'mp4' | 'pdf' | 'pptx' | 'html' | 'png';
  quality?: '720p' | '1080p' | '4k';
  fps?: number;
  audio?: boolean;
  subtitles?: boolean;
  'subtitles-language'?: string;
  'print-layout'?: boolean;
}

export interface TocConfig {
  enabled?: boolean;
  'insert-after'?: string;
  depth?: 'sections' | 'slides';
}

export interface Section {
  id?: string;
  title?: string;
  theme?: string;
  'progress-color'?: string;
  'music-file'?: string;
  'music-volume'?: number;
  'music-fade-in'?: string;
  slides: Slide[];
  lineNumber: number;
}

export interface Slide {
  index: number;
  startLine: number;
  endLine: number;
  id?: string;
  label?: string;
  layout?: string;
  transition?: string;
  'transition-duration'?: string;
  'transition-easing'?: string;
  'duration-hint'?: string;
  hidden?: boolean;
  voice?: string;
  'voice-rate'?: number;
  'voice-pitch'?: string;
  language?: string;
  background?: SlideBackground;
  'print-only'?: boolean;
  'screen-only'?: boolean;
  sectionId?: string;
  elements: SlideElement[];
  notes?: NotesBlock;
}

export interface SlideBackground {
  type: 'color' | 'image' | 'gradient' | 'video';
  value: string;
  size?: string;
  position?: string;
  opacity?: number;
  from?: string;
  to?: string;
  angle?: string;
  muted?: boolean;
  loop?: boolean;
}

export type ElementType =
  | 'heading' | 'paragraph' | 'blockquote' | 'list' | 'table' | 'code' | 'math'
  | 'image' | 'video' | 'audio' | 'icon'
  | 'chart' | 'diagram' | 'shape' | 'hotspot'
  | 'container' | 'column' | 'grid' | 'cell'
  | 'keyframes' | 'path' | 'template';

export interface SlideElement {
  type: ElementType;
  level?: number;
  content?: string;
  id?: string;
  animate?: AnimationAttr;
  attributes?: Record<string, string>;
  children?: SlideElement[];
  lineNumber: number;
  src?: string;
  alt?: string;
  chartData?: ChartData;
  diagramSource?: string;
  keyframeStops?: KeyframeStop[];
  pathD?: string;
}

export interface AnimationAttr {
  phase: 'in' | 'out' | 'emphasis' | 'move';
  effect: string;
  trigger: string;
  duration: string;
  delay?: string;
  easing?: string;
  loop?: number | 'infinite';
  sfx?: string;
  'sfx-volume'?: number;
  ref?: string;
  target?: string;
  from?: string;
  to?: string;
  'char-delay'?: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'donut' | 'scatter' | 'area';
  labels?: string[];
  datasets: Array<{ label: string; data: number[]; color?: string }>;
}

export interface KeyframeStop {
  percent: number;
  props: Record<string, string>;
}

export interface NotesBlock {
  raw: string;
  markers: string[];
  voice?: string;
  'voice-rate'?: number;
  lineNumber: number;
}

export interface Issue {
  code: string;
  severity: 'error' | 'warning';
  line: number;
  message: string;
  file: string;
}

export class ParseError extends Error {
  readonly line?: number;
  constructor(message: string, line?: number) {
    super(message);
    this.name = 'ParseError';
    this.line = line;
  }
}
