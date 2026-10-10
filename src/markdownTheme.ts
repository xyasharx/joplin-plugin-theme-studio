import { buildThemeCss, StyleOptions } from './styles';

let cachedViewerCss = '';
let lastViewerCacheKey = '';

function getMemoizedViewerCss(pluginOptions: any): string {
  const themeKey = pluginOptions.settingValue('theme') || 'atom-one-dark';
  const direction = pluginOptions.settingValue('direction') || 'ltr';
  const fontPreset = pluginOptions.settingValue('fontPreset') || 'inter';
  const fontFamily = pluginOptions.settingValue('fontFamily') || '';
  const codeFontPreset = pluginOptions.settingValue('codeFontPreset') || 'fira-code';
  const codeFont = pluginOptions.settingValue('codeFont') || '';
  const fontSize = pluginOptions.settingValue('fontSize') || '16px';
  const lineHeight = pluginOptions.settingValue('lineHeight') || '1.75';
  const contentMaxWidth = pluginOptions.settingValue('contentMaxWidth') || 'full';
  const pdfExportStyle = pluginOptions.settingValue('pdfExportStyle') || 'exact';

  // Fast cache key comparison
  const cacheKey = `${themeKey}|${direction}|${fontPreset}|${fontSize}|${lineHeight}|${fontFamily}|${codeFontPreset}|${codeFont}|${contentMaxWidth}|${pdfExportStyle}`;

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
