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
        description: 'Choose your desired color scheme.',
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
          'ltr': 'Left-to-Right (English / Latin / CJK)',
        },
      },
      'fontPreset': {
        value: 'vazirmatn',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'International Font Preset',
        description: 'Web fonts loaded on the fly (ideal for Mobile without local font installs).',
        options: {
          'vazirmatn': 'Vazirmatn (Persian, Arabic, Kurdish, Urdu)',
          'noto-arabic': 'Noto Sans Arabic (Modern Arabic)',
          'inter': 'Inter (English, Latin, European, Cyrillic)',
          'roboto': 'Roboto (Modern Clean Sans)',
          'noto-cjk-sc': 'Noto Sans SC (Simplified Chinese)',
          'noto-cjk-jp': 'Noto Sans JP (Japanese)',
          'heebo': 'Heebo (Hebrew & Latin)',
          'noto-devanagari': 'Noto Sans Devanagari (Hindi, Sanskrit)',
          'lora': 'Lora (Editorial Serif for Books & Articles)',
          'system': 'System Default (OS Native)',
          'custom': 'Custom Font Stack (use field below)',
        },
      },
      'fontFamily': {
        value: "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Custom Font Stack',
        description: 'Active only when "Custom Font Stack" is selected above.',
      },
      'codeFontPreset': {
        value: 'fira-code',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'Code Font Preset',
        description: 'Monospace font for inline code and code blocks.',
        options: {
          'fira-code': 'Fira Code (Modern Tech Monospace)',
          'jetbrains-mono': 'JetBrains Mono (Developer Favorite)',
          'system-mono': 'System Monospace (Cascadia/Consolas/Courier)',
          'custom': 'Custom Code Font (use field below)',
        },
      },
      'codeFont': {
        value: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Custom Code Font Stack',
        description: 'Active only when "Custom Code Font" is selected above.',
      },
      'fontSize': {
        value: '16px',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Font Size',
        description: 'Base font size (e.g., 14px, 16px, 18px, 20px). Works across Desktop & Mobile.',
      },
      'lineHeight': {
        value: '1.8',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Line Height',
        description: 'Reading line spacing (e.g., 1.6, 1.75, 1.9).',
      },
      'contentMaxWidth': {
        value: 'full',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'Reading Width (Focus Mode)',
        description: 'Constrain line length on wide desktop monitors for comfortable reading.',
        options: {
          'full': 'Full Width (100%)',
          'comfortable': 'Comfortable Reading (920px Centered)',
          'compact': 'Compact Focus (760px Centered)',
        },
      },
    });

    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      'themeStudioMarkdownIt',
      './markdownTheme.js'
    );
  },
});
