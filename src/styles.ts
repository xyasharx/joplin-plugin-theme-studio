import { themes } from './themes';

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
      resolvedFont = options.fontFamily || `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
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
      resolvedCodeFont = options.codeFont || `'Cascadia Code', 'Fira Code', 'Consolas', monospace`;
      break;
  }

  return { fontImport, resolvedFont, resolvedCodeFont };
}

// =================================================================
// 1. MARKDOWN EDITOR (CodeMirror 6, CodeMirror 5 & TinyMCE) ENGINE
// =================================================================
export function buildEditorCss(options: StyleOptions): string {
  const selectedTheme = themes[options.themeKey] || themes['atom-one-dark'];
  const { fontImport, resolvedFont, resolvedCodeFont } = resolveFonts(options);

  let cssVariables = ':root {\n';
  for (const [key, value] of Object.entries(selectedTheme.variables)) {
    cssVariables += `  ${key}: ${value};\n`;
  }
  cssVariables += '}\n';

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
.CodeMirror-cursor {
  border-left: 2px solid var(--od-link) !important;
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
  const selectedTheme = themes[options.themeKey] || themes['atom-one-dark'];
  const { fontImport, resolvedFont } = resolveFonts(options);

  let cssVariables = ':root {\n';
  for (const [key, value] of Object.entries(selectedTheme.variables)) {
    cssVariables += `  ${key}: ${value};\n`;
  }
  cssVariables += '}\n';

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
// 3. MARKDOWN VIEWER & PDF RENDER ENGINE
// =================================================================
export function buildThemeCss(options: StyleOptions): string {
  const selectedTheme = themes[options.themeKey] || themes['atom-one-dark'];
  const { fontImport, resolvedFont, resolvedCodeFont } = resolveFonts(options);

  let cssVariables = ':root {\n';
  for (const [key, value] of Object.entries(selectedTheme.variables)) {
    cssVariables += `  ${key}: ${value};\n`;
  }
  cssVariables += `  --mermaid-font-family: ${resolvedFont} !important;\n`;
  cssVariables += '}\n';

  let dirRules = '';
  if (options.direction === 'rtl') {
    dirRules = `
body#tinymce, body, #rendered-md { direction: rtl !important; text-align: right !important; }
body#tinymce h1, #rendered-md h1 { text-align: right !important; }
body#tinymce h2, #rendered-md h2 {
  border-right: 5px solid var(--od-h2) !important;
  border-left: none !important;
  padding-right: 12px !important;
  padding-left: 0 !important;
  text-align: right !important;
}
body#tinymce :is(h3, h4, h5, h6), #rendered-md :is(h3, h4, h5, h6) { text-align: right !important; }
body#tinymce ul, body#tinymce ol, #rendered-md ul, #rendered-md ol {
  direction: rtl !important;
  text-align: right !important;
  padding-right: 1.6em !important;
  padding-left: 0 !important;
}
#rendered-md li, body#tinymce li { direction: rtl !important; text-align: right !important; }
#rendered-md ul ul, #rendered-md ol ol, #rendered-md ul ol, #rendered-md ol ul,
body#tinymce ul ul, body#tinymce ol ol, body#tinymce ul ol, body#tinymce ol ul {
  padding-right: 1.4em !important;
  padding-left: 0 !important;
}
.md-checkbox input[type="checkbox"] { margin-left: 8px !important; margin-right: 0 !important; }

/* RTL Blockquotes: 1px Right Border & No Left Border */
body#tinymce blockquote, #rendered-md blockquote {
  direction: rtl !important;
  text-align: right !important;
  border-right: 1px solid var(--od-comment) !important;
  border-left: 0 !important;
}
body#tinymce th, #rendered-md th, body#tinymce td, #rendered-md td { text-align: right !important; }
.mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .label, .mermaid text {
  direction: rtl !important;
  unicode-bidi: plaintext !important;
}

#rendered-md [dir="ltr"], body#tinymce [dir="ltr"],
#rendered-md [dir="ltr"] :is(h1, h2, h3, h4, h5, h6, p, li, blockquote, dt, dd),
body#tinymce [dir="ltr"] :is(h1, h2, h3, h4, h5, h6, p, li, blockquote, dt, dd) {
  direction: ltr !important;
  text-align: left !important;
}
#rendered-md [dir="ltr"] h2, body#tinymce [dir="ltr"] h2 {
  border-right: none !important;
  border-left: 5px solid var(--od-h2) !important;
  padding-left: 12px !important;
  padding-right: 0 !important;
}
#rendered-md [dir="ltr"] blockquote, body#tinymce [dir="ltr"] blockquote {
  border-right: none !important;
  border-left: 1px solid var(--od-comment) !important;
  padding-left: 16px !important;
  padding-right: 12px !important;
}
#rendered-md [dir="ltr"] :is(ul, ol), body#tinymce [dir="ltr"] :is(ul, ol) {
  direction: ltr !important;
  text-align: left !important;
  padding-left: 1.6em !important;
  padding-right: 0 !important;
}
#rendered-md [dir="ltr"] :is(ul ul, ol ol, ul ol, ol ul), body#tinymce [dir="ltr"] :is(ul ul, ol ol, ul ol, ol ul) {
  padding-left: 1.4em !important;
  padding-right: 0 !important;
}
#rendered-md [dir="ltr"] .md-checkbox input[type="checkbox"], body#tinymce [dir="ltr"] .md-checkbox input[type="checkbox"] {
  margin-right: 8px !important;
  margin-left: 0 !important;
}
#rendered-md [dir="ltr"] table :is(th, td), body#tinymce [dir="ltr"] table :is(th, td) { text-align: left !important; }
`;
  } else if (options.direction === 'auto') {
    dirRules = `
body#tinymce, body, #rendered-md { direction: ltr !important; text-align: start !important; }
#rendered-md :is(p, h1, h2, h3, h4, h5, h6, li, blockquote, dt, dd) {
  unicode-bidi: plaintext !important;
  text-align: start !important;
}
body#tinymce h2, #rendered-md h2 { border-inline-start: 5px solid var(--od-h2) !important; padding-inline-start: 12px !important; }
body#tinymce ul, body#tinymce ol, #rendered-md ul, #rendered-md ol { padding-inline-start: 2em !important; }

/* Auto-BiDi Blockquotes: 1px Border on Dynamic Inline Start */
body#tinymce blockquote, #rendered-md blockquote {
  border-inline-start: 1px solid var(--od-comment) !important;
  border-inline-end: 0 !important;
  padding-inline-start: 16px !important;
}
body#tinymce th, #rendered-md th, body#tinymce td, #rendered-md td { text-align: start !important; }
.mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .label, .mermaid text { unicode-bidi: plaintext !important; }
`;
  } else {
    dirRules = `
body#tinymce, body, #rendered-md { direction: ltr !important; text-align: left !important; }
body#tinymce h2, #rendered-md h2 {
  border-left: 5px solid var(--od-h2) !important;
  border-right: none !important;
  padding-left: 12px !important;
  padding-right: 0 !important;
}
body#tinymce ul, body#tinymce ol, #rendered-md ul, #rendered-md ol { padding-left: 2em !important; }
.md-checkbox input[type="checkbox"] { margin-right: 8px !important; margin-left: 0 !important; }

/* LTR Blockquotes: 1px Left Border & No Right Border */
body#tinymce blockquote, #rendered-md blockquote {
  border-left: 1px solid var(--od-comment) !important;
  border-right: 0 !important;
}
body#tinymce th, #rendered-md th, body#tinymce td, #rendered-md td { text-align: left !important; }
.mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .label, .mermaid text { direction: ltr !important; }
`;
  }

  let contentWidthCss = '';
  if (options.contentMaxWidth === 'compact') {
    contentWidthCss = `max-width: 760px !important; margin: 0 auto !important;`;
  } else if (options.contentMaxWidth === 'comfortable') {
    contentWidthCss = `max-width: 920px !important; margin: 0 auto !important;`;
  }

  const isPaperMode = options.pdfExportStyle === 'paper';
  const printBodyBg = isPaperMode ? '#ffffff' : 'var(--od-bg)';
  const printBodyFg = isPaperMode ? '#1e2227' : 'var(--od-fg)';

  const coreStyles = `
*, *::before, *::after { box-sizing: border-box !important; }
html, body, #rendered-md { max-width: 100% !important; overflow-x: hidden !important; }
::selection { background-color: var(--od-selection) !important; }

body#tinymce, body, #rendered-md {
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

#rendered-md { ${contentWidthCss} }

body#tinymce h1, #rendered-md h1 {
  color: var(--od-h1) !important;
  font-size: 1.75em !important;
  font-weight: 800 !important;
  padding: 0 0 8px 0 !important;
  margin: 32px 0 20px 0 !important;
  border-bottom: 2px solid var(--od-h1) !important;
}

body#tinymce h2, #rendered-md h2 {
  color: var(--od-h2) !important;
  font-size: 1.42em !important;
  font-weight: 700 !important;
  margin: 28px 0 18px 0 !important;
}

body#tinymce h3, #rendered-md h3 { color: var(--od-h3) !important; font-size: 1.25em !important; font-weight: 600 !important; margin: 24px 0 14px 0 !important; }
body#tinymce h4, #rendered-md h4 { color: var(--od-h4) !important; font-size: 1.12em !important; font-weight: 600 !important; margin: 20px 0 12px 0 !important; }
body#tinymce h5, #rendered-md h5 { color: var(--od-h5) !important; font-size: 1.05em !important; font-weight: 600 !important; margin: 18px 0 10px 0 !important; }
body#tinymce h6, #rendered-md h6 { color: var(--od-h6) !important; font-size: 1.0em !important; font-weight: 700 !important; margin: 16px 0 10px 0 !important; }

#rendered-md li, body#tinymce li { margin-bottom: 0.45em !important; line-height: ${options.lineHeight} !important; }
#rendered-md li::marker, body#tinymce li::marker { color: var(--od-h2) !important; font-weight: bold !important; }

.md-checkbox input[type="checkbox"] { vertical-align: middle !important; cursor: pointer !important; }
#rendered-md li:has(input[type="checkbox"]:checked),
body#tinymce li:has(input[type="checkbox"]:checked) {
  opacity: 0.55 !important;
  text-decoration: line-through !important;
  transition: opacity 0.2s ease !important;
}
#rendered-md li:has(input[type="checkbox"]:checked) code,
body#tinymce li:has(input[type="checkbox"]:checked) code { opacity: 0.8 !important; text-decoration: none !important; }

#rendered-md img, body#tinymce img {
  max-width: 100% !important;
  max-height: 520px !important;
  height: auto !important;
  object-fit: contain !important;
  display: block !important;
  margin: 18px auto !important;
  border-radius: 6px !important;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08) !important;
}

body#tinymce a, #rendered-md a { color: var(--od-link) !important; text-decoration: none !important; transition: color 0.15s ease !important; }
body#tinymce a:hover, #rendered-md a:hover { color: var(--od-link-hover) !important; text-decoration: underline !important; }

#rendered-md a[href^=":/"], body#tinymce a[href^=":/"] {
  font-weight: 600 !important;
  border-bottom: 1.5px dashed var(--od-link) !important;
  text-decoration: none !important;
}
#rendered-md a[href^=":/"]:hover, body#tinymce a[href^=":/"]:hover { border-bottom-style: solid !important; }

/* =================================================================
   BLOCKQUOTES: CLEAN MINIMAL 1PX STYLE (TRANSPARENT BG, NO RADIUS)
   ================================================================= */
body#tinymce blockquote, #rendered-md blockquote {
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

body#tinymce .joplin-source, #rendered-md .joplin-source, pre.joplin-source, div.joplin-editable > pre.joplin-source {
  display: none !important; visibility: hidden !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important;
}

body#tinymce code, #rendered-md code {
  font-family: ${resolvedCodeFont} !important;
  background-color: var(--od-code-bg) !important;
  color: var(--od-code-fg) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-size: 0.9em !important;
}

body#tinymce pre:not(.mermaid):not(.joplin-source),
#rendered-md pre:not(.mermaid):not(.joplin-source) {
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

body#tinymce pre:not(.mermaid):not(.joplin-source) code,
#rendered-md pre:not(.mermaid):not(.joplin-source) code {
  background-color: transparent !important;
  color: var(--od-fg) !important;
  padding: 0 !important;
  white-space: pre !important;
  display: inline-block !important;
  min-width: 100% !important;
}

body#tinymce :is(p, li) code, #rendered-md :is(p, li) code {
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
body#tinymce table, #rendered-md table,
body#tinymce th, #rendered-md th,
body#tinymce td, #rendered-md td {
  font-family: ${resolvedFont} !important;
}
body#tinymce table :is(th, td) *:not(code):not(pre),
#rendered-md table :is(th, td) *:not(code):not(pre) {
  font-family: ${resolvedFont} !important;
}
body#tinymce table :is(th, td) code,
#rendered-md table :is(th, td) code {
  font-family: ${resolvedCodeFont} !important;
}

body#tinymce table, #rendered-md table {
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

body#tinymce th, #rendered-md th {
  background-color: var(--od-table-th) !important;
  color: var(--od-link) !important;
  font-weight: bold !important;
  border: 1px solid var(--od-border) !important;
  padding: 8px 12px !important;
  white-space: nowrap !important;
}

body#tinymce td, #rendered-md td {
  border: 1px solid var(--od-border) !important;
  padding: 8px 12px !important;
  color: var(--od-fg) !important;
}

#rendered-md table td :not(code):not(pre):not(a),
body#tinymce table td :not(code):not(pre):not(a) { color: var(--od-fg) !important; }
body#tinymce tr:nth-child(even), #rendered-md tr:nth-child(even) { background-color: var(--od-table-even) !important; }
body#tinymce tr:nth-child(odd), #rendered-md tr:nth-child(odd) { background-color: var(--od-table-odd) !important; }

/* Mermaid Diagrams */
#rendered-md .mermaid, #rendered-md div.mermaid, #rendered-md pre.mermaid,
body#tinymce .mermaid, body#tinymce div.mermaid, body#tinymce pre.mermaid {
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

#rendered-md .mermaid svg, #rendered-md div.mermaid svg, #rendered-md pre.mermaid svg {
  display: inline-block !important;
  vertical-align: middle !important;
  margin: 0 auto !important;
  height: auto !important;
  max-width: 100% !important;
  width: auto !important;
}

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

#rendered-md .table-of-contents, body#tinymce .table-of-contents {
  background-color: var(--od-bg-alt) !important;
  border: 1px solid var(--od-border) !important;
  border-radius: 6px !important;
  padding: 12px 18px !important;
  margin: 20px 0 !important;
  display: inline-block !important;
  min-width: min(100%, 300px) !important;
}
#rendered-md .table-of-contents ul { margin: 4px 0 !important; }

#rendered-md .footnotes, body#tinymce .footnotes {
  margin-top: 40px !important;
  padding-top: 16px !important;
  border-top: 1px solid var(--od-border) !important;
  font-size: 0.88em !important;
  color: var(--od-comment) !important;
}

/* Mobile Responsiveness (< 768px) */
@media screen and (max-width: 768px) {
  body#tinymce, body, #rendered-md {
    font-size: ${options.fontSize} !important;
    line-height: ${options.lineHeight} !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  body#tinymce h1, #rendered-md h1 { font-size: 1.6em !important; margin: 20px 0 12px 0 !important; }
  body#tinymce h2, #rendered-md h2 { font-size: 1.35em !important; margin: 18px 0 10px 0 !important; }
  body#tinymce h3, #rendered-md h3 { font-size: 1.2em !important; margin: 16px 0 8px 0 !important; }
  #rendered-md img, body#tinymce img { max-height: 420px !important; }

  body#tinymce pre:not(.mermaid):not(.joplin-source),
  #rendered-md pre:not(.mermaid):not(.joplin-source) {
    font-size: 0.9em !important;
    padding: 10px 12px !important;
    white-space: pre !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  body#tinymce table, #rendered-md table {
    font-size: 0.9em !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  #rendered-md .mermaid, body#tinymce .mermaid {
    padding: 14px 8px !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow-x: auto !important;
  }
}

/* =================================================================
   FLAWLESS PDF & PRINT EXPORT ENGINE
   ================================================================= */
@page {
  margin: 12mm 15mm 12mm 15mm;
  size: auto;
}

@media print {
  *, *::before, *::after, html, body, #rendered-md {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body, #rendered-md {
    background-color: ${printBodyBg} !important;
    color: ${printBodyFg} !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 14px !important;
    line-height: ${options.lineHeight} !important;
  }

  body#tinymce table, #rendered-md table,
  body#tinymce th, #rendered-md th,
  body#tinymce td, #rendered-md td {
    font-family: ${resolvedFont} !important;
  }

  body#tinymce table :is(th, td) code,
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

  body#tinymce h1, #rendered-md h1 { color: var(--od-h1) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h2, #rendered-md h2 { color: var(--od-h2) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h3, #rendered-md h3 { color: var(--od-h3) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h4, #rendered-md h4 { color: var(--od-h4) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h5, #rendered-md h5 { color: var(--od-h5) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h6, #rendered-md h6 { color: var(--od-h6) !important; page-break-after: avoid !important; break-after: avoid !important; }

  body#tinymce table, #rendered-md table {
    display: table !important;
    width: 100% !important;
    max-width: 100% !important;
    table-layout: auto !important;
    overflow: visible !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
    margin: 16px 0 !important;
  }

  body#tinymce tr, #rendered-md tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  body#tinymce th, #rendered-md th, body#tinymce td, #rendered-md td {
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    padding: 6px 10px !important;
  }

  body#tinymce pre:not(.mermaid):not(.joplin-source),
  #rendered-md pre:not(.mermaid):not(.joplin-source) {
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

  body#tinymce pre:not(.mermaid):not(.joplin-source) code,
  #rendered-md pre:not(.mermaid):not(.joplin-source) code {
    white-space: pre-wrap !important;
    display: block !important;
    min-width: 100% !important;
  }

  #rendered-md .mermaid, body#tinymce .mermaid {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    overflow: visible !important;
    background-color: var(--od-mermaid-bg) !important;
    border: 1px solid var(--od-mermaid-border) !important;
    padding: 16px 10px !important;
    margin: 18px auto !important;
  }

  #rendered-md .mermaid svg, body#tinymce .mermaid svg {
    max-width: 100% !important;
    height: auto !important;
    display: block !important;
    margin: 0 auto !important;
  }

  #rendered-md img, body#tinymce img {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    max-width: 100% !important;
    height: auto !important;
  }

  body#tinymce blockquote, #rendered-md blockquote {
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

::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
::-webkit-scrollbar-track { background: var(--od-scrollbar-track) !important; border-radius: 4px !important; }
::-webkit-scrollbar-thumb { background: var(--od-scrollbar-thumb) !important; border-radius: 4px !important; }
::-webkit-scrollbar-thumb:hover { background: var(--od-scrollbar-hover) !important; }
`;

  return `${fontImport}\n${cssVariables}\n${dirRules}\n${coreStyles}`;
}
