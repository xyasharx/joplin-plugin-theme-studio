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
  const headingSizePreset = readSetting(pluginOptions, 'headingSizePreset', 'balanced');
  const customHeadingSizes = readSetting(pluginOptions, 'customHeadingSizes', '1.75em, 1.42em, 1.25em, 1.12em, 1.05em, 1.0em');

  // Fast cache key comparison
  const cacheKey = `${themeKey}|${direction}|${fontPreset}|${fontSize}|${lineHeight}|${fontFamily}|${codeFontPreset}|${codeFont}|${contentMaxWidth}|${pdfExportStyle}|${pdfPageSize}|${pdfPageMargin}|${customPdfMargin}|${headingSizePreset}|${customHeadingSizes}`;

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
    });
  }

  return cachedViewerCss;
}

module.exports = {
  default: function (_context: any) {
    return {
      plugin: function (markdownIt: any, pluginOptions: any) {
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
