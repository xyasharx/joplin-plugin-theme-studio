import { themes, ThemePalette } from './themes';

export interface StyleOptions {
  themeKey: string;
  direction: string;
  fontPreset: string;
  fontFamily: string;
  codeFontPreset: string;
  codeFont: string;
  fontSize: string;
  lineHeight: string;
  contentMaxWidth: string;
  pdfExportStyle: string;
  headingSizePreset?: string;
  customHeadingSizes?: string;
  pdfPageSize?: string;
  pdfPageMargin?: string;
  customPdfMargin?: string;
  customCss?: string;
}

/**
 * Where the document stylesheet will live.
 *  - 'viewer'  : Markdown viewer / PDF export (scoped to `#rendered-md`).
 *  - 'tinymce' : Rich Text editor iframe (scoped to `body#tinymce`).
 * Each target only receives the selectors it can actually match, which
 * roughly halves the CSS the browser has to parse on every render.
 */
export type CssTarget = 'viewer' | 'tinymce';

const DEFAULT_FONT_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
const DEFAULT_CODE_FONT_STACK = `'Cascadia Code', 'Fira Code', 'Consolas', monospace`;

const PDF_PAGE_SIZES = new Set(['a4', 'letter', 'a5', 'a3', 'legal', 'auto']);
const PDF_PAGE_MARGINS: Record<string, string> = {
  standard: '15mm 18mm',
  comfortable: '20mm 20mm',
  compact: '8mm 10mm',
  none: '0',
};

const HEADING_PRESETS: Record<string, Record<string, string>> = {
  balanced: { h1: '1.75em', h2: '1.42em', h3: '1.25em', h4: '1.12em', h5: '1.05em', h6: '1.0em' },
  large: { h1: '2.15em', h2: '1.7em', h3: '1.4em', h4: '1.22em', h5: '1.1em', h6: '1.0em' },
  compact: { h1: '1.5em', h2: '1.3em', h3: '1.18em', h4: '1.08em', h5: '1.02em', h6: '0.95em' },
};

/**
 * Conservative whitespace/comment compaction. The document stylesheet is
 * generated once per configuration but re-parsed by the browser on every
 * render, so bytes matter. Deliberately never touches `:` (attribute
 * selectors such as `[style*="font-weight: bold"]`, `@media (max-width: …)`
 * and URLs) and never removes single spaces inside values.
 */
function compactCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

// ---------------------------------------------------------------------------
// Code-token colours.
//
// The palette hues are designed for headings, which are large and bold. Used
// as syntax colours on a code block, several of them fall below 3:1 contrast
// (gruvbox-light numbers reach 1.97:1 against their own code background), so
// each value is nudged towards black or white until it stays readable. The
// adjustment is small in dark themes and only touches colours that need it.
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mixChannel(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount);
}

function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** Returns `color` adjusted until it reaches `minRatio` against `background`. */
function ensureReadable(color: string, background: string, minRatio = 3): string {
  const fg = hexToRgb(color);
  const bg = hexToRgb(background);
  if (!fg || !bg || contrastRatio(fg, bg) >= minRatio) return color;

  const lighten = relativeLuminance(bg) < 0.5;
  const target: [number, number, number] = lighten ? [255, 255, 255] : [0, 0, 0];

  let best = color;
  for (let step = 1; step <= 20; step++) {
    const mixed = fg.map((c, i) => mixChannel(c, target[i], step * 0.05)) as [number, number, number];
    best = toHex(mixed);
    if (contrastRatio(mixed, bg) >= minRatio) break;
  }
  return best;
}

/** Emits the resolved syntax colours for the current theme. */
function buildTokenVariables(theme: ThemePalette): string {
  const v = theme.variables;
  const bg = v['--od-pre-bg'] || v['--od-bg'];
  const map: Record<string, string> = {
    '--od-tok-keyword': v['--od-h4'],
    '--od-tok-string': v['--od-h3'],
    '--od-tok-number': v['--od-h6'],
    '--od-tok-function': v['--od-h2'],
    '--od-tok-type': v['--od-h5'],
    '--od-tok-tag': v['--od-h1'],
    '--od-tok-comment': v['--od-comment'],
    '--od-tok-fg': v['--od-fg'],
    '--od-tok-accent': v['--od-link'],
  };

  let css = ':root {\n';
  for (const [key, value] of Object.entries(map)) {
    css += `  ${key}: ${ensureReadable(value, bg)};\n`;
  }
  css += '}\n';
  return css;
}

function resolveTheme(options: StyleOptions): ThemePalette {
  return themes[options.themeKey] || themes['atom-one-dark'];
}

function buildCssVariables(theme: ThemePalette, extra = ''): string {
  let css = ':root {\n';
  for (const [key, value] of Object.entries(theme.variables)) {
    css += `  ${key}: ${value};\n`;
  }
  css += extra;
  css += '}\n';
  return css;
}

function resolvePdfSettings(options: StyleOptions) {
  const pageSize = options.pdfPageSize && PDF_PAGE_SIZES.has(options.pdfPageSize) ? options.pdfPageSize : 'a4';

  let margin: string;
  if (options.pdfPageMargin === 'custom') {
    margin = options.customPdfMargin?.trim() || PDF_PAGE_MARGINS.standard;
  } else {
    margin = PDF_PAGE_MARGINS[options.pdfPageMargin || 'standard'] || PDF_PAGE_MARGINS.standard;
  }

  return { pageSize, margin };
}

function resolveHeadingSizes(options: StyleOptions) {
  const defaultSizes = HEADING_PRESETS.balanced;
  const preset = options.headingSizePreset || 'balanced';

  if (preset === 'large' || preset === 'compact') {
    return HEADING_PRESETS[preset];
  }

  if (preset === 'custom' && options.customHeadingSizes) {
    const parts = options.customHeadingSizes
      .split(',')
      .map((s) => s.replace(/h[1-6]:?/gi, '').trim())
      .filter((s) => s.length > 0);

    return {
      h1: parts[0] || defaultSizes.h1,
      h2: parts[1] || defaultSizes.h2,
      h3: parts[2] || defaultSizes.h3,
      h4: parts[3] || defaultSizes.h4,
      h5: parts[4] || defaultSizes.h5,
      h6: parts[5] || defaultSizes.h6,
    };
  }

  return defaultSizes;
}

function resolveFonts(options: StyleOptions) {
  let fontImport = '';
  let resolvedFont = options.fontFamily;

  switch (options.fontPreset) {
    case 'inter':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');\n`;
      resolvedFont = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      break;
    case 'roboto':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');\n`;
      resolvedFont = `'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`;
      break;
    case 'vazirmatn':
      fontImport += `@import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');\n`;
      resolvedFont = `'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      break;
    case 'noto-arabic':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');\n`;
      resolvedFont = `'Noto Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif`;
      break;
    case 'noto-cjk-sc':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap');\n`;
      resolvedFont = `'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      break;
    case 'noto-cjk-jp':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');\n`;
      resolvedFont = `'Noto Sans JP', 'Hiragino Sans', 'Meiryo', sans-serif`;
      break;
    case 'heebo':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&display=swap');\n`;
      resolvedFont = `'Heebo', -apple-system, BlinkMacSystemFont, sans-serif`;
      break;
    case 'noto-devanagari':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');\n`;
      resolvedFont = `'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif`;
      break;
    case 'lora':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');\n`;
      resolvedFont = `'Lora', Georgia, serif`;
      break;
    case 'system':
      resolvedFont = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
      break;
    case 'custom':
    default:
      resolvedFont = options.fontFamily || DEFAULT_FONT_STACK;
      break;
  }

  let resolvedCodeFont = options.codeFont;
  switch (options.codeFontPreset) {
    case 'fira-code':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap');\n`;
      resolvedCodeFont = `'Fira Code', monospace`;
      break;
    case 'jetbrains-mono':
      fontImport += `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');\n`;
      resolvedCodeFont = `'JetBrains Mono', monospace`;
      break;
    case 'system-mono':
      resolvedCodeFont = `'Cascadia Code', 'Consolas', 'Courier New', monospace`;
      break;
    case 'custom':
    default:
      resolvedCodeFont = options.codeFont || DEFAULT_CODE_FONT_STACK;
      break;
  }

  return { fontImport, resolvedFont, resolvedCodeFont };
}

// =================================================================
// 1. MARKDOWN EDITOR (CodeMirror 6, CodeMirror 5 & TinyMCE) ENGINE
// =================================================================
export function buildEditorCss(options: StyleOptions): string {
  const selectedTheme = resolveTheme(options);
  const { fontImport, resolvedFont, resolvedCodeFont } = resolveFonts(options);
  const cssVariables = buildCssVariables(selectedTheme);

  let dirCss = '';
  if (options.direction === 'rtl') {
    dirCss = `
      .cm-content, .CodeMirror-lines, body#tinymce {
        direction: rtl !important;
        text-align: right !important;
      }
    `;
  } else if (options.direction === 'auto') {
    dirCss = `
      .cm-content, .CodeMirror-lines, body#tinymce {
        unicode-bidi: plaintext !important;
        text-align: start !important;
      }
    `;
  } else {
    dirCss = `
      .cm-content, .CodeMirror-lines, body#tinymce {
        direction: ltr !important;
        text-align: left !important;
      }
    `;
  }

  return `
${fontImport}
${cssVariables}

/* Outer editor container & scroller get the theme background */
html body div.cm-editor,
html body div.cm-editor .cm-scroller,
html body div.CodeMirror,
html body .r-markdown-editor {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  font-family: ${resolvedFont} !important;
}

/* Content and lines MUST remain transparent so CodeMirror's selection layer is visible */
.cm-content,
.cm-line,
.CodeMirror-lines,
.CodeMirror-sizer {
  background-color: transparent !important;
}

.cm-content, .CodeMirror-lines {
  font-size: ${options.fontSize} !important;
  line-height: ${options.lineHeight} !important;
  caret-color: var(--od-link) !important;
}

${dirCss}

/* Gutters & Line Numbers */
.cm-gutters, .CodeMirror-gutters {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-comment) !important;
  border-right: 1px solid var(--od-border) !important;
}
.cm-activeLineGutter {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-h2) !important;
  font-weight: bold !important;
}
.cm-activeLine, .CodeMirror-activeline-background {
  background-color: rgba(127, 127, 127, 0.08) !important;
}

/* Cursor & Selection (Fully unmasked for CodeMirror 6 and CodeMirror 5) */
.CodeMirror-cursor,
.cm-cursor,
.cm-dropCursor {
  border-left: 2px solid var(--od-link) !important;
  border-left-color: var(--od-link) !important;
}
.cm-lineNumbers .cm-gutterElement {
  color: var(--od-comment) !important;
}
.cm-selectionBackground,
.cm-editor .cm-selectionLayer .cm-selectionBackground,
.cm-content ::selection,
.cm-line ::selection,
.CodeMirror-selected,
.CodeMirror-focused .CodeMirror-selected,
::selection {
  background-color: var(--od-selection) !important;
}

/* Syntax Highlighting in Markdown Editor */
.cm-header-1, .tok-heading-1 { color: var(--od-h1) !important; font-weight: 700 !important; }
.cm-header-2, .tok-heading-2 { color: var(--od-h2) !important; font-weight: 700 !important; }
.cm-header-3, .tok-heading-3 { color: var(--od-h3) !important; font-weight: 600 !important; }
.cm-header-4, .tok-heading-4 { color: var(--od-h4) !important; font-weight: 600 !important; }
.cm-header-5, .tok-heading-5 { color: var(--od-h5) !important; }
.cm-header-6, .tok-heading-6 { color: var(--od-h6) !important; }

.cm-link, .tok-link { color: var(--od-link) !important; text-decoration: underline !important; }
.cm-url, .tok-url { color: var(--od-link-hover) !important; }
.cm-strong, .tok-strong { font-weight: bold !important; color: var(--od-fg) !important; }
.cm-em, .tok-emphasis { font-style: italic !important; }
.cm-comment, .tok-comment { color: var(--od-comment) !important; }
.cm-quote, .tok-quote { color: var(--od-comment) !important; font-style: italic !important; }

.tok-monospace, .cm-inline-code, .cm-variable-2 {
  font-family: ${resolvedCodeFont} !important;
  background-color: var(--od-code-bg) !important;
  color: var(--od-code-fg) !important;
  border-radius: 3px !important;
}

/* TinyMCE (Rich Text Editor) Shell & Toolbar Theming */
.tox-tinymce {
  border: 1px solid var(--od-border) !important;
  background-color: var(--od-bg) !important;
}
.tox .tox-toolbar,
.tox .tox-toolbar__primary,
.tox .tox-toolbar__overflow {
  background-color: var(--od-bg-alt) !important;
  border-bottom: none !important;
}
.tox .tox-tbtn {
  color: var(--od-fg) !important;
}
.tox .tox-tbtn:hover {
  background-color: var(--od-selection) !important;
}
.tox .tox-tbtn svg {
  fill: var(--od-fg) !important;
}
`;
}

// =================================================================
// 2. APPLICATION SHELL (DESKTOP UI) THEMING ENGINE
// =================================================================
export function buildChromeCss(options: StyleOptions): string {
  const selectedTheme = resolveTheme(options);
  const { fontImport, resolvedFont } = resolveFonts(options);
  const cssVariables = buildCssVariables(selectedTheme);

  // BiDi synchronization: Protects UI toolbars, headers, and tree indentation
  let shellDirRules = '';
  if (options.direction === 'rtl') {
    shellDirRules = `
      /* Title input adheres to RTL */
      input.title-input {
        direction: rtl !important;
        text-align: right !important;
      }

      /* Note List item titles align naturally using Unicode BiDi */
      .note-list .title,
      .note-list-item-title,
      .note-list span,
      .note-list div {
        unicode-bidi: plaintext !important;
        text-align: start !important;
      }

      /* Active Note Indicator flips to right border in RTL */
      div.rli-noteList [aria-selected="true"],
      div.rli-noteList .selected,
      div.note-list [aria-selected="true"],
      div.note-list .selected {
        border-right: 4px solid var(--od-h2) !important;
        border-left: none !important;
      }

      /* Sidebar titles use BiDi without breaking tree indentation or flex order */
      .side-bar .title,
      .side-bar span.title,
      .folders a span:not(.note-count-label):not(.icon),
      .tags a span:not(.note-count-label):not(.icon) {
        unicode-bidi: plaintext !important;
        text-align: start !important;
      }
    `;
  } else if (options.direction === 'auto') {
    shellDirRules = `
      input.title-input,
      .note-list .title,
      .note-list-item-title,
      .side-bar .title,
      .side-bar span.title {
        unicode-bidi: plaintext !important;
        text-align: start !important;
      }
    `;
  } else {
    shellDirRules = `
      input.title-input {
        direction: ltr !important;
        text-align: left !important;
      }

      div.rli-noteList [aria-selected="true"],
      div.rli-noteList .selected,
      div.note-list [aria-selected="true"],
      div.note-list .selected {
        border-left: 4px solid var(--od-h2) !important;
        border-right: none !important;
      }
    `;
  }

  return `
${fontImport}
${cssVariables}
${shellDirRules}

/* =================================================================
   UNIFIED DESKTOP SHELL CASCADE (OVERRIDING JOPLIN CORE DARK/LIGHT)
   ================================================================= */

/* --- 1. Resizer Splitters & Root Container --- */
div[style*="col-resize"],
div[style*="row-resize"],
div[style*="cursor: col-resize"],
div[style*="cursor: row-resize"],
.rli-splitter,
.splitter,
div[class*="splitter"],
div[class*="resizer"],
div[class*="divider"] {
  background-color: var(--od-border) !important;
  background: var(--od-border) !important;
  border-color: var(--od-border) !important;
  opacity: 0.8 !important;
}

.rli-root,
#joplin-plugin-content,
div[class*="rli-"] {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
}

/* --- 2. Primary Left Sidebar --- */
.side-bar,
.r-sidebar,
.rli-sideBar,
div[toggleblock="1"] {
  background-color: var(--od-bg-alt) !important;
  background: var(--od-bg-alt) !important;
  color: var(--od-fg) !important;
  font-family: ${resolvedFont} !important;
}

.side-bar *,
.r-sidebar *,
.rli-sideBar *,
div[toggleblock="1"] *,
.folders *,
.tags *,
a.list-item,
a.list-item *,
.list-item-container * {
  color: var(--od-fg) !important;
  border-color: var(--od-fg) !important;
}

.side-bar svg,
.side-bar path,
.side-bar i,
.r-sidebar svg,
.r-sidebar path,
.rli-sideBar svg,
.rli-sideBar path {
  fill: var(--od-fg) !important;
  stroke: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

.side-bar .list-item-container:hover,
.side-bar .list-item:hover,
.side-bar a:hover {
  background-color: var(--od-selection) !important;
}

/* Active Selected Notebook Item (Overrides Inline rgb(0, 95, 184)) */
.side-bar .list-item-container.selected,
.side-bar .list-item.selected,
.side-bar a.selected,
.side-bar .selected,
.side-bar div[class*="selected"],
.rli-sideBar .selected,
.rli-sideBar div[class*="selected"],
.folders .selected,
.folders div[class*="selected"],
.tags .selected {
  background-color: var(--od-selection) !important;
  background: var(--od-selection) !important;
  color: var(--od-link) !important;
  font-weight: 700 !important;
}

.side-bar .selected *,
.side-bar div[class*="selected"] *,
.rli-sideBar .selected *,
.rli-sideBar div[class*="selected"] *,
.folders .selected * {
  color: var(--od-link) !important;
}

.side-bar .header,
.side-bar .header span,
.side-bar div[style*="font-weight: bold"],
.side-bar .section-header {
  color: var(--od-comment) !important;
  font-size: 0.85em !important;
  letter-spacing: 0.5px !important;
  opacity: 0.85 !important;
}

.side-bar .item-count,
.folders span[style*="opacity"] {
  color: var(--od-comment) !important;
  opacity: 0.8 !important;
}

/* Ensure clean spacing between folder icons, emojis, and titles without breaking tree indentation */
.side-bar .icon,
.side-bar span.icon,
.side-bar svg.icon,
.side-bar span[role="img"],
.folders a span[role="img"] {
  margin-left: 6px !important;
  margin-right: 6px !important;
  display: inline-block !important;
}

/* --- 2. Bottom Left: Synchronize Panel --- */
.rli-sideBar > div:last-child,
.rli-sideBar > div:nth-child(2),
.rli-sideBar div[style*="border-top"],
.rli-sideBar div[style*="background-color"],
.rli-sideBar > div > div:last-child,
.side-bar > div:last-child,
div:has(> .synchronize-button),
div:has(.synchronize-button),
div:has(> button.synchronize-button),
div:has(button[title*="Sync"]),
div:has(button[title*="Synchronize"]),
.synchronize-button,
.sync-status-box,
div.sync-report,
div[class*="sync"],
div[class*="Sync"] {
  background-color: var(--od-bg-alt) !important;
  background: var(--od-bg-alt) !important;
  border-top: 1px solid var(--od-border) !important;
}

.rli-sideBar > div:last-child *,
.rli-sideBar > div:nth-child(2) *,
div:has(.synchronize-button) *,
.synchronize-button *,
.sync-status-box *,
div.sync-report * {
  background-color: transparent !important;
  color: var(--od-comment) !important;
}

.rli-sideBar > div:last-child button,
.rli-sideBar > div:nth-child(2) button,
div:has(.synchronize-button) button,
.synchronize-button button,
.sync-status-box button,
button.synchronize-button,
button[title*="Sync"],
button[title*="Synchronize"] {
  background-color: var(--od-bg) !important;
  background: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border: 1px solid var(--od-border) !important;
  border-color: var(--od-border) !important;
  box-shadow: none !important;
  outline: none !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
  padding: 6px 12px !important;
}

.rli-sideBar > div:last-child button:hover,
.synchronize-button button:hover,
.synchronize-button button:focus {
  background-color: var(--od-selection) !important;
  border-color: var(--od-link) !important;
  color: var(--od-link) !important;
  box-shadow: none !important;
  outline: none !important;
}

.synchronize-button svg,
.synchronize-button path,
.synchronize-button i,
div:has(.synchronize-button) svg,
div:has(.synchronize-button) path {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

/* --- 3. Note List Panel & Active Item Selection --- */
.note-list,
.r-note-list,
.item-list,
div.rli-noteList,
div.rli-noteList > div {
  background-color: var(--od-bg) !important;
  background: var(--od-bg) !important;
  border-right: 1px solid var(--od-border) !important;
  border-left: 1px solid var(--od-border) !important;
  font-family: ${resolvedFont} !important;
}

.note-list .list-item-container,
.note-list .list-item,
.note-list-item,
div.rli-noteList .list-item-container {
  background-color: var(--od-bg) !important;
  border-bottom: 1px solid var(--od-border) !important;
}

.note-list .list-item-container *,
.note-list .title,
.note-list-item-title,
.note-list span {
  color: var(--od-fg) !important;
}

.note-list .list-item-container:hover,
.note-list .list-item:hover,
.note-list a:hover {
  background-color: var(--od-selection) !important;
}

/* Active Selected Note (Overrides Inline Dark Styles) */
div.rli-noteList [aria-selected="true"],
div.rli-noteList .selected,
div.rli-noteList div[class*="selected"],
div.rli-noteList .list-item-container.selected,
div.rli-noteList .note-list-item.selected,
div.note-list [aria-selected="true"],
div.note-list .selected,
div.note-list div[class*="selected"],
div.note-list .list-item-container.selected,
div.note-list .note-list-item.selected {
  background-color: var(--od-selection) !important;
  background: var(--od-selection) !important;
}

div.rli-noteList [aria-selected="true"] *,
div.rli-noteList .selected *,
div.note-list [aria-selected="true"] *,
div.note-list .selected * {
  color: var(--od-link) !important;
  font-weight: 700 !important;
}

/* --- 4. Top Left: Note List Header Bar, Buttons & Search (Green Box) --- */
div.rli-noteList > div > div > div:first-child,
div.rli-noteList .note-list-top-bar,
.note-list-top-bar,
.note-list > div:first-child,
.note-list .header,
.search-bar,
div.new-note-todo-buttons,
div:has(> .new-note-button),
div:has(> button.new-note-button) {
  background-color: var(--od-bg-alt) !important;
  background: var(--od-bg-alt) !important;
  border-bottom: none !important;
}

/* New note & New to-do Buttons: Dynamic contrast against --od-link */
button.new-note-button,
button.new-todo-button,
div.rli-noteList button.new-note-button,
div.rli-noteList button.new-todo-button,
div.new-note-todo-buttons button,
div.header a.button,
div.header button,
.note-list .header button,
.note-list-top-bar button:not(.sort-order-reverse-button),
a.button[title="New note"],
a.button[title="New to-do"],
a[title="New note"],
a[title="New to-do"] {
  background-color: var(--od-link) !important;
  background: var(--od-link) !important;
  color: var(--od-bg) !important;
  border: none !important;
  border-radius: 4px !important;
  font-weight: 700 !important;
  box-shadow: none !important;
}

button.new-note-button *,
button.new-todo-button *,
div.new-note-todo-buttons button * {
  color: var(--od-bg) !important;
  fill: var(--od-bg) !important;
}

button.new-note-button:hover,
button.new-todo-button:hover,
div.rli-noteList button.new-note-button:hover,
div.rli-noteList button.new-todo-button:hover,
div.new-note-todo-buttons button:hover {
  background-color: var(--od-link-hover) !important;
  background: var(--od-link-hover) !important;
}

/* Search bar input */
div.rli-noteList input,
div.rli-noteList input[type="search"],
.note-list-top-bar input,
.note-list input[type="search"],
.search-bar input,
input[type="search"] {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border: 1px solid var(--od-border) !important;
  border-radius: 4px !important;
}

/* Sort, Reverse & Calendar Buttons in Search Row */
button.sort-order-reverse-button,
div.rli-noteList button.sort-order-reverse-button,
div.rli-noteList button:not(.new-note-button):not(.new-todo-button),
.note-list-top-bar button.sort-order-reverse-button {
  background-color: var(--od-bg) !important;
  background: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border: 1px solid var(--od-border) !important;
  border-radius: 4px !important;
}

div.rli-noteList svg,
div.rli-noteList path,
.note-list-top-bar svg,
.note-list-top-bar path,
.search-bar svg,
.search-bar path {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

/* --- 5. Top Right: Note Header & Unified Navbar (Blue Box) --- */
.header,
.r-header,
.top-bar,
.note-title-wrapper,
div.note-title-wrapper {
  background-color: var(--od-bg-alt) !important;
  background: var(--od-bg-alt) !important;
  border-bottom: 1px solid var(--od-border) !important;
  border-top: none !important;
  border-left: none !important;
  border-right: none !important;
  box-sizing: border-box !important;
  min-height: 40px !important;
}

/* Seamless Title Input (Blends directly into the header bar without boxed borders) */
input.title-input {
  background-color: transparent !important;
  background: transparent !important;
  border: none !important;
  border-bottom: none !important;
  color: var(--od-fg) !important;
  font-family: ${resolvedFont} !important;
  font-size: 1.2em !important;
  font-weight: 700 !important;
  padding: 6px 14px !important;
  outline: none !important;
  box-shadow: none !important;
}

input.title-input:focus {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Seamless Info Group (Eliminates disconnected borders and mismatched fills) */
.note-title-info-group,
div.note-title-info-group {
  background-color: transparent !important;
  background: transparent !important;
  border: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  box-shadow: none !important;
}

.note-title-info-group *,
.header span,
.header div {
  color: var(--od-fg) !important;
  border-bottom: none !important;
}

.note-title-info-group svg,
.note-title-info-group path,
.header svg,
.header path {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

.header button,
.header a,
.header .button,
button.toolbar-button {
  background-color: transparent !important;
  color: var(--od-fg) !important;
  border: none !important;
}

.header button:hover,
.header a:hover,
button.toolbar-button:hover {
  background-color: var(--od-selection) !important;
  border-radius: 4px !important;
}

/* --- 6. Markdown Editor Formatting Toolbar --- */
.editor-toolbar,
div.editor-toolbar,
div[class*="editor-toolbar"],
.r-editor-toolbar {
  background-color: var(--od-bg-alt) !important;
  background: var(--od-bg-alt) !important;
  border-bottom: none !important;
}

.editor-toolbar *,
.editor-toolbar div,
.editor-toolbar button,
.editor-toolbar a,
.editor-toolbar span {
  color: var(--od-fg) !important;
  background-color: transparent !important;
}

.editor-toolbar svg,
.editor-toolbar path,
.editor-toolbar .icon,
.editor-toolbar [class*="icon"] {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

.editor-toolbar button:hover,
.editor-toolbar a:hover {
  background-color: var(--od-selection) !important;
  border-radius: 4px !important;
}

/* --- 8. Bottom: Tag Bar & Notification Banners --- */
.tag-bar,
div.tag-bar,
.tag-list,
div[class*="tag"],
div[class*="banner"],
div.updated-feature-banner,
div.alert,
div.info-box,
.rli-editor > div > div > div:has(.tag-bar),
.rli-editor > div > div > div:has(div[class*="banner"]),
.rli-editor > div > div > div:last-child {
  background-color: var(--od-bg-alt) !important;
  background: var(--od-bg-alt) !important;
  border-top: 1px solid var(--od-border) !important;
  color: var(--od-fg) !important;
}

.tag-bar *,
div[class*="banner"] *,
div.updated-feature-banner * {
  color: var(--od-fg) !important;
}

.tag-bar svg,
.tag-bar path {
  fill: var(--od-fg) !important;
}

.tag-bar input,
.tag-bar .tag-input {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border: 1px solid var(--od-border) !important;
}

.tag-bar span,
.tag-list span,
.tag-list .tag-item {
  background-color: var(--od-selection) !important;
  color: var(--od-fg) !important;
  border-radius: 4px !important;
  padding: 2px 6px !important;
}

div[class*="banner"] a,
div[class*="banner"] button,
div.updated-feature-banner a,
div.updated-feature-banner button {
  color: var(--od-link) !important;
  font-weight: 700 !important;
}

/* --- 9. Right: Plugin Panels Outer Shell (Outline, Note Tabs) --- */
.r-panel,
div.joplin-plugin-view,
div.panel-container,
div[class*="outline"] {
  background-color: var(--od-bg) !important;
  background: var(--od-bg) !important;
  border-left: 1px solid var(--od-border) !important;
}

.r-panel *,
div.joplin-plugin-view * {
  color: var(--od-fg) !important;
}

.r-panel svg,
.r-panel path {
  fill: var(--od-fg) !important;
}

.r-panel header,
.r-panel .header,
.r-panel > div:first-child {
  background-color: var(--od-bg-alt) !important;
  border-bottom: 1px solid var(--od-border) !important;
}

.r-panel iframe,
div.joplin-plugin-view iframe {
  background-color: var(--od-bg) !important;
}

/* --- 10. App-wide Custom Scrollbars --- */
.side-bar::-webkit-scrollbar,
.note-list::-webkit-scrollbar,
.r-panel::-webkit-scrollbar {
  width: 6px !important;
}

.side-bar::-webkit-scrollbar-track,
.note-list::-webkit-scrollbar-track,
.r-panel::-webkit-scrollbar-track {
  background: var(--od-scrollbar-track) !important;
}

.side-bar::-webkit-scrollbar-thumb,
.note-list::-webkit-scrollbar-thumb,
.r-panel::-webkit-scrollbar-thumb {
  background: var(--od-scrollbar-thumb) !important;
  border-radius: 3px !important;
}
`;
}

// =================================================================
// 2b. THIRD-PARTY PLUGIN PANEL (WEBVIEW) THEMING
// =================================================================
export function buildPanelCss(options: StyleOptions): string {
  const chromeCss = buildChromeCss(options);
  if (!chromeCss) return '';
  return `${chromeCss}
:root {
  --joplin-background-color: var(--od-bg) !important;
  --joplin-background-color-transparent30: var(--od-selection) !important;
  --joplin-color: var(--od-fg) !important;
  --joplin-color-hover: var(--od-link) !important;
  --joplin-divider-color: var(--od-border) !important;
}
*, *::before, *::after {
  border-color: var(--od-border) !important;
}
body, html, #root, #app, .panel, header, .header, nav, .toolbar, .search-container, .top-bar {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
}
header, .header, nav, .toolbar, .search-container, .top-bar, .search-box {
  background-color: var(--od-bg-alt) !important;
  border-bottom: 1px solid var(--od-border) !important;
}
input, input[type="text"], input[type="search"] {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border: 1px solid var(--od-border) !important;
}
a, span, div, li, p, i, button {
  color: var(--od-fg) !important;
}
svg, path {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}
a:hover, .header-list-item:hover, li:hover {
  background-color: var(--od-selection) !important;
}
`;
}

// =================================================================
// 3. MARKDOWN VIEWER & PDF RENDER ENGINE
// =================================================================
/**
 * Builds the document stylesheet for one target. `S` is the scope selector
 * (`#rendered-md` or `body#tinymce`); every rule below is written once and
 * keeps exactly the specificity it had when the two targets were spelled out
 * side by side, so the cascade is unchanged – only the dead half is gone.
 */
export function buildThemeCss(options: StyleOptions, target: CssTarget = 'viewer'): string {
  const isViewer = target !== 'tinymce';
  const S = isViewer ? '#rendered-md' : 'body#tinymce';

  const selectedTheme = resolveTheme(options);
  const tokenVariables = buildTokenVariables(selectedTheme);
  const { fontImport, resolvedFont, resolvedCodeFont } = resolveFonts(options);
  const headingSizes = resolveHeadingSizes(options);
  const cssVariables = buildCssVariables(selectedTheme, `  --mermaid-font-family: ${resolvedFont} !important;\n`);

  // Directional rules ------------------------------------------------------
  let dirRules = '';
  if (options.direction === 'rtl') {
    dirRules = `
body, ${S} { direction: rtl !important; text-align: right !important; }
${S} h1 { text-align: right !important; }
${S} h2 {
  border-right: 5px solid var(--od-h2) !important;
  border-left: none !important;
  padding-right: 12px !important;
  padding-left: 0 !important;
  text-align: right !important;
}
${S} :is(h3, h4, h5, h6) { text-align: right !important; }
${S} :is(ul, ol) {
  direction: rtl !important;
  text-align: right !important;
  padding-right: 2.2em !important;
  padding-left: 0 !important;
}
${S} li {
  direction: rtl !important;
  text-align: right !important;
}
${S} :is(ul, ol) :is(ul, ol) {
  padding-right: 1.6em !important;
  padding-left: 0 !important;
}
.md-checkbox input[type="checkbox"] { margin-left: 8px !important; margin-right: 0 !important; }

/* RTL Blockquotes: 1px Right Border & No Left Border */
${S} blockquote {
  direction: rtl !important;
  text-align: right !important;
  border-right: 1px solid var(--od-comment) !important;
  border-left: 0 !important;
}
${S} :is(th, td) { text-align: right !important; }
.mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .label, .mermaid text {
  direction: rtl !important;
  unicode-bidi: plaintext !important;
}

/* Explicit <div dir="ltr"> islands inside an RTL document */
${S} [dir="ltr"],
${S} [dir="ltr"] :is(h1, h2, h3, h4, h5, h6, p, li, blockquote, dt, dd) {
  direction: ltr !important;
  text-align: left !important;
}
${S} [dir="ltr"] h2 {
  border-right: none !important;
  border-left: 5px solid var(--od-h2) !important;
  padding-left: 12px !important;
  padding-right: 0 !important;
}
${S} [dir="ltr"] blockquote {
  border-right: none !important;
  border-left: 1px solid var(--od-comment) !important;
  padding-left: 16px !important;
  padding-right: 12px !important;
}
${S} [dir="ltr"] :is(ul, ol) {
  direction: ltr !important;
  text-align: left !important;
  padding-left: 1.6em !important;
  padding-right: 0 !important;
}
${S} [dir="ltr"] :is(ul ul, ol ol, ul ol, ol ul) {
  padding-left: 1.4em !important;
  padding-right: 0 !important;
}
${S} [dir="ltr"] .md-checkbox input[type="checkbox"] {
  margin-right: 8px !important;
  margin-left: 0 !important;
}
${S} [dir="ltr"] table :is(th, td) { text-align: left !important; }
`;
  } else if (options.direction === 'auto') {
    // `:is([dir="x"], :dir(x))` keeps the original `:dir()` fallback for raw
    // HTML blocks while staying robust: `:is()` is forgiving, so on engines
    // without `:dir()` the `[dir]` half still applies instead of the whole
    // rule being discarded.
    const RTL = ':is([dir="rtl"], :dir(rtl))';
    const LTR = ':is([dir="ltr"], :dir(ltr))';
    dirRules = `
body, ${S} { direction: ltr !important; text-align: start !important; }
${isViewer ? `${S} :is(p, h1, h2, h3, h4, h5, h6, li, blockquote, dt, dd) {
  unicode-bidi: plaintext !important;
  text-align: start !important;
}` : ''}

/* =================================================================
   NATIVE BIDI LIST & MARKER ENGINE (RTL / LTR AWARE)
   ================================================================= */
${S} :is(ul, ol) {
  padding-left: 2em !important;
  padding-right: 0 !important;
}

/* Explicit RTL lists and items */
${S} :is(ul, ol)${RTL} {
  direction: rtl !important;
  text-align: right !important;
  padding-right: 2.2em !important;
  padding-left: 0 !important;
}
${S} li${RTL} {
  direction: rtl !important;
  text-align: right !important;
}
${S} :is(ul, ol)[dir="rtl"] :is(ul, ol) {
  padding-right: 1.6em !important;
  padding-left: 0 !important;
}

/* Explicit LTR lists and items */
${S} :is(ul, ol)${LTR} {
  direction: ltr !important;
  text-align: left !important;
  padding-left: 2em !important;
  padding-right: 0 !important;
}
${S} li${LTR} {
  direction: ltr !important;
  text-align: left !important;
}
${S} :is(ul, ol)[dir="ltr"] :is(ul, ol) {
  padding-left: 1.6em !important;
  padding-right: 0 !important;
}

/* BiDi Checkboxes */
${S} li${RTL} input[type="checkbox"] {
  margin-left: 8px !important;
  margin-right: 0 !important;
}
${S} li${LTR} input[type="checkbox"] {
  margin-right: 8px !important;
  margin-left: 0 !important;
}

/* BiDi H2 Headings */
${S} h2${RTL} {
  border-right: 5px solid var(--od-h2) !important;
  border-left: none !important;
  padding-right: 12px !important;
  padding-left: 0 !important;
  text-align: right !important;
}
${S} h2${LTR} {
  border-left: 5px solid var(--od-h2) !important;
  border-right: none !important;
  padding-left: 12px !important;
  padding-right: 0 !important;
  text-align: left !important;
}

/* BiDi Blockquotes */
${S} blockquote${RTL} {
  border-right: 1px solid var(--od-comment) !important;
  border-left: none !important;
  padding-right: 16px !important;
  padding-left: 10px !important;
  text-align: right !important;
  direction: rtl !important;
}
${S} blockquote${LTR} {
  border-left: 1px solid var(--od-comment) !important;
  border-right: none !important;
  padding-left: 16px !important;
  padding-right: 10px !important;
  text-align: left !important;
  direction: ltr !important;
}

${S} :is(th, td) { text-align: start !important; }
.mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .label, .mermaid text { unicode-bidi: plaintext !important; }
`;
  } else {
    dirRules = `
body, ${S} { direction: ltr !important; text-align: left !important; }
${S} h2 {
  border-left: 5px solid var(--od-h2) !important;
  border-right: none !important;
  padding-left: 12px !important;
  padding-right: 0 !important;
}
${S} :is(ul, ol) { padding-left: 2em !important; }
.md-checkbox input[type="checkbox"] { margin-right: 8px !important; margin-left: 0 !important; }

/* LTR Blockquotes: 1px Left Border & No Right Border */
${S} blockquote {
  border-left: 1px solid var(--od-comment) !important;
  border-right: 0 !important;
}
${S} :is(th, td) { text-align: left !important; }
.mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .label, .mermaid text { direction: ltr !important; }
`;
  }

  // Layout options ---------------------------------------------------------
  let contentWidthCss = '';
  if (options.contentMaxWidth === 'compact') {
    contentWidthCss = `max-width: 760px !important; margin: 0 auto !important;`;
  } else if (options.contentMaxWidth === 'comfortable') {
    contentWidthCss = `max-width: 920px !important; margin: 0 auto !important;`;
  }

  const PRE = `${S} pre:not(.mermaid):not(.joplin-source)`;

  // Core document styles ---------------------------------------------------
  const coreStyles = `
*, *::before, *::after { box-sizing: border-box !important; }
html, body${isViewer ? ', #rendered-md' : ''} { max-width: 100% !important; overflow-x: hidden !important; }
::selection { background-color: var(--od-selection) !important; }

body, ${S} {
  font-family: ${resolvedFont} !important;
  line-height: ${options.lineHeight} !important;
  font-size: ${options.fontSize} !important;
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
}
${isViewer && contentWidthCss ? `\n#rendered-md { ${contentWidthCss} }\n` : ''}
${S} h1 {
  color: var(--od-h1) !important;
  font-size: ${headingSizes.h1} !important;
  font-weight: 800 !important;
  padding: 0 0 8px 0 !important;
  margin: 32px 0 20px 0 !important;
  border-bottom: 2px solid var(--od-h1) !important;
}

${S} h2 {
  color: var(--od-h2) !important;
  font-size: ${headingSizes.h2} !important;
  font-weight: 700 !important;
  margin: 28px 0 18px 0 !important;
}

${S} h3 { color: var(--od-h3) !important; font-size: ${headingSizes.h3} !important; font-weight: 600 !important; margin: 24px 0 14px 0 !important; }
${S} h4 { color: var(--od-h4) !important; font-size: ${headingSizes.h4} !important; font-weight: 600 !important; margin: 20px 0 12px 0 !important; }
${S} h5 { color: var(--od-h5) !important; font-size: ${headingSizes.h5} !important; font-weight: 600 !important; margin: 18px 0 10px 0 !important; }
${S} h6 { color: var(--od-h6) !important; font-size: ${headingSizes.h6} !important; font-weight: 700 !important; margin: 16px 0 10px 0 !important; }

${S} li { margin-bottom: 0.45em !important; line-height: ${options.lineHeight} !important; }
${S} li::marker { color: var(--od-h2) !important; font-weight: bold !important; }

.md-checkbox input[type="checkbox"] { vertical-align: middle !important; cursor: pointer !important; }
${S} li:has(input[type="checkbox"]:checked) {
  opacity: 0.55 !important;
  text-decoration: line-through !important;
  transition: opacity 0.2s ease !important;
}
${S} li:has(input[type="checkbox"]:checked) code { opacity: 0.8 !important; text-decoration: none !important; }

${S} img {
  max-width: 100% !important;
  max-height: 520px !important;
  height: auto !important;
  object-fit: contain !important;
  display: block !important;
  margin: 18px auto !important;
  border-radius: 6px !important;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08) !important;
}

${S} a { color: var(--od-link) !important; text-decoration: none !important; transition: color 0.15s ease !important; }
${S} a:hover { color: var(--od-link-hover) !important; text-decoration: underline !important; }

${S} a[href^=":/"] {
  font-weight: 600 !important;
  border-bottom: 1.5px dashed var(--od-link) !important;
  text-decoration: none !important;
}
${S} a[href^=":/"]:hover { border-bottom-style: solid !important; }

/* =================================================================
   BLOCKQUOTES: CLEAN MINIMAL 1PX STYLE (TRANSPARENT BG, NO RADIUS)
   ================================================================= */
${S} blockquote {
  padding: 10px 16px !important;
  margin: 18px 0 !important;
  background: transparent !important;
  border-radius: 0 !important;
  color: var(--od-fg) !important;
}

mark { background-color: var(--od-mark-bg) !important; color: var(--od-fg) !important; padding: 1px 4px !important; border-radius: 3px !important; }
kbd {
  background-color: var(--od-kbd-bg) !important;
  border: 1px solid var(--od-border) !important;
  color: var(--od-fg) !important;
  padding: 2px 5px !important;
  border-radius: 4px !important;
  font-size: 0.85em !important;
  box-shadow: 0 1px 0 rgba(0,0,0,0.2) !important;
}

${S} .joplin-source, pre.joplin-source, div.joplin-editable > pre.joplin-source {
  display: none !important; visibility: hidden !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important;
}

${S} code {
  font-family: ${resolvedCodeFont} !important;
  background-color: var(--od-code-bg) !important;
  color: var(--od-code-fg) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-size: 0.9em !important;
}

${PRE} {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
  background-color: var(--od-pre-bg) !important;
  border: 1px solid var(--od-pre-border) !important;
  border-radius: 6px !important;
  padding: 14px !important;
  margin: 18px 0 !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  white-space: pre !important;
  word-break: normal !important;
  word-wrap: normal !important;
  overflow-wrap: normal !important;
  -webkit-overflow-scrolling: touch !important;
  scrollbar-width: thin !important;
  scrollbar-color: var(--od-scrollbar-thumb) var(--od-scrollbar-track) !important;
}

${PRE} code {
  background-color: transparent !important;
  color: var(--od-fg) !important;
  padding: 0 !important;
  white-space: pre !important;
  display: inline-block !important;
  min-width: 100% !important;
}

/* Syntax highlighting tokens. Joplin renders fenced blocks as
   <pre class="hljs"><code><span class="hljs-keyword"> and colours them with a
   bundled Atom One stylesheet chosen from Joplin's own theme, so without the
   rules below every palette would show Atom One syntax colours. The palette
   roles map onto the standard highlighting semantics. */
${S} pre.hljs,
${S} .hljs {
  background-color: var(--od-pre-bg) !important;
  color: var(--od-tok-fg) !important;
}

${S} .hljs-comment,
${S} .hljs-quote,
${S} .hljs-doctag {
  color: var(--od-tok-comment) !important;
  font-style: italic !important;
}

${S} .hljs-keyword,
${S} .hljs-class,
${S} .hljs-selector-tag,
${S} .hljs-template-tag,
${S} .hljs-meta .hljs-keyword {
  color: var(--od-tok-keyword) !important;
}

${S} .hljs-string,
${S} .hljs-regexp,
${S} .hljs-addition,
${S} .hljs-meta .hljs-string {
  color: var(--od-tok-string) !important;
}

${S} .hljs-number,
${S} .hljs-literal,
${S} .hljs-symbol,
${S} .hljs-bullet,
${S} .hljs-link {
  color: var(--od-tok-number) !important;
}

${S} .hljs-title,
${S} .hljs-section,
${S} .hljs-name,
${S} .hljs-function {
  color: var(--od-tok-function) !important;
}

${S} .hljs-type,
${S} .hljs-built_in,
${S} .hljs-constructor,
${S} .hljs-typing,
${S} .hljs-module,
${S} .hljs-module-access,
${S} .hljs-class .hljs-title,
${S} .hljs-title.class_ {
  color: var(--od-tok-type) !important;
}

${S} .hljs-attr,
${S} .hljs-attribute,
${S} .hljs-variable,
${S} .hljs-template-variable,
${S} .hljs-property {
  color: var(--od-tok-tag) !important;
}

${S} .hljs-tag,
${S} .hljs-selector-id,
${S} .hljs-selector-class,
${S} .hljs-selector-attr,
${S} .hljs-selector-pseudo {
  color: var(--od-tok-tag) !important;
}

${S} .hljs-meta,
${S} .hljs-params {
  color: var(--od-tok-comment) !important;
}

${S} .hljs-subst,
${S} .hljs-operator {
  color: var(--od-tok-fg) !important;
}

${S} .hljs-pattern-match {
  color: var(--od-tok-number) !important;
}

${S} .hljs-formula {
  color: var(--od-tok-accent) !important;
}

${S} .hljs-deletion {
  color: var(--od-tok-tag) !important;
  text-decoration: line-through !important;
}

${S} .hljs-emphasis {
  font-style: italic !important;
}

${S} .hljs-strong {
  font-weight: 700 !important;
}

${S} :is(p, li) code {
  direction: ltr !important;
  display: inline-block !important;
  unicode-bidi: embed !important;
  vertical-align: baseline !important;
  white-space: normal !important;
  max-width: 100% !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

/* Explicit Table Font Inheritance */
${S} :is(table, th, td) {
  font-family: ${resolvedFont} !important;
}
${S} table :is(th, td) code {
  font-family: ${resolvedCodeFont} !important;
}

${S} table {
  border-collapse: collapse !important;
  width: 100% !important;
  max-width: 100% !important;
  margin: 20px 0 !important;
  border: 1px solid var(--od-border) !important;
  display: block !important;
  box-sizing: border-box !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
  scrollbar-width: thin !important;
  scrollbar-color: var(--od-scrollbar-thumb) var(--od-scrollbar-track) !important;
  color: var(--od-fg) !important;
}

${S} th {
  background-color: var(--od-table-th) !important;
  color: var(--od-link) !important;
  font-weight: bold !important;
  border: 1px solid var(--od-border) !important;
  padding: 8px 12px !important;
  white-space: nowrap !important;
}

${S} td {
  border: 1px solid var(--od-border) !important;
  padding: 8px 12px !important;
  color: var(--od-fg) !important;
}

${S} tr:nth-child(even) { background-color: var(--od-table-even) !important; }
${S} tr:nth-child(odd) { background-color: var(--od-table-odd) !important; }

/* Mermaid Diagrams */
${S} .mermaid, ${S} div.mermaid, ${S} pre.mermaid {
  display: block !important;
  text-align: center !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  margin: 24px 0 !important;
  padding: 20px 14px !important;
  direction: ltr !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  scrollbar-width: thin !important;
  background-color: var(--od-mermaid-bg) !important;
  border: 1px solid var(--od-mermaid-border) !important;
  border-radius: 8px !important;
}
${isViewer ? `
#rendered-md .mermaid svg, #rendered-md div.mermaid svg, #rendered-md pre.mermaid svg {
  display: inline-block !important;
  vertical-align: middle !important;
  margin: 0 auto !important;
  height: auto !important;
  max-width: 100% !important;
  width: auto !important;
}
` : ''}
.mermaid foreignObject { overflow: visible !important; }
.mermaid foreignObject div {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  white-space: normal !important;
  word-break: normal !important;
  line-height: 1.4 !important;
  text-align: center !important;
  padding: 3px 6px !important;
}

.mermaid, .mermaid svg, .mermaid text, .mermaid tspan,
.mermaid .label, .mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .cluster-label {
  font-family: var(--mermaid-font-family) !important;
}

.mermaid .node rect, .mermaid .node polygon { rx: 6px !important; ry: 6px !important; }
.mermaid .labelBkg, .mermaid rect.labelBkg, .mermaid span.labelBkg, .mermaid .edgeLabel rect {
  background-color: transparent !important; fill: transparent !important; opacity: 0 !important; border: none !important;
}
.mermaid .edgeLabel {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border-radius: 4px !important;
  padding: 1px 6px !important;
}

.katex-display {
  max-width: 100% !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  box-sizing: border-box !important;
  padding: 6px 0 !important;
}

${S} .table-of-contents {
  background-color: var(--od-bg-alt) !important;
  border: 1px solid var(--od-border) !important;
  border-radius: 6px !important;
  padding: 12px 18px !important;
  margin: 20px 0 !important;
  display: inline-block !important;
  min-width: min(100%, 300px) !important;
}
${isViewer ? `#rendered-md .table-of-contents ul { margin: 4px 0 !important; }` : ''}

${S} .footnotes {
  margin-top: 40px !important;
  padding-top: 16px !important;
  border-top: 1px solid var(--od-border) !important;
  font-size: 0.88em !important;
  color: var(--od-comment) !important;
}

/* Mobile Responsiveness (< 768px) – only the values that actually differ from the base rules */
@media screen and (max-width: 768px) {
  ${isViewer && contentWidthCss ? `#rendered-md { max-width: 100% !important; } /* Reading Width is a desktop feature */` : ''}
  ${S} h1 { font-size: calc(${headingSizes.h1} * 0.9) !important; margin: 20px 0 12px 0 !important; }
  ${S} h2 { font-size: calc(${headingSizes.h2} * 0.92) !important; margin: 18px 0 10px 0 !important; }
  ${S} h3 { margin: 16px 0 8px 0 !important; }
  ${S} img { max-height: 420px !important; }
  ${PRE} { font-size: 0.9em !important; padding: 10px 12px !important; }
  ${S} table { font-size: 0.9em !important; }
  ${S} .mermaid { padding: 14px 8px !important; }
}
`;

  // Print / PDF (viewer only – the Rich Text iframe is never printed) ------
  let printStyles = '';
  if (isViewer) {
    const isPaperMode = options.pdfExportStyle === 'paper';
    const printBodyBg = isPaperMode ? '#ffffff' : 'var(--od-bg)';
    const printBodyFg = isPaperMode ? '#1e2227' : 'var(--od-fg)';
    const { pageSize, margin } = resolvePdfSettings(options);

    // In Exact Match mode, @page margin must be 0 so the theme background fills
    // 100% of the physical paper canvas edge-to-edge (no unprinted white borders).
    // Content spacing is applied as padding on body / #rendered-md instead.
    // In Paper Friendly mode, standard @page margins apply to the white page.
    const pageRuleMargin = isPaperMode ? margin : '0';
    const contentPadding = isPaperMode ? '0' : margin;

    printStyles = `
/* =================================================================
   FLAWLESS PDF & PRINT EXPORT ENGINE
   ================================================================= */
@page {
  size: ${pageSize};
  margin: ${pageRuleMargin};
}

@media print {
  *, *::before, *::after, :root, html, body, .exported-note, #rendered-md {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  :root, html, body, .exported-note {
    background-color: ${printBodyBg} !important;
    color: ${printBodyFg} !important;
  }

  body, #rendered-md {
    background-color: ${printBodyBg} !important;
    color: ${printBodyFg} !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    padding: ${contentPadding} !important;
    box-sizing: border-box !important;
    font-size: 14px !important;
    line-height: ${options.lineHeight} !important;
  }

  #rendered-md :is(table, th, td) {
    font-family: ${resolvedFont} !important;
  }

  #rendered-md table :is(th, td) code {
    font-family: ${resolvedCodeFont} !important;
  }

  .exported-note-title {
    color: var(--od-h1) !important;
    font-family: ${resolvedFont} !important;
    font-size: 1.9em !important;
    font-weight: 800 !important;
    border-bottom: 2px solid var(--od-h1) !important;
    padding-bottom: 8px !important;
    margin-bottom: 24px !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  #rendered-md h1 { color: var(--od-h1) !important; page-break-after: avoid !important; break-after: avoid !important; }
  #rendered-md h2 { color: var(--od-h2) !important; page-break-after: avoid !important; break-after: avoid !important; }
  #rendered-md h3 { color: var(--od-h3) !important; page-break-after: avoid !important; break-after: avoid !important; }
  #rendered-md h4 { color: var(--od-h4) !important; page-break-after: avoid !important; break-after: avoid !important; }
  #rendered-md h5 { color: var(--od-h5) !important; page-break-after: avoid !important; break-after: avoid !important; }
  #rendered-md h6 { color: var(--od-h6) !important; page-break-after: avoid !important; break-after: avoid !important; }

  #rendered-md table {
    display: table !important;
    width: 100% !important;
    max-width: 100% !important;
    table-layout: auto !important;
    overflow: visible !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
    margin: 16px 0 !important;
  }

  #rendered-md tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  #rendered-md :is(th, td) {
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    padding: 6px 10px !important;
  }

  ${PRE} {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    overflow: visible !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    background-color: var(--od-pre-bg) !important;
    border: 1px solid var(--od-pre-border) !important;
    padding: 12px !important;
    margin: 14px 0 !important;
  }

  ${PRE} code {
    white-space: pre-wrap !important;
    display: block !important;
    min-width: 100% !important;
  }

  #rendered-md .mermaid {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    overflow: visible !important;
    background-color: var(--od-mermaid-bg) !important;
    border: 1px solid var(--od-mermaid-border) !important;
    padding: 16px 10px !important;
    margin: 18px auto !important;
  }

  #rendered-md .mermaid svg {
    max-width: 100% !important;
    height: auto !important;
    display: block !important;
    margin: 0 auto !important;
  }

  #rendered-md img {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    max-width: 100% !important;
    height: auto !important;
  }

  #rendered-md blockquote {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    background-color: transparent !important;
  }

  .katex-display {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    overflow: visible !important;
  }
}
`;
  }

  const scrollbarStyles = `
::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
::-webkit-scrollbar-track { background: var(--od-scrollbar-track) !important; border-radius: 4px !important; }
::-webkit-scrollbar-thumb { background: var(--od-scrollbar-thumb) !important; border-radius: 4px !important; }
::-webkit-scrollbar-thumb:hover { background: var(--od-scrollbar-hover) !important; }
`;

  // User CSS is appended AFTER compaction so comments, quoted strings and
  // whitespace inside it are preserved exactly as typed. Style tags are stripped
  // because the result is injected inside a <style> element: a stray closing tag
  // would end the block and spill the rest of the stylesheet into the note body.
  const customCss = (options.customCss || '').replace(/<\/?style[^>]*>/gi, '').trim();

  const baseCss = compactCss(`${fontImport}\n${cssVariables}${tokenVariables}\n${dirRules}\n${coreStyles}${printStyles}${scrollbarStyles}`);

  return customCss ? `${baseCss}\n/* User custom CSS */\n${customCss}` : baseCss;
}
