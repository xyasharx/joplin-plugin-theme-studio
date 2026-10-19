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
export function buildChromeCss(options: StyleOptions): string {
  const selectedTheme = resolveTheme(options);
  const { fontImport, resolvedFont } = resolveFonts(options);
  const cssVariables = buildCssVariables(selectedTheme);

  // ------------------------------------------------------------------
  // Direction rules.
  // Target only hooks that exist in every Joplin 3.x release:
  //   .sidebar, .list-item-container, .note-list, .note-list-item-wrapper,
  //   input.title-input.
  // ------------------------------------------------------------------
  const noteRow = '.note-list .note-list-item-wrapper[aria-selected="true"]';

  let shellDirRules = '';
  if (options.direction === 'rtl') {
    shellDirRules = `
      /* Title input adheres to RTL */
      input.title-input {
        direction: rtl !important;
        text-align: right !important;
      }

      /* Row labels align per paragraph; layout order is never touched, so
         tree indentation and flex order stay intact. */
      .sidebar .title,
      .sidebar .tag-label,
      .note-list .title {
        unicode-bidi: plaintext !important;
        text-align: start !important;
      }

      /* Active note indicator flips to the right edge */
      ${noteRow} {
        border-right: 4px solid var(--od-h2) !important;
        border-left: none !important;
      }
    `;
  } else if (options.direction === 'auto') {
    shellDirRules = `
      input.title-input,
      .sidebar .title,
      .sidebar .tag-label,
      .note-list .title {
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

      /* Active note indicator on the left edge */
      ${noteRow} {
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
   DESKTOP SHELL CASCADE
   Every selector below is anchored on a class that exists in Joplin 3.x
   (verified against v3.0.15, v3.3.13 and v3.7.14). The 2.x-era names
   (.side-bar, .r-panel, .synchronize-button, .note-list-top-bar,
   .rli-splitter, .updated-feature-banner, .sync-status-box, .folders,
   .tags, div[toggleblock]) do not exist in any 3.x build and were
   removed, as were the universal "container *" rules.
   ================================================================= */

/* --- 1. Window shell & resize handles --- */
.resizableLayoutItem {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
}

/* Resize handles carry no class - Joplin only sets an inline cursor,
   so this attribute match is the only stable hook that exists. */
div[style*="col-resize"],
div[style*="row-resize"] {
  background-color: var(--od-border) !important;
  border-color: var(--od-border) !important;
  opacity: 0.8 !important;
}

/* --- 2. Sidebar --- */
.rli-sideBar,
.sidebar {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-fg) !important;
  font-family: ${resolvedFont} !important;
}

.sidebar-header-container {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-fg) !important;
  border-bottom: 1px solid var(--od-border) !important;
}

.sidebar .list-item-container,
.sidebar .list-item,
.sidebar button,
.sidebar a {
  color: var(--od-fg) !important;
  text-decoration: none !important;
}

.sidebar .list-item-container:hover {
  background-color: var(--od-selection) !important;
}

/* Active notebook / tag (class is "selected" on both FolderItem and TagItem) */
.sidebar .list-item-container.selected,
.sidebar .list-item-container.-selected {
  background-color: var(--od-selection) !important;
  color: var(--od-link) !important;
  font-weight: 700 !important;
}

.sidebar .list-item-container.selected .title,
.sidebar .list-item-container.-selected .title,
.sidebar .list-item-container.selected .tag-label,
.sidebar .list-item-container.-selected .tag-label {
  color: var(--od-link) !important;
}

.sidebar .title,
.sidebar .tag-label,
.sidebar .all-notes {
  color: var(--od-fg) !important;
}

.sidebar .note-count-label {
  color: var(--od-comment) !important;
  opacity: 0.8 !important;
}

.sidebar .sidebar-expand-link {
  color: var(--od-comment) !important;
}

/* Flat controls: Joplin's sidebar buttons carry no background of their own */
.sidebar button {
  background-color: transparent !important;
}

.sidebar svg,
.sidebar path,
.sidebar .icon {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

/* Selected row keeps the accent colour for its icons too */
.sidebar .list-item-container.selected svg,
.sidebar .list-item-container.selected path,
.sidebar .list-item-container.-selected svg,
.sidebar .list-item-container.-selected path {
  fill: var(--od-link) !important;
  color: var(--od-link) !important;
}

/* --- 3. Sync area (Joplin 3.3+: stable classes; older builds keep the
       stock look rather than relying on :has()) --- */
.sidebar-sync-button {
  color: var(--od-fg) !important;
  background-color: transparent !important;
}

.sidebar-sync-button:hover {
  color: var(--od-link) !important;
}

.sidebar-sync-button svg,
.sidebar-sync-button path {
  fill: currentColor !important;
  color: inherit !important;
}

.sidebar-sync-button.-error,
.sidebar-sync-button.-error svg {
  color: var(--od-h2) !important;
}

#sync-report {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-fg) !important;
  border-top: 1px solid var(--od-border) !important;
}

.sync-report-toggle {
  color: var(--od-comment) !important;
}

/* --- 4. Note list --- */
.note-list,
.note-list .item-list,
.item-list {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  font-family: ${resolvedFont} !important;
}

.note-list {
  border-right: 1px solid var(--od-border) !important;
  border-left: 1px solid var(--od-border) !important;
}

.note-list .note-list-item-wrapper {
  border-color: var(--od-border) !important;
}

.note-list-item,
.shared-note-list-item {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border-color: var(--od-border) !important;
}

.note-list .title {
  color: var(--od-fg) !important;
}

.note-list-item:hover,
.shared-note-list-item:hover {
  background-color: var(--od-selection) !important;
}

/* Active note. The wrapper carries aria-selected; the visible surface is
   .note-list-item / .shared-note-list-item, so both are styled. */
.note-list .note-list-item-wrapper[aria-selected="true"] {
  background-color: var(--od-selection) !important;
}

.note-list .note-list-item-wrapper[aria-selected="true"] .note-list-item,
.note-list .note-list-item-wrapper[aria-selected="true"] .shared-note-list-item {
  background-color: var(--od-selection) !important;
}

.note-list .note-list-item-wrapper[aria-selected="true"] .title {
  color: var(--od-link) !important;
  font-weight: 700 !important;
}

.note-list .emptylist {
  background-color: var(--od-bg) !important;
  color: var(--od-comment) !important;
}

/* --- 5. Note list header, buttons and search --- */
.note-list-header {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-fg) !important;
  border-bottom: 1px solid var(--od-border) !important;
}

.note-list-header .title {
  color: var(--od-fg) !important;
}

.new-note-todo-buttons {
  background-color: var(--od-bg-alt) !important;
}

.new-note-button,
.new-todo-button {
  background-color: var(--od-link) !important;
  color: var(--od-bg) !important;
  border: none !important;
  border-radius: 4px !important;
  font-weight: 700 !important;
  box-shadow: none !important;
}

.new-note-button:hover,
.new-todo-button:hover {
  background-color: var(--od-link-hover) !important;
}

.new-note-button svg,
.new-note-button path,
.new-note-button .icon,
.new-todo-button svg,
.new-todo-button path,
.new-todo-button .icon {
  fill: var(--od-bg) !important;
  color: var(--od-bg) !important;
}

.note-list input[type="search"],
.search-bar input,
.search-and-sort input {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border: 1px solid var(--od-border) !important;
  border-radius: 4px !important;
}

.search-bar svg,
.search-bar path,
.search-and-sort svg,
.search-and-sort path {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

.sort-order-field-button,
.sort-order-reverse-button {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  border: 1px solid var(--od-border) !important;
  border-radius: 4px !important;
}

/* --- 6. Note title bar --- */
.note-title-wrapper {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-fg) !important;
  border-bottom: 1px solid var(--od-border) !important;
  box-sizing: border-box !important;
  min-height: 40px !important;
}

input.title-input {
  background-color: transparent !important;
  border: none !important;
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

.note-title-info-group {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.note-title-info-group,
.note-title-info-group span,
.updated-time-label {
  color: var(--od-fg) !important;
}

.note-title-info-group svg,
.note-title-info-group path {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

.toolbar-button {
  background-color: transparent !important;
  color: var(--od-fg) !important;
  border: none !important;
}

.toolbar-button:hover {
  background-color: var(--od-selection) !important;
  border-radius: 4px !important;
}

/* --- 7. Markdown editor formatting toolbar --- */
.editor-toolbar {
  background-color: var(--od-bg-alt) !important;
  border-bottom: none !important;
}

.editor-toolbar .toolbar-button,
.editor-toolbar .group {
  color: var(--od-fg) !important;
  background-color: transparent !important;
}

.editor-toolbar svg,
.editor-toolbar path,
.editor-toolbar .icon {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

/* --- 8. Tag bar (status bar) and warning banners --- */
.tag-bar {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-fg) !important;
  border-top: 1px solid var(--od-border) !important;
}

.tag-bar svg,
.tag-bar path {
  fill: var(--od-fg) !important;
  color: var(--od-fg) !important;
}

.tag-list .tag-item,
.tag-bar .tag-item {
  background-color: var(--od-selection) !important;
  color: var(--od-fg) !important;
  border-radius: 4px !important;
}

.warning-banner {
  background-color: var(--od-bg-alt) !important;
  color: var(--od-fg) !important;
  border-top: 1px solid var(--od-border) !important;
}

.warning-banner-link {
  color: var(--od-link) !important;
  font-weight: 700 !important;
}

/* --- 9. Third-party plugin panels (Outline, Note Tabs, ...) --- */
.resizableLayoutItem[class*="rli-plugin-view-"] {
  background-color: var(--od-bg) !important;
  border-left: 1px solid var(--od-border) !important;
}

/* --- 10. Scrollbars --- */
.sidebar::-webkit-scrollbar,
.note-list::-webkit-scrollbar,
.item-list::-webkit-scrollbar {
  width: 6px !important;
}

.sidebar::-webkit-scrollbar-track,
.note-list::-webkit-scrollbar-track,
.item-list::-webkit-scrollbar-track {
  background: var(--od-scrollbar-track) !important;
}

.sidebar::-webkit-scrollbar-thumb,
.note-list::-webkit-scrollbar-thumb,
.item-list::-webkit-scrollbar-thumb {
  background: var(--od-scrollbar-thumb) !important;
  border-radius: 3px !important;
}
`;
}

// =================================================================
// 2b. THIRD-PARTY PLUGIN PANEL (WEBVIEW) THEMING
// =================================================================
/**
 * Stylesheet injected into plugin-owned iframes (Outline, Note Tabs, ...).
 * These frames have their own document, so the shell cascade above is
 * irrelevant there and is no longer concatenated - only the palette, the
 * Joplin variables the panels read, and a small set of element defaults.
 */
export function buildPanelCss(options: StyleOptions): string {
  const selectedTheme = resolveTheme(options);
  const { fontImport, resolvedFont } = resolveFonts(options);
  const cssVariables = buildCssVariables(selectedTheme);

  return `${fontImport}
${cssVariables}
:root {
  --joplin-background-color: var(--od-bg);
  --joplin-background-color-transparent30: var(--od-selection);
  --joplin-color: var(--od-fg);
  --joplin-color-hover: var(--od-link);
  --joplin-divider-color: var(--od-border);
}
html, body {
  background-color: var(--od-bg) !important;
  color: var(--od-fg) !important;
  font-family: ${resolvedFont} !important;
}
body, #root, #app, .panel, header, .header, nav, .toolbar, .search-container, .top-bar {
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

  return compactCss(`${fontImport}\n${cssVariables}\n${dirRules}\n${coreStyles}${printStyles}${scrollbarStyles}`);
}
