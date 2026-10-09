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

export function buildThemeCss(options: StyleOptions): string {
  const selectedTheme = themes[options.themeKey] || themes['atom-one-dark'];

  // 1. Resolve Primary Font Stack & CDN Imports
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

  // 2. Resolve Monospace Code Font Stack
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

  // 3. Theme CSS Variables
  let cssVariables = ':root {\n';
  for (const [key, value] of Object.entries(selectedTheme.variables)) {
    cssVariables += `  ${key}: ${value};\n`;
  }
  cssVariables += `  --mermaid-font-family: ${resolvedFont} !important;\n`;
  cssVariables += '}\n';

  // 4. Directional Styling (LTR Priority, Auto BiDi, and RTL)
  let dirRules = '';

  if (options.direction === 'rtl') {
    dirRules = `
body#tinymce, body, #rendered-md {
  direction: rtl !important;
  text-align: right !important;
}
body#tinymce h1, #rendered-md h1 { text-align: right !important; }
body#tinymce h2, #rendered-md h2 {
  border-right: 5px solid var(--od-h2) !important;
  border-left: none !important;
  padding-right: 12px !important;
  padding-left: 0 !important;
  text-align: right !important;
}
body#tinymce :is(h3, h4, h5, h6), #rendered-md :is(h3, h4, h5, h6) {
  text-align: right !important;
}
body#tinymce ul, body#tinymce ol, #rendered-md ul, #rendered-md ol {
  direction: rtl !important;
  text-align: right !important;
  padding-right: 1.6em !important;
  padding-left: 0 !important;
}
#rendered-md li, body#tinymce li {
  direction: rtl !important;
  text-align: right !important;
}
#rendered-md ul ul, #rendered-md ol ol, #rendered-md ul ol, #rendered-md ol ul,
body#tinymce ul ul, body#tinymce ol ol, body#tinymce ul ol, body#tinymce ol ul {
  padding-right: 1.4em !important;
  padding-left: 0 !important;
}
.md-checkbox input[type="checkbox"] {
  margin-left: 8px !important;
  margin-right: 0 !important;
}
body#tinymce blockquote, #rendered-md blockquote {
  direction: rtl !important;
  text-align: right !important;
  border-right: 4px solid var(--od-comment) !important;
  border-left: 0 !important;
}
body#tinymce th, #rendered-md th,
body#tinymce td, #rendered-md td {
  text-align: right !important;
}
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
  border-left: 4px solid var(--od-comment) !important;
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
#rendered-md [dir="ltr"] table :is(th, td), body#tinymce [dir="ltr"] table :is(th, td) {
  text-align: left !important;
}
`;
  } else if (options.direction === 'auto') {
    dirRules = `
body#tinymce, body, #rendered-md {
  direction: ltr !important;
  text-align: start !important;
}
#rendered-md :is(p, h1, h2, h3, h4, h5, h6, li, blockquote, dt, dd) {
  unicode-bidi: plaintext !important;
  text-align: start !important;
}
body#tinymce h2, #rendered-md h2 {
  border-inline-start: 5px solid var(--od-h2) !important;
  padding-inline-start: 12px !important;
}
body#tinymce ul, body#tinymce ol, #rendered-md ul, #rendered-md ol {
  padding-inline-start: 2em !important;
}
body#tinymce blockquote, #rendered-md blockquote {
  border-inline-start: 4px solid var(--od-comment) !important;
  padding-inline-start: 16px !important;
}
body#tinymce th, #rendered-md th,
body#tinymce td, #rendered-md td {
  text-align: start !important;
}
.mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .label, .mermaid text {
  unicode-bidi: plaintext !important;
}
`;
  } else {
    dirRules = `
body#tinymce, body, #rendered-md {
  direction: ltr !important;
  text-align: left !important;
}
body#tinymce h2, #rendered-md h2 {
  border-left: 5px solid var(--od-h2) !important;
  border-right: none !important;
  padding-left: 12px !important;
  padding-right: 0 !important;
}
body#tinymce ul, body#tinymce ol, #rendered-md ul, #rendered-md ol {
  padding-left: 2em !important;
  padding-right: 0 !important;
}
.md-checkbox input[type="checkbox"] {
  margin-right: 8px !important;
  margin-left: 0 !important;
}
body#tinymce blockquote, #rendered-md blockquote {
  border-left: 4px solid var(--od-comment) !important;
  border-right: 0 !important;
}
body#tinymce th, #rendered-md th,
body#tinymce td, #rendered-md td {
  text-align: left !important;
}
.mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .label, .mermaid text {
  direction: ltr !important;
}
`;
  }

  // 5. Reading Width (Focus Mode)
  let contentWidthCss = '';
  if (options.contentMaxWidth === 'compact') {
    contentWidthCss = `max-width: 760px !important; margin: 0 auto !important;`;
  } else if (options.contentMaxWidth === 'comfortable') {
    contentWidthCss = `max-width: 920px !important; margin: 0 auto !important;`;
  }

  // 6. PDF Print Styling Logic
  const isPaperMode = options.pdfExportStyle === 'paper';
  const printBodyBg = isPaperMode ? '#ffffff' : 'var(--od-bg)';
  const printBodyFg = isPaperMode ? '#1e2227' : 'var(--od-fg)';

  // 7. Complete Core Styles
  const coreStyles = `
*, *::before, *::after {
  box-sizing: border-box !important;
}

html, body, #rendered-md {
  max-width: 100% !important;
  overflow-x: hidden !important;
}

::selection {
  background-color: var(--od-selection) !important;
}

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

#rendered-md {
  ${contentWidthCss}
}

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

#rendered-md li, body#tinymce li {
  margin-bottom: 0.45em !important;
  line-height: ${options.lineHeight} !important;
}

#rendered-md li::marker, body#tinymce li::marker {
  color: var(--od-h2) !important;
  font-weight: bold !important;
}

/* Intelligent Checklist Styling */
.md-checkbox input[type="checkbox"] {
  vertical-align: middle !important;
  cursor: pointer !important;
}

#rendered-md li:has(input[type="checkbox"]:checked),
body#tinymce li:has(input[type="checkbox"]:checked) {
  opacity: 0.55 !important;
  text-decoration: line-through !important;
  transition: opacity 0.2s ease !important;
}

#rendered-md li:has(input[type="checkbox"]:checked) code,
body#tinymce li:has(input[type="checkbox"]:checked) code {
  opacity: 0.8 !important;
  text-decoration: none !important;
}

/* Responsive Images */
#rendered-md img,
body#tinymce img {
  max-width: 100% !important;
  max-height: 520px !important;
  height: auto !important;
  object-fit: contain !important;
  display: block !important;
  margin: 18px auto !important;
  border-radius: 6px !important;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08) !important;
}

/* Links (Standard vs Joplin Note Links) */
body#tinymce a, #rendered-md a {
  color: var(--od-link) !important;
  text-decoration: none !important;
  transition: color 0.15s ease !important;
}
body#tinymce a:hover, #rendered-md a:hover {
  color: var(--od-link-hover) !important;
  text-decoration: underline !important;
}

#rendered-md a[href^=":/"], body#tinymce a[href^=":/"] {
  font-weight: 600 !important;
  border-bottom: 1.5px dashed var(--od-link) !important;
  text-decoration: none !important;
}
#rendered-md a[href^=":/"]:hover, body#tinymce a[href^=":/"]:hover {
  border-bottom-style: solid !important;
}

/* Blockquotes & Callouts */
body#tinymce blockquote, #rendered-md blockquote {
  padding: 10px 16px !important;
  margin: 18px 0 !important;
  background: var(--od-bg-alt) !important;
  border-radius: 4px !important;
  color: var(--od-fg) !important;
}

mark {
  background-color: var(--od-mark-bg) !important;
  color: var(--od-fg) !important;
  padding: 1px 4px !important;
  border-radius: 3px !important;
}

kbd {
  background-color: var(--od-kbd-bg) !important;
  border: 1px solid var(--od-border) !important;
  color: var(--od-fg) !important;
  padding: 2px 5px !important;
  border-radius: 4px !important;
  font-size: 0.85em !important;
  box-shadow: 0 1px 0 rgba(0,0,0,0.2) !important;
}

body#tinymce .joplin-source,
#rendered-md .joplin-source,
pre.joplin-source,
div.joplin-editable > pre.joplin-source {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
}

/* Inline Code & Code Blocks */
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
  word-break: normal !important;
  word-wrap: normal !important;
  overflow-wrap: normal !important;
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

/* =================================================================
   TABLES: COMPREHENSIVE FONT OVERRIDE & CONTRAST FIX
   ================================================================= */
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
body#tinymce table td :not(code):not(pre):not(a) {
  color: var(--od-fg) !important;
}

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
  background-color: transparent !important;
  fill: transparent !important;
  opacity: 0 !important;
  border: none !important;
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
#rendered-md .table-of-contents ul {
  margin: 4px 0 !important;
}

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

  #rendered-md img, body#tinymce img {
    max-height: 420px !important;
  }

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

  /* Retain Chosen Font in Tables During PDF Export */
  body#tinymce table, #rendered-md table,
  body#tinymce th, #rendered-md th,
  body#tinymce td, #rendered-md td {
    font-family: ${resolvedFont} !important;
  }

  body#tinymce table :is(th, td) code,
  #rendered-md table :is(th, td) code {
    font-family: ${resolvedCodeFont} !important;
  }

  /* Joplin Exported Note Title Styling */
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

  /* Headings: Retain theme colors & prevent orphan page splits */
  body#tinymce h1, #rendered-md h1 { color: var(--od-h1) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h2, #rendered-md h2 { color: var(--od-h2) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h3, #rendered-md h3 { color: var(--od-h3) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h4, #rendered-md h4 { color: var(--od-h4) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h5, #rendered-md h5 { color: var(--od-h5) !important; page-break-after: avoid !important; break-after: avoid !important; }
  body#tinymce h6, #rendered-md h6 { color: var(--od-h6) !important; page-break-after: avoid !important; break-after: avoid !important; }

  /* Tables: Convert from scrollable blocks to full printable tables (No Cropping!) */
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

  body#tinymce tr, #rendered-md tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  body#tinymce th, #rendered-md th,
  body#tinymce td, #rendered-md td {
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    padding: 6px 10px !important;
  }

  /* Code Blocks: Wrap long lines so nothing runs off the page */
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

  /* Diagrams, Images, Blockquotes & Formulas */
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
    background-color: var(--od-bg-alt) !important;
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
