import { buildThemeCss } from './styles';

module.exports = {
  default: function (_context: any) {
    return {
      plugin: function (markdownIt: any, pluginOptions: any) {
        markdownIt.core.ruler.push('theme_studio_injector', (state: any) => {
          const themeKey = pluginOptions.settingValue('theme') || 'atom-one-dark';
          const direction = pluginOptions.settingValue('direction') || 'rtl';
          const fontFamily = pluginOptions.settingValue('fontFamily') || "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          const codeFont = pluginOptions.settingValue('codeFont') || "'Cascadia Code', 'Fira Code', 'Consolas', monospace";
          const fontSize = pluginOptions.settingValue('fontSize') || '16px';
          const lineHeight = pluginOptions.settingValue('lineHeight') || '1.8';

          const css = buildThemeCss({
            themeKey,
            direction,
            fontFamily,
            codeFont,
            fontSize,
            lineHeight,
          });

          const token = new state.Token('html_block', '', 0);
          token.content = `<style id="joplin-theme-studio-styles">\n${css}\n</style>`;
          state.tokens.unshift(token);
        });
      },
    };
  },
};
