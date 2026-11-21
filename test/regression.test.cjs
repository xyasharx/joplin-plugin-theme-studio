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
