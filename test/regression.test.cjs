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

test('settings are organized into native grouped sections', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'index.ts'), 'utf8');
  // One native section is registered per category via a single loop over the
  // category declaration, in category order.
  const sectionLoop = source.match(/for \(const category of THEME_STUDIO_CATEGORIES\) \{[\s\S]*?registerSection\(category\.section, \{/);
  assert.ok(sectionLoop, 'a loop registers one section per category');
  const categorySections = [...source.matchAll(/section: '(themeStudio[A-Za-z]*Section)'/g)].map((m) => m[1]);
  const uniqueSections = [...new Set(categorySections)];
  assert.deepEqual(uniqueSections, [
    'themeStudioAppearanceSection',
    'themeStudioTypographySection',
    'themeStudioElementsSection',
    'themeStudioExportSection',
    'themeStudioAdvancedSection',
  ]);
  // Each section carries a label, icon and description.
  const sectionRegistration = source.slice(source.indexOf('for (const category of THEME_STUDIO_CATEGORIES)'));
  assert.match(sectionRegistration, /label: category\.title/, 'sections use the category label');
  assert.match(sectionRegistration, /iconName: category\.iconName/, 'sections use the category icon');
  assert.match(sectionRegistration, /description: category\.summary/, 'sections use the category summary');
  // Every setting belongs to exactly one of the five category sections.
  // (The theme selector is registered twice — built-in options first, then the
  // full palette list — so there are 39 setting-level section lines.)
  const sectionMatches = [...source.matchAll(/^\s+section: '(themeStudio[A-Za-z]*Section)'/gm)].map((m) => m[1]);
  assert.equal(sectionMatches.length, 39);
  const knownSections = new Set(uniqueSections);
  for (const section of sectionMatches) {
    assert.ok(knownSections.has(section), `setting section ${section} is a registered category section`);
  }
  // Labels are plain (no "Category — Item" prefix): the section header carries
  // the category context, and no settingLabel helper remains.
  assert.ok(!source.includes('settingLabel'), 'no category-prefix label helper remains');
  const labelMatches = [...source.matchAll(/label: '(?!Theme Studio:)([^']+)'/g)].map((m) => m[1]);
  assert.equal(labelMatches.length, 39);
  for (const label of labelMatches) {
    assert.ok(label.length > 0, 'setting label is non-empty');
  }
  // The five category titles are declared in the category structure.
  for (const title of ['Theme & Appearance', 'Typography', 'Code & Markdown Elements', 'Export', 'Advanced']) {
    assert.match(source, new RegExp(`title: '${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `category ${title} is declared`);
  }
});

test('runtime registration creates five grouped sections with the right settings', async () => {
  // The plugin entry module and its `api` shim are cached from earlier
  // tests; drop both so this test gets a fresh registration with its own
  // mock API.
  delete require.cache[require.resolve('../src/index.ts')];
  delete require.cache[require.resolve('../api/index.ts')];

  const registeredSections = [];
  const settingsBySection = {};
  let registration;
  global.joplin = {
    plugins: { register: (x) => { registration = x; }, dataDir: async () => '/tmp' },
    versionInfo: async () => ({ platform: 'desktop' }),
    settings: {
      globalValues: async () => ['en'],
      registerSection: async (name, section) => { registeredSections.push({ name, section }); },
      registerSettings: async (settings) => {
        for (const [key, item] of Object.entries(settings)) {
          const section = String(item.section).replace(/^.*themeStudio/, 'themeStudio');
          (settingsBySection[section] = settingsBySection[section] || []).push(key);
        }
      },
      onChange: async () => {},
      values: async (keys) => Object.fromEntries(keys.map((k) => [k, ''])),
      value: async () => '',
      setValue: async () => {},
    },
    commands: { register: async () => {} },
    contentScripts: { register: async () => {}, onMessage: async () => {} },
    views: { panels: { create: async () => 'panel', show: async () => {}, setHtml: async () => {} } },
    workspace: { onNoteSelectionChange: async () => {}, onNoteChange: async () => {}, selectedNote: async () => null },
    data: { get: async () => [] },
    clipboard: { writeText: async () => {}, readText: async () => '' },
  };
  try {
    require('../src/index.ts');
    await registration.onStart();

    assert.equal(registeredSections.length, 5, 'five sections are registered');
    assert.deepEqual(
      registeredSections.map((s) => s.section.label),
      ['Theme & Appearance', 'Typography', 'Code & Markdown Elements', 'Export', 'Advanced'],
      'sections are registered in category order',
    );
    for (const section of registeredSections) {
      assert.ok(section.section.iconName.startsWith('fas fa-'), `section ${section.name} has an icon`);
      assert.ok(section.section.description.length > 0, `section ${section.name} has a description`);
    }
    assert.deepEqual(
      Object.keys(settingsBySection).sort(),
      [
        'themeStudioAdvancedSection',
        'themeStudioAppearanceSection',
        'themeStudioElementsSection',
        'themeStudioExportSection',
        'themeStudioTypographySection',
      ],
      'every setting lands in one of the five sections',
    );
    // The theme selector leads the Appearance section (registered first, then
    // re-registered with the full palette option list).
    assert.equal(settingsBySection['themeStudioAppearanceSection'][0], 'theme', 'Color Theme is the first Appearance setting');
    assert.equal(settingsBySection['themeStudioTypographySection'].length, 12);
    assert.equal(settingsBySection['themeStudioElementsSection'].length, 8);
    assert.equal(settingsBySection['themeStudioExportSection'].length, 4);
    assert.equal(settingsBySection['themeStudioAdvancedSection'].length, 6);
    const total = Object.values(settingsBySection).reduce((sum, keys) => sum + keys.length, 0);
    assert.equal(total, 39, 'all setting registrations are accounted for');
  } finally {
    delete global.joplin;
  }
});

// ------------------------------------------------------------------
// P2: Additional palettes + palette import/export + custom palette builder
// ------------------------------------------------------------------

const { generatePalette, validatePalette, parsePaletteJson, exportPalettes, sanitizePaletteName, PALETTE_REQUIRED_VARS } = require('../src/palette.ts');

test('extra community palettes are present with complete variable sets', () => {
  const expected = ['one-dark-pro', 'rose-pine', 'rose-pine-dawn', 'gruvbox-material-dark', 'gruvbox-material-light', 'nord-night'];
  for (const key of expected) {
    assert.ok(themes[key], `theme ${key} is registered`);
    for (const varName of PALETTE_REQUIRED_VARS) {
      assert.ok(themes[key].variables[varName], `theme ${key} defines ${varName}`);
    }
  }
});

test('palette pair declarations stay consistent', () => {
  for (const [key, palette] of Object.entries(themes)) {
    if (palette.pairWith) {
      assert.ok(themes[palette.pairWith], `theme ${key} declares a valid pairWith (${palette.pairWith})`);
    }
  }
});

test('generatePalette produces a complete, valid palette from base colors', () => {
  const palette = generatePalette('My Palette', { bg: '#123456', fg: '#abcdef', accent: '#ff8800' });
  assert.equal(palette.name, 'My Palette');
  const result = validatePalette(palette);
  assert.deepEqual(result.errors, [], `generated palette is valid: ${result.errors.join('; ')}`);
  assert.equal(palette.variables['--od-bg'], '#123456');
  assert.equal(palette.variables['--od-fg'], '#abcdef');
  assert.ok(palette.variables['--od-link']);
  assert.ok(palette.variables['--od-bg-alt']);
});

test('sanitizePaletteName produces a stable, URL-safe key', () => {
  assert.equal(sanitizePaletteName('My Palette'), 'my-palette');
  assert.equal(sanitizePaletteName('A<B>:C'), 'a-b-c');
  assert.equal(sanitizePaletteName('   '), '');
});

test('validatePalette detects missing variables and bad hex values', () => {
  const base = generatePalette('Bad', { bg: '#123456', fg: '#abcdef', accent: '#ff8800' });
  const missing = validatePalette({ name: 'x', variables: {} });
  assert.ok(missing.errors.length > 0);

  const badHex = { name: 'x', variables: { ...base.variables, '--od-bg': 'nope' } };
  const hexErrors = validatePalette(badHex);
  assert.ok(hexErrors.errors.some((e) => e.includes('missing or invalid "--od-bg"')));
});

test('parsePaletteJson accepts formats, rejects garbage', () => {
  const palette = generatePalette('Importable', { bg: '#123456', fg: '#abcdef', accent: '#ff8800' });

  const asArray = parsePaletteJson(JSON.stringify([palette]));
  assert.equal(asArray.palettes.length, 1);
  assert.equal(asArray.palettes[0].name, 'Importable');
  assert.deepEqual(asArray.errors, []);

  const asObject = parsePaletteJson(JSON.stringify({ palettes: [palette] }));
  assert.equal(asObject.palettes.length, 1);

  const notJson = parsePaletteJson('not json at all');
  assert.equal(notJson.palettes.length, 0);
  assert.ok(notJson.errors.length > 0);

  const badPalette = parsePaletteJson(JSON.stringify([{ name: 'x', variables: {} }]));
  assert.equal(badPalette.palettes.length, 0);
  assert.ok(badPalette.errors.length > 0);
});

test('exportPalettes round-trips through import', () => {
  const built = [themes['atom-one-dark'], generatePalette('Round Trip', { bg: '#123456', fg: '#abcdef', accent: '#ff8800' })];
  const json = exportPalettes(built);
  const parsed = parsePaletteJson(json);
  assert.equal(parsed.palettes.length, 2);
  assert.deepEqual(parsed.errors, []);
  assert.ok(parsed.palettes.some((p) => p.name === themes['atom-one-dark'].name));
  assert.ok(parsed.palettes.some((p) => p.name === 'Round Trip'));
});

// ------------------------------------------------------------------
// P2: Per-note / per-notebook / per-tag theme overrides
// ------------------------------------------------------------------

const { parseOverrideLines, resolveThemeOverride } = require('../src/overrides.ts');

test('parseOverrideLines parses notebook and tag lines and skips comments', () => {
  const notebooks = parseOverrideLines('id:notebook1=atom-one-dark\n# a comment\nid:notebook2=rose-pine\n', 'notebook');
  assert.deepEqual(notebooks.overrides, [
    { match: 'id', value: 'notebook1', themeKey: 'atom-one-dark', line: 1 },
    { match: 'id', value: 'notebook2', themeKey: 'rose-pine', line: 3 },
  ]);
  assert.deepEqual(notebooks.errors, []);

  const tags = parseOverrideLines('title:work=one-dark-pro\ntitle:personal=gruvbox-material-dark', 'tag');
  assert.deepEqual(tags.overrides, [
    { match: 'title', value: 'work', themeKey: 'one-dark-pro', line: 1 },
    { match: 'title', value: 'personal', themeKey: 'gruvbox-material-dark', line: 2 },
  ]);
  assert.deepEqual(tags.errors, []);
});

test('parseOverrideLines reports malformed lines', () => {
  const bad = parseOverrideLines('id:notebook1=theme\nnot-a-line\n=theme\n', 'notebook');
  assert.equal(bad.overrides.length, 1);
  assert.ok(bad.errors.length >= 2);
});

test('resolveThemeOverride prefers notebooks, then tags, then default', () => {
  const context = {
    notebooks: [{ id: 'nb1', title: 'Notebook One' }],
    tags: [{ id: 'tag1', title: 'Tagged' }],
  };

  const notebookMatch = resolveThemeOverride(context, {
    notebook: [{ match: 'id', value: 'nb1', themeKey: 'rose-pine', line: 1 }],
    tag: [],
  }, 'atom-one-dark');
  assert.equal(notebookMatch.themeKey, 'rose-pine');
  assert.equal(notebookMatch.source, 'notebook');

  const tagMatch = resolveThemeOverride(context, {
    notebook: [],
    tag: [{ match: 'id', value: 'tag1', themeKey: 'one-dark-pro', line: 1 }],
  }, 'atom-one-dark');
  assert.equal(tagMatch.themeKey, 'one-dark-pro');
  assert.equal(tagMatch.source, 'tag');

  const none = resolveThemeOverride(context, { notebook: [], tag: [] }, 'atom-one-dark');
  assert.equal(none.themeKey, 'atom-one-dark');
  assert.equal(none.source, 'default');

  // Tag matching also resolves by title.
  const tagTitle = resolveThemeOverride(context, {
    notebook: [],
    tag: [{ match: 'title', value: 'Tagged', themeKey: 'nord-night', line: 1 }],
  }, 'atom-one-dark');
  assert.equal(tagTitle.themeKey, 'nord-night');
});

// ------------------------------------------------------------------
// P2: Typography micro-tuning
// ------------------------------------------------------------------

const typographyBase = {
  themeKey: 'atom-one-dark',
  direction: 'ltr',
  fontPreset: 'inter',
  fontFamily: '',
  codeFontPreset: 'fira-code',
  codeFont: '',
  fontSize: '16px',
  lineHeight: '1.75',
  contentMaxWidth: 'full',
  pdfExportStyle: 'exact',
  pdfPageSize: 'a4',
  pdfPageMargin: 'standard',
  customPdfMargin: '15mm 18mm',
  customCss: '',
  headingSizePreset: 'balanced',
  customHeadingSizes: '1.75em, 1.42em, 1.25em, 1.12em, 1.05em, 1.0em',
};

test('typography toggles emit the expected CSS rules', () => {
  const letter = buildThemeCss({ ...typographyBase, letterSpacing: '0.6px' });
  assert.match(letter, /letter-spacing: 0\.6px !important/);

  const justified = buildThemeCss({ ...typographyBase, textAlign: 'justify' });
  assert.match(justified, /text-align: justify/);

  const hyphenated = buildThemeCss({ ...typographyBase, hyphenation: true });
  assert.match(hyphenated, /-webkit-hyphens: auto/);
  assert.match(hyphenated, /hyphens: auto/);

  const ligatures = buildThemeCss({ ...typographyBase, fontLigatures: true });
  assert.match(ligatures, /font-variant-ligatures: common-ligatures/);
  assert.match(ligatures, /font-feature-settings: 'liga' 1,\s*'calt' 1/);
});

test('typography CSS is not emitted when toggles are off (default output unchanged)', () => {
  const plain = buildThemeCss({ ...typographyBase });
  assert.ok(!plain.includes('letter-spacing: '));
  assert.ok(!plain.includes('text-align: justify'));
  assert.ok(!plain.includes('hyphens: auto'));
  assert.ok(!plain.includes('font-variant-ligatures'));
});

test('runtime palettes are honoured by the viewer CSS', () => {
  const custom = generatePalette('Runtime', { bg: '#123456', fg: '#abcdef', accent: '#ff8800' });
  const css = buildThemeCss({ ...typographyBase, themeKey: 'custom' }, 'viewer', { ...themes, custom });
  assert.match(css, /--od-bg: #123456/);
  assert.match(css, /--od-fg: #abcdef/);
});

test('viewer CSS applies the effective per-note theme', () => {
  const custom = generatePalette('Note Palette', { bg: '#abcdef', fg: '#123456', accent: '#ff8800' });
  const palettes = { ...themes, custom };
  const css = buildThemeCss({ ...typographyBase, themeKey: 'atom-one-dark', noteThemeEffective: 'custom' }, 'viewer', palettes);
  assert.match(css, /--od-bg: #abcdef/);
  // Effective theme flows through pair resolution too.
  const schemeCss = buildThemeCss({ ...typographyBase, themeKey: 'atom-one-dark', noteThemeEffective: 'custom', colorSchemeMode: 'system' }, 'viewer', palettes);
  assert.match(schemeCss, /--od-bg-alt: #a2c4e6/);
});

// ------------------------------------------------------------------
// P3: Mobile density presets + command-palette theme picker
// ------------------------------------------------------------------

test('mobile density presets scale the mobile font size', () => {
  const compact = buildThemeCss({ ...typographyBase, mobileDensity: 'compact' }, 'viewer');
  assert.match(compact, /@media screen and \(max-width: 768px\)\{[^}]*font-size: calc\(16px \* 0\.85\)/);

  const def = buildThemeCss({ ...typographyBase, mobileDensity: 'default' }, 'viewer');
  assert.match(def, /font-size: calc\(16px \* 1\)/);

  const large = buildThemeCss({ ...typographyBase, mobileDensity: 'large' }, 'viewer');
  assert.match(large, /font-size: calc\(16px \* 1\.15\)/);
});

test('mobile density default is a no-op scale of 1', () => {
  const noDensity = buildThemeCss({ ...typographyBase }, 'viewer');
  const withDefault = buildThemeCss({ ...typographyBase, mobileDensity: 'default' }, 'viewer');
  assert.match(noDensity, /font-size: calc\(16px \* 1\)/);
  assert.match(withDefault, /font-size: calc\(16px \* 1\)/);
});

test('mobile density follows the configured font size', () => {
  const css = buildThemeCss({ ...typographyBase, fontSize: '18px', mobileDensity: 'large' }, 'viewer');
  assert.match(css, /font-size: calc\(18px \* 1\.15\)/);
});

test('per-theme commands are registered for every runtime palette', async () => {
  const registered = [];
  let registration;
  const handlers = {};
  // The plugin entry module and its `api` shim are cached from earlier
  // tests; drop both so this test gets a fresh registration with its own
  // mock API.
  delete require.cache[require.resolve('../src/index.ts')];
  delete require.cache[require.resolve('../api/index.ts')];
  global.joplin = {
    plugins: { register: x => { registration = x; }, dataDir: async () => '/tmp' },
    versionInfo: async () => ({ platform: 'desktop' }),
    settings: {
      globalValues: async () => ['en'],
      registerSection: async () => {},
      registerSettings: async () => {},
      onChange: async () => {},
      values: async () => ({
        customPalettes: '',
        customPaletteName: 'Custom',
        customPaletteBg: '#123456',
        customPaletteFg: '#abcdef',
        customPaletteAccent: '#ff8800',
        theme: 'atom-one-dark',
      }),
      setValue: async () => {},
    },
    commands: { register: async (c) => { registered.push(c); } },
    contentScripts: { register: async () => {}, onMessage: async (id, fn) => { handlers[id] = fn; } },
  };
  require('../src/index.ts');
  await registration.onStart();
  delete global.joplin;

  const themeCommands = registered.filter((c) => c.name.startsWith('themeStudio.useTheme.'));
  // One command per built-in theme plus the generated custom palette.
  assert.equal(themeCommands.length, Object.keys(themes).length + 1);
  for (const cmd of themeCommands) {
    assert.match(cmd.name, /^themeStudio\.useTheme\./);
    assert.match(cmd.label, /^Theme Studio: Use /);
    assert.equal(typeof cmd.execute, 'function');
  }
  // The custom palette command is present alongside the built-ins.
  assert.ok(themeCommands.some((c) => c.name === 'themeStudio.useTheme.custom'));
});
