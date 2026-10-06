import { buildThemeCss } from './styles';

module.exports = {
  default: function (_context: any) {
    return {
      plugin: function (markdownIt: any, pluginOptions: any) {
        markdownIt.core.ruler.push('theme_studio_injector', (state: any) => {
          const themeKey = pluginOptions.settingValue('theme') || 'atom-one-dark';
          const direction = pluginOptions.settingValue('direction') || 'rtl';
          const fontPreset = pluginOptions.settingValue('fontPreset') || 'vazirmatn';
          const fontFamily = pluginOptions.settingValue('fontFamily') || '';
          const codeFontPreset = pluginOptions.settingValue('codeFontPreset') || 'fira-code';
          const codeFont = pluginOptions.settingValue('codeFont') || '';
          const fontSize = pluginOptions.settingValue('fontSize') || '16px';
          const lineHeight = pluginOptions.settingValue('lineHeight') || '1.8';
          const contentMaxWidth = pluginOptions.settingValue('contentMaxWidth') || 'full';

          const css = buildThemeCss({
            themeKey,
            direction,
            fontPreset,
            fontFamily,
            codeFontPreset,
            codeFont,
            fontSize,
            lineHeight,
            contentMaxWidth,
          });

          const token = new state.Token('html_block', '', 0);
          token.content = `<style id="joplin-theme-studio-styles">\n${css}\n</style>`;
          state.tokens.unshift(token);
        });
      },
    };
  },
};
