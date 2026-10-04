import joplin from 'api';
import { ContentScriptType, SettingItemType } from 'api/types';

joplin.plugins.register({
  onStart: async function () {
    await joplin.settings.registerSection('themeStudioSection', {
      label: 'Theme Studio',
      iconName: 'fas fa-palette',
    });

    await joplin.settings.registerSettings({
      'theme': {
        value: 'atom-one-dark',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'Color Theme',
        description: 'Choose your preferred color scheme.',
        options: {
          'atom-one-dark': 'Atom One Dark',
          'atom-one-light': 'Atom One Light',
          'tokyo-night': 'Tokyo Night',
          'tokyo-night-storm': 'Tokyo Night Storm',
          'everforest-dark': 'Everforest Dark',
          'everforest-light': 'Everforest Light',
          'catppuccin-mocha': 'Catppuccin Mocha',
          'catppuccin-latte': 'Catppuccin Latte',
          'nord': 'Nord',
          'dracula': 'Dracula',
          'gruvbox-dark': 'Gruvbox Dark',
          'gruvbox-light': 'Gruvbox Light',
        },
      },
      'direction': {
        value: 'rtl',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'Layout Direction',
        description: 'Choose primary orientation (RTL includes automatic [dir="ltr"] isolation).',
        options: {
          'rtl': 'Right-to-Left (Persian / Arabic / Hebrew)',
          'ltr': 'Left-to-Right (English / Latin)',
        },
      },
      'fontFamily': {
        value: "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Primary Font Stack',
        description: 'Main font for reading and note view.',
      },
      'codeFont': {
        value: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Monospace Code Font',
        description: 'Used for inline code and code blocks.',
      },
      'fontSize': {
        value: '16px',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Base Font Size',
        description: 'Standard font size (e.g., 15px, 16px, 17px).',
      },
      'lineHeight': {
        value: '1.8',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Line Height',
        description: 'Reading line height (e.g., 1.7, 1.8).',
      },
    });

    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      'themeStudioMarkdownIt',
      './markdownTheme.js'
    );
  },
});
