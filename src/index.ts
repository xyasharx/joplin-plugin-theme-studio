import joplin from 'api';
import { ContentScriptType, SettingItemType } from 'api/types';

joplin.plugins.register({
  onStart: async function () {
    // 1. Detect user's Joplin language to set smart, non-intrusive defaults
    let defaultDirection = 'ltr';
    let defaultFontPreset = 'inter';

    try {
      const userLocale: string = await joplin.settings.globalValue('locale');
      const rtlLanguages = ['fa', 'ar', 'he', 'ur', 'ug', 'ps', 'yi'];
      if (userLocale && rtlLanguages.some((lang) => userLocale.toLowerCase().startsWith(lang))) {
        defaultDirection = 'rtl';
        defaultFontPreset = 'vazirmatn';
      }
    } catch (_err) {
      defaultDirection = 'ltr';
      defaultFontPreset = 'inter';
    }

    // 2. Register Settings Section
    await joplin.settings.registerSection('themeStudioSection', {
      label: 'Theme Studio',
      iconName: 'fas fa-palette',
    });

    // 3. Register Settings with PDF Layout Fidelity
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
        value: defaultDirection,
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'Layout Direction',
        description: 'Primary text orientation. LTR is standard; Auto adjusts per paragraph.',
        options: {
          'ltr': 'Left-to-Right (LTR - English / Latin / CJK / Global)',
          'auto': 'Auto-Detect (Per-Paragraph BiDi)',
          'rtl': 'Right-to-Left (RTL - Persian / Arabic / Hebrew)',
        },
      },
      'fontPreset': {
        value: defaultFontPreset,
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'International Font Preset',
        description: 'Web fonts loaded on the fly (ideal for Mobile without local font installs).',
        options: {
          'inter': 'Inter (Global English, Latin, European, Cyrillic)',
          'roboto': 'Roboto (Modern Clean Sans)',
          'system': 'System Default (OS Native, Zero Network Overhead)',
          'vazirmatn': 'Vazirmatn (Persian, Arabic, Kurdish, Urdu)',
          'noto-arabic': 'Noto Sans Arabic (Modern Arabic)',
          'noto-cjk-sc': 'Noto Sans SC (Simplified Chinese)',
          'noto-cjk-jp': 'Noto Sans JP (Japanese)',
          'heebo': 'Heebo (Hebrew & Latin)',
          'noto-devanagari': 'Noto Sans Devanagari (Hindi, Sanskrit)',
          'lora': 'Lora (Editorial Serif for Books & Long Articles)',
          'custom': 'Custom Font Stack (use field below)',
        },
      },
      'fontFamily': {
        value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
        value: '1.75',
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
      'pdfExportStyle': {
        value: 'exact',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'PDF Export Appearance',
        description: 'Controls layout and background fidelity when exporting to PDF.',
        options: {
          'exact': 'Exact Match (100% Identical to Screen Layout & Theme)',
          'paper': 'Paper Friendly (White Page Background with Themed Accents)',
        },
      },
    });

    // 4. Register Markdown-it content script
    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      'themeStudioMarkdownIt',
      './markdownTheme.js'
    );
  },
});
