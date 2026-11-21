const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
process.env.NODE_PATH = [path.resolve(__dirname, '..'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
require('node:module').Module._initPaths();
const { transformSync } = require('esbuild');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(transformSync(source, { loader: 'ts', format: 'cjs', target: 'es2018' }).code, filename);
};
const { buildChromeCss, buildEditorCss, buildThemeCss } = require('../src/styles.ts');
const { themes } = require('../src/themes.ts');
const { buildPreviewHtml } = require('../src/preview.ts');
const options = { themeKey: 'atom-one-dark', direction: 'ltr', fontPreset: 'system', fontFamily: '', codeFontPreset: 'system-mono', codeFont: '', fontSize: '16px', lineHeight: '1.75', contentMaxWidth: 'full', pdfExportStyle: 'exact' };

test('whiteboard variables follow every palette and do not overwrite chosen card colours', () => {
  for (const key of Object.keys(themes)) {
    const css = buildChromeCss({ ...options, themeKey: key });
    assert.ok(css.includes(`--od-bg: ${themes[key].variables['--od-bg']}`));
    const block = css.match(/\.whiteboard-editor\s*\{([^}]*)\}/)[1];
    for (const name of ['background-color', 'background-color3', 'color', 'divider-color', 'code-color', 'url-color']) assert.match(block, new RegExp(`--joplin-${name}:`));
    assert.doesNotMatch(css, /\.whiteboard-node\s*\{/);
  }
});

test('whiteboard mappings follow Joplin variable semantics', () => {
  const css = buildChromeCss({ ...options, themeKey: 'atom-one-dark' });
  const block = css.match(/\.whiteboard-editor\s*\{([^}]*)\}/)[1];
  // Faded text and hover tints are distinct roles in Joplin's own theme
  // definitions, so they must not reuse the primary foreground/background.
  assert.match(block, /--joplin-color-faded: var\(--od-comment\)/);
  assert.match(block, /--joplin-background-color-hover3: var\(--od-selection\)/);
});

test('font stacks are sanitized so user input cannot inject CSS rules', () => {
  const optionsWithFonts = {
    ...options,
    fontPreset: 'custom',
    fontFamily: 'x, }; body { background: red',
    codeFontPreset: 'custom',
    codeFont: 'y } p { color: blue',
  };
  for (const css of [buildEditorCss(optionsWithFonts), buildChromeCss(optionsWithFonts), buildThemeCss(optionsWithFonts, 'viewer')]) {
    // No rule can be terminated early, so the remainder of the value can only
    // parse as font-name text, never as fresh rules.
    assert.doesNotMatch(css, /\};/);
    const fontValue = /font-family: ([^;]*?) !important;/.exec(css);
    assert.ok(fontValue, 'expected a font-family declaration');
    assert.doesNotMatch(fontValue[1], /[;{}<>\\]/);
  }
  // Legitimate custom stacks still pass through untouched (compaction may
  // collapse whitespace after commas).
  const clean = buildThemeCss({ ...options, fontPreset: 'custom', fontFamily: "'Lora', Georgia, serif", codeFontPreset: 'custom', codeFont: "'Fira Code', monospace" }, 'viewer');
  assert.match(clean, /font-family: 'Lora',\s*Georgia,\s*serif !important/);
});

test('mobile tables are pinned to their content width so columns never squeeze', () => {
  const css = buildThemeCss({ ...options, direction: 'ltr' }, 'viewer');
  // On narrow screens the table must be at least as wide as its unwrapped
  // content; display:block + overflow-x:auto (base rule) then scrolls it
  // instead of collapsing columns into a narrow, character-wrapped column.
  assert.match(css, /#rendered-md table\s*\{\s*min-width:\s*max-content\s*!important/);
});

test('table cells keep min-content intact and never break everywhere', () => {
  const css = buildThemeCss({ ...options, direction: 'ltr' }, 'viewer');
  // The document-level overflow-wrap:anywhere collapses a cell's intrinsic
  // min-content width to one character and lets the table algorithm squeeze
  // columns; the table and its cells must opt back into break-word instead.
  assert.match(css, /#rendered-md table\{[^}]*word-break:\s*normal !important;overflow-wrap:\s*break-word !important/);
  assert.match(css, /#rendered-md td\{[^}]*word-break:\s*normal !important;overflow-wrap:\s*break-word !important/);
  assert.doesNotMatch(css, /#rendered-md table\{[^}]*overflow-wrap:\s*anywhere/);
});

test('table cell alignment follows the configured direction', () => {
  const rtl = buildThemeCss({ ...options, direction: 'rtl' }, 'viewer');
  assert.match(rtl, /#rendered-md :is\(th,\s*td\):not\(\[style\*="text-align"\]\)\{text-align:\s*right !important\}/);
  const ltr = buildThemeCss({ ...options, direction: 'ltr' }, 'viewer');
  assert.match(ltr, /#rendered-md :is\(th,\s*td\):not\(\[style\*="text-align"\]\)\{text-align:\s*left !important\}/);
  const auto = buildThemeCss({ ...options, direction: 'auto' }, 'viewer');
  assert.match(auto, /#rendered-md :is\(th,\s*td\):not\(\[style\*="text-align"\]\)\{text-align:\s*start !important\}/);
});

test('auto direction applies per-cell bidi detection to table cells', () => {
  const css = buildThemeCss({ ...options, direction: 'auto' }, 'viewer');
  assert.match(css, /#rendered-md :is\(p,\s*h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6,\s*li,\s*blockquote,\s*dt,\s*dd,\s*th,\s*td\)\{unicode-bidi:\s*plaintext !important/);
});

test('generated CSS avoids deprecated word-break and overflow-scrolling values', () => {
  for (const direction of ['ltr', 'rtl', 'auto']) {
    const css = buildThemeCss({ ...options, direction }, 'viewer');
    assert.doesNotMatch(css, /word-break:\s*break-word/);
    assert.doesNotMatch(css, /-webkit-overflow-scrolling/);
  }
});

test('system color scheme emits dark and light media query blocks', () => {
  const css = buildThemeCss({ ...options, colorSchemeMode: 'system' }, 'viewer');
  // The base :root keeps the selected theme as fallback and declares the
  // native color-scheme so scrollbars/form controls follow.
  assert.match(css, /:root\{[^}]*--od-bg: #282c34/);
  assert.match(css, /:root\{[^}]*color-scheme: dark/);
  // Each scheme block swaps in the paired palette's variables.
  assert.match(css, /@media \(prefers-color-scheme: dark\)\{:root\{[^}]*--od-bg: #282c34/);
  assert.match(css, /@media \(prefers-color-scheme: light\)\{:root\{[^}]*--od-bg: #fafafa/);
  // Token colours are recomputed per scheme so code stays readable.
  assert.match(css, /@media \(prefers-color-scheme: dark\)\{:root\{[^}]*--od-tok-keyword/);
  assert.match(css, /@media \(prefers-color-scheme: light\)\{:root\{[^}]*--od-tok-keyword/);
});

test('system color scheme falls back to the theme when no pair exists', () => {
  // Nord has no light counterpart: the base :root is emitted but no media
  // query block is added, so the palette never silently changes.
  const css = buildThemeCss({ ...options, themeKey: 'nord', colorSchemeMode: 'system' }, 'viewer');
  assert.match(css, /:root\{[^}]*--od-bg: #2e3440/);
  assert.doesNotMatch(css, /prefers-color-scheme/);
});

test('theme color scheme mode emits no media query blocks', () => {
  const css = buildThemeCss({ ...options, colorSchemeMode: 'theme' }, 'viewer');
  assert.doesNotMatch(css, /prefers-color-scheme/);
  assert.match(css, /:root\{[^}]*--od-bg: #282c34/);
});

test('element toggles append neutralizers only when disabled', () => {
  // Defaults: every element keeps its styling, so no neutralizer rules.
  const on = buildThemeCss(options, 'viewer');
  assert.doesNotMatch(on, /#rendered-md blockquote\{border: 0 !important/);

  const off = buildThemeCss({
    ...options,
    styleBlockquotes: false,
    styleTables: false,
    styleImages: false,
    styleHeadings: false,
    styleLinks: false,
    styleCodeBlocks: false,
  }, 'viewer');
  assert.match(off, /#rendered-md blockquote\{border: 0 !important;background-color: transparent !important\}/);
  assert.match(off, /#rendered-md table,#rendered-md th,#rendered-md td\{border: 0 !important\}/);
  assert.match(off, /#rendered-md tr:nth-child\(even\),#rendered-md tr:nth-child\(odd\)\{background-color: transparent !important\}/);
  assert.match(off, /#rendered-md img\{box-shadow: none !important;border-radius: 0 !important;max-height: none !important\}/);
  assert.match(off, /#rendered-md :is\(h1,h2,h3,h4,h5,h6\)\{color: var\(--od-fg\) !important\}/);
  assert.match(off, /#rendered-md a,#rendered-md a:hover,#rendered-md a\[href\^=":\/"\],#rendered-md a\[href\^=":\/"\]:hover\{color: var\(--od-fg\) !important;text-decoration: none !important\}/);
  assert.match(off, /#rendered-md pre:not\(\.mermaid\):not\(\.joplin-source\),#rendered-md code\{background-color: transparent !important;border: 0 !important\}/);
});

test('element toggles are scoped to the tinymce target as well', () => {
  const css = buildThemeCss({ ...options, styleTables: false }, 'tinymce');
  assert.match(css, /body#tinymce table,body#tinymce th,body#tinymce td\{border: 0 !important\}/);
});

test('user custom CSS wins over element neutralizers', () => {
  const css = buildThemeCss({
    ...options,
    styleBlockquotes: false,
    customCss: '#rendered-md blockquote { border-left: 3px solid red !important; }',
  }, 'viewer');
  const idxNeutral = css.indexOf('#rendered-md blockquote{border: 0 !important');
  const idxCustom = css.indexOf('User custom CSS');
  assert.ok(idxNeutral > -1 && idxCustom > -1);
  assert.ok(idxCustom > idxNeutral, 'custom CSS must come after neutralizers');
});

test('live preview embeds the theme stylesheet and a sample document', () => {
  const html = buildPreviewHtml(options);
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<div id="rendered-md">/);
  // The generated viewer stylesheet is embedded verbatim.
  assert.match(html, /--od-bg: #282c34/);
  assert.match(html, /Theme Studio Preview/);
  assert.match(html, /<table>/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<pre><code>/);
  // Header reflects the active configuration.
  assert.match(html, /Atom One Dark · LTR · Theme/);
});

test('live preview header reflects system scheme and direction', () => {
  const rtl = buildPreviewHtml({ ...options, direction: 'rtl', colorSchemeMode: 'system' });
  assert.match(rtl, /Atom One Dark · RTL · System/);
  const auto = buildPreviewHtml({ ...options, direction: 'auto' });
  assert.match(auto, /Atom One Dark · Auto BiDi · Theme/);
});

test('viewer cache distinguishes settings containing delimiter characters', () => {
  const content = require('../src/markdownTheme.ts').default({});
  const rules = {};
  const settings = { fontFamily: 'a|b', codeFontPreset: 'custom', codeFont: 'c', fontPreset: 'custom' };
  content.plugin({ core: { ruler: { push: (name, fn) => { rules[name] = fn; } } } }, { settingValue: key => settings[key] });
  function render() { const state = { tokens: [], Token: class {} }; rules.theme_studio_injector(state); return state.tokens[0].content; }
  const first = render();
  settings.fontFamily = 'a'; settings.codeFontPreset = 'b|custom';
  assert.notEqual(render(), first);
});

test('style payload version corresponds to the settings used to build it', async () => {
  let registration; const handlers = {}; let theme = 'atom-one-dark'; let changeDuringRead = false;
  global.joplin = {
    plugins: { register: x => { registration = x; }, dataDir: async () => '/tmp' },
    versionInfo: async () => ({ platform: 'mobile' }),
    settings: { globalValues: async () => ['en'], registerSection: async () => {}, registerSettings: async () => {}, onChange: async () => {}, values: async () => { const snapshot = { theme }; if (changeDuringRead) { theme = 'atom-one-light'; changeDuringRead = false; } return snapshot; } },
    commands: { register: async () => {} },
    contentScripts: { register: async () => {}, onMessage: async (id, fn) => { handlers[id] = fn; } },
  };
  require('../src/index.ts'); await registration.onStart();
  changeDuringRead = true;
  const result = await handlers.themeStudioCodeMirror({ type: 'getAllStyles' });
  const next = await handlers.themeStudioCodeMirror({ type: 'getStyleVersion' });
  assert.notEqual(result.version, next.version);
  assert.ok(result.viewerCss.includes(themes['atom-one-dark'].variables['--od-bg']));
  delete global.joplin;
});

test('production bundles expose Joplin content script entry points', async () => {
  const markdown = require('../dist/markdownTheme.js');
  const editor = require('../dist/codeMirrorTheme.js');
  assert.equal(typeof markdown.default, 'function');
  assert.equal(typeof editor.default, 'function');
  const rules = {};
  markdown.default({}).plugin({ core: { ruler: { push: (name, fn) => { rules[name] = fn; } } } }, { settingValue: () => undefined });
  const state = { tokens: [], Token: class {} };
  rules.theme_studio_injector(state);
  assert.match(state.tokens[0].content, /joplin-theme-studio-styles/);
  assert.equal(typeof editor.default({ postMessage: async () => null }).plugin, 'function');
});

test('production main bundle registers with the Joplin API', async () => {
  let registration;
  global.joplin = { plugins: { register: value => { registration = value; } } };
  try {
    require('../dist/index.js');
    assert.equal(typeof registration.onStart, 'function');
  } finally {
    delete global.joplin;
  }
});

test('popular themes are present with complete palettes', () => {
  const expected = ['solarized-dark', 'solarized-light', 'github-dark', 'github-light', 'tomorrow-night', 'tomorrow', 'ayu-dark', 'ayu-light', 'monokai', 'synthwave-84'];
  for (const key of expected) {
    assert.ok(themes[key], `theme ${key} is registered`);
    assert.equal(typeof themes[key].name, 'string');
    assert.equal(typeof themes[key].isDark, 'boolean');
    assert.equal(typeof themes[key].variables['--od-bg'], 'string');
    assert.equal(typeof themes[key].variables['--od-fg'], 'string');
    assert.equal(typeof themes[key].variables['--od-comment'], 'string');
    assert.equal(typeof themes[key].variables['--od-selection'], 'string');
    assert.equal(typeof themes[key].variables['--od-scrollbar-thumb'], 'string');
  }
});

test('every theme has a scheme pairing entry', () => {
  const { schemePairs } = require('../src/themes.ts');
  for (const key of Object.keys(themes)) {
    const pair = schemePairs[key];
    assert.ok(pair, `theme ${key} has a scheme pair`);
    assert.ok(themes[pair.dark], `paired dark theme ${pair.dark} exists`);
    assert.ok(themes[pair.light], `paired light theme ${pair.light} exists`);
  }
  // Self-paired themes must reference themselves; paired ones must cross-reference.
  for (const [key, pair] of Object.entries(schemePairs)) {
    if (themes[key].isDark) assert.equal(pair.dark, key);
    else assert.equal(pair.light, key);
    if (themes[pair.dark] && themes[pair.light]) {
      assert.equal(schemePairs[pair.dark].light, pair.light);
      assert.equal(schemePairs[pair.light].dark, pair.dark);
    }
  }
});

test('all settings live on one page organized into categories', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'index.ts'), 'utf8');
  // Exactly one section is registered: the single plugin settings page.
  const registerSections = [...source.matchAll(/registerSection\('([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(registerSections, ['themeStudioSection']);
  assert.match(source, /registerSection\('themeStudioSection', \{[\s\S]*description: sectionOverview/);
  // Every setting belongs to the single section.
  const sectionMatches = [...source.matchAll(/section: '(themeStudio[A-Za-z]*Section)'/g)].map((m) => m[1]);
  assert.equal(sectionMatches.length, 25);
  for (const section of sectionMatches) {
    assert.equal(section, 'themeStudioSection', `setting ${section} lives on the single Theme Studio page`);
  }
  // Every setting label is prefixed with its category title (branch hierarchy).
  const labelMatches = [...source.matchAll(/label: settingLabel\('([^']+)', '([^']+)'\)/g)].map((m) => [m[1], m[2]]);
  assert.equal(labelMatches.length, 25);
  const knownCategories = ['appearance', 'typography', 'elements', 'export', 'advanced'];
  for (const [category, label] of labelMatches) {
    assert.ok(knownCategories.includes(category), `label category ${category} is declared`);
    assert.ok(label.length > 0, 'setting label is non-empty');
  }
  // The five category titles are declared in the category structure.
  for (const title of ['Theme & Appearance', 'Typography', 'Code & Markdown Elements', 'Export', 'Advanced']) {
    assert.match(source, new RegExp(`title: '${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `category ${title} is declared`);
  }
});
