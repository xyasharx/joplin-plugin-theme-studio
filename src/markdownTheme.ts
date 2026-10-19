import { buildThemeCss, StyleOptions } from './styles';

let cachedViewerCss = '';
let lastViewerCacheKey = '';

function readSetting(pluginOptions: any, key: string, fallback: string): string {
  try {
    if (pluginOptions && typeof pluginOptions.settingValue === 'function') {
      const val = pluginOptions.settingValue(key);
      return val !== undefined && val !== null ? String(val) : fallback;
    }
  } catch (err) {
    console.debug(`[Theme Studio] Could not read setting "${key}":`, err);
  }
  return fallback;
}

function getMemoizedViewerCss(pluginOptions: any): string {
  const themeKey = readSetting(pluginOptions, 'theme', 'atom-one-dark');
  const direction = readSetting(pluginOptions, 'direction', 'ltr');
  const fontPreset = readSetting(pluginOptions, 'fontPreset', 'inter');
  const fontFamily = readSetting(pluginOptions, 'fontFamily', '');
  const codeFontPreset = readSetting(pluginOptions, 'codeFontPreset', 'fira-code');
  const codeFont = readSetting(pluginOptions, 'codeFont', '');
  const fontSize = readSetting(pluginOptions, 'fontSize', '16px');
  const lineHeight = readSetting(pluginOptions, 'lineHeight', '1.75');
  const contentMaxWidth = readSetting(pluginOptions, 'contentMaxWidth', 'full');
  const pdfExportStyle = readSetting(pluginOptions, 'pdfExportStyle', 'exact');
  const pdfPageSize = readSetting(pluginOptions, 'pdfPageSize', 'a4');
  const pdfPageMargin = readSetting(pluginOptions, 'pdfPageMargin', 'standard');
  const customPdfMargin = readSetting(pluginOptions, 'customPdfMargin', '15mm 18mm');
  const customCss = readSetting(pluginOptions, 'customCss', '');
  const headingSizePreset = readSetting(pluginOptions, 'headingSizePreset', 'balanced');
  const customHeadingSizes = readSetting(pluginOptions, 'customHeadingSizes', '1.75em, 1.42em, 1.25em, 1.12em, 1.05em, 1.0em');

  // Fast cache key comparison
  const cacheKey = `${themeKey}|${direction}|${fontPreset}|${fontSize}|${lineHeight}|${fontFamily}|${codeFontPreset}|${codeFont}|${contentMaxWidth}|${pdfExportStyle}|${pdfPageSize}|${pdfPageMargin}|${customPdfMargin}|${headingSizePreset}|${customHeadingSizes}|${customCss}`;

  if (cacheKey !== lastViewerCacheKey || !cachedViewerCss) {
    lastViewerCacheKey = cacheKey;
    cachedViewerCss = buildThemeCss({
      themeKey,
      direction,
      fontPreset,
      fontFamily,
      codeFontPreset,
      codeFont,
      fontSize,
      lineHeight,
      contentMaxWidth,
      pdfExportStyle,
      pdfPageSize,
      pdfPageMargin,
      customPdfMargin,
      headingSizePreset,
      customHeadingSizes,
      customCss,
    });
  }

  return cachedViewerCss;
}

const RTL_REGEX = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
// First character that is not whitespace, an ASCII digit, punctuation or a symbol.
const FIRST_SIGNIFICANT_CHAR = /[^\s0-9\p{P}\p{S}]/u;

function isRtlContent(str: string): boolean {
  if (!str) return false;
  // Stops at the first significant character instead of rewriting the whole
  // block: O(1) in the common case rather than O(length) per paragraph.
  const match = FIRST_SIGNIFICANT_CHAR.exec(str);
  return match ? RTL_REGEX.test(match[0]) : false;
}

module.exports = {
  default: function (_context: any) {
    return {
      plugin: function (markdownIt: any, pluginOptions: any) {
        // Explicitly stamp dir="rtl" or dir="ltr" based on first strong character
        markdownIt.core.ruler.push('theme_studio_bidi_tagger', (state: any) => {
          const direction = readSetting(pluginOptions, 'direction', 'ltr');
          if (direction !== 'auto') return;

          const tokens = state.tokens;
          const len = tokens.length;

          for (let i = 0; i < len; i++) {
            const token = tokens[i];

            // 1. Paragraphs & Headings
            if (token.type === 'paragraph_open' || token.type === 'heading_open') {
              const inlineToken = tokens[i + 1];
              if (inlineToken && inlineToken.type === 'inline' && inlineToken.content) {
                token.attrSet('dir', isRtlContent(inlineToken.content) ? 'rtl' : 'ltr');
              }
            }

            // 2. Lists: evaluate the first item to give the <ul> / <ol> container the matching direction
            if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
              let listDir = 'ltr';
              for (let j = i + 1; j < len; j++) {
                if (tokens[j].type === 'bullet_list_close' || tokens[j].type === 'ordered_list_close') break;
                if (tokens[j].type === 'inline' && tokens[j].content) {
                  listDir = isRtlContent(tokens[j].content) ? 'rtl' : 'ltr';
                  break;
                }
              }
              token.attrSet('dir', listDir);
            }

            // 3. Individual List Items
            if (token.type === 'list_item_open') {
              for (let j = i + 1; j < len; j++) {
                if (tokens[j].type === 'list_item_close') break;
                if (tokens[j].type === 'inline' && tokens[j].content) {
                  token.attrSet('dir', isRtlContent(tokens[j].content) ? 'rtl' : 'ltr');
                  break;
                }
              }
            }

            // 4. Blockquotes
            if (token.type === 'blockquote_open') {
              for (let j = i + 1; j < len; j++) {
                if (tokens[j].type === 'blockquote_close') break;
                if (tokens[j].type === 'inline' && tokens[j].content) {
                  token.attrSet('dir', isRtlContent(tokens[j].content) ? 'rtl' : 'ltr');
                  break;
                }
              }
            }
          }
        });

        markdownIt.core.ruler.push('theme_studio_injector', (state: any) => {
          // Instant O(1) retrieval from memoized cache
          const css = getMemoizedViewerCss(pluginOptions);

          const token = new state.Token('html_block', '', 0);
          token.content = `<style id="joplin-theme-studio-styles">\n${css}\n</style>`;
          state.tokens.unshift(token);
        });
      },
    };
  },
};
