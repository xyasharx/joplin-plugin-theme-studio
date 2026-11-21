import { buildThemeCss, StyleOptions } from './styles';
import { themes } from './themes';

/**
 * Sample document rendered inside the live preview panel. It exercises every
 * styled element (headings, lists, tables, code, blockquotes, images, links)
 * so a settings change is visible at a glance.
 */
const PREVIEW_SAMPLE = `
<h1>Theme Studio Preview</h1>
<p>This panel renders a sample note with the <strong>current</strong> theme,
fonts and direction. <em>Edit any setting</em> in Tools &gt; Options and the
preview updates automatically.</p>

<h2>Headings and text</h2>
<p>Body text with an <a href="#">inline link</a> and <code>inline code</code>.
A longer paragraph demonstrates line wrapping, reading width and the theme
colour palette applied to normal prose.</p>

<h3>Lists</h3>
<ul>
  <li>Unordered item one</li>
  <li>Unordered item two</li>
</ul>
<ol>
  <li>Ordered item one</li>
  <li>Ordered item two</li>
</ol>

<blockquote>Blockquotes use the theme accent border and background.</blockquote>

<h3>Table</h3>
<table>
  <thead>
    <tr><th>Feature</th><th>Status</th></tr>
  </thead>
  <tbody>
    <tr><td>Light / dark palettes</td><td>Supported</td></tr>
    <tr><td>BiDi typography</td><td>Supported</td></tr>
  </tbody>
</table>

<h3>Code</h3>
<pre><code>function greet(name) {
  return 'Hello, ' + name + '!';
}</code></pre>

<h3>Image</h3>
<p><img src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='90'%3E%3Crect width='320' height='90' rx='8' fill='%2361afef'/%3E%3Ctext x='160' y='50' font-family='sans-serif' font-size='16' fill='white' text-anchor='middle'%3ETheme Studio%3C/text%3E%3C/svg%3E" alt="Sample image"></p>
`;

/**
 * Builds the full HTML document for the live preview panel: the generated
 * viewer stylesheet plus the sample document, wrapped in the #rendered-md
 * scope the stylesheet targets. The panel webview is a standalone document,
 * so the font @import at the top of the stylesheet loads normally.
 */
export function buildPreviewHtml(options: StyleOptions): string {
  const css = buildThemeCss(options, 'viewer');
  const themeName = (themes[options.themeKey] || themes['atom-one-dark']).name;
  const directionLabel = options.direction === 'rtl' ? 'RTL' : options.direction === 'auto' ? 'Auto BiDi' : 'LTR';
  const schemeLabel = options.colorSchemeMode === 'system' ? 'System' : 'Theme';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Theme Studio Preview</title>
<style>
${css}
</style>
<style>
html, body { margin: 0; padding: 0; }
body { background-color: var(--od-bg); }
.preview-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 18px;
  background: var(--od-bg-alt);
  border-bottom: 1px solid var(--od-border);
  font-size: 13px; color: var(--od-comment);
}
.preview-header strong { color: var(--od-fg); font-size: 14px; }
#rendered-md { padding: 22px 18px; }
</style>
</head>
<body>
<div class="preview-header">
  <strong>Theme Studio — Live Preview</strong>
  <span>${themeName} · ${directionLabel} · ${schemeLabel}</span>
</div>
<div id="rendered-md">
${PREVIEW_SAMPLE}
</div>
</body>
</html>
`;
}
