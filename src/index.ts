import joplin from 'api';
import { ContentScriptType, SettingItemType } from 'api/types';
import { buildEditorCss, buildThemeCss, buildChromeCss, StyleOptions } from './styles';

joplin.plugins.register({
  onStart: async function () {
    let defaultDirection = 'ltr';
    let defaultFontPreset = 'inter';
    let lastWrittenChromeCss: string | null = null;

    try {
      let userLocale = '';
      if (typeof joplin.settings.globalValues === 'function') {
        const values = await joplin.settings.globalValues(['locale']);
        userLocale = values && values[0] ? String(values[0]) : '';
      } else if (typeof joplin.settings.globalValue === 'function') {
        userLocale = await joplin.settings.globalValue('locale');
      }

      const rtlLanguages = ['fa', 'ar', 'he', 'ur', 'ug', 'ps', 'yi'];
      if (userLocale && rtlLanguages.some((lang) => userLocale.toLowerCase().startsWith(lang))) {
        defaultDirection = 'rtl';
        defaultFontPreset = 'vazirmatn';
      }
    } catch (err) {
      console.warn('[Theme Studio] Could not detect user locale. Defaulting to LTR / Inter:', err);
      defaultDirection = 'ltr';
      defaultFontPreset = 'inter';
    }

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
      'enableEditorTheme': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioSection',
        public: true,
        label: 'Apply Theme to Markdown Editor',
        description: 'Styles the CodeMirror editor (background, colors, line numbers, headings) to match the viewer.',
      },
      'themeApplicationShell': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioSection',
        public: true,
        label: 'Theme Application Shell (Sidebar & Note List)',
        description: 'Applies the active palette to Joplin\'s desktop sidebar, note list, and header (Desktop only).',
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
      'headingSizePreset': {
        value: 'balanced',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'Heading Sizes Preset',
        description: 'Typographic scale applied to H1 through H6 headings.',
        options: {
          'balanced': 'Balanced / Standard (H1: 1.75em, H2: 1.42em, H3: 1.25em...)',
          'large': 'Large / Editorial (H1: 2.15em, H2: 1.7em, H3: 1.4em...)',
          'compact': 'Compact / Dense (H1: 1.5em, H2: 1.3em, H3: 1.18em...)',
          'custom': 'Custom Sizes (Configured below)',
        },
      },
      'customHeadingSizes': {
        value: '1.75em, 1.42em, 1.25em, 1.12em, 1.05em, 1.0em',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Custom Heading Sizes (H1 - H6)',
        description: 'Active only when "Custom Sizes" is selected. Comma-separated sizes from H1 to H6 (e.g., 28px, 24px, 20px, 18px, 16px, 14px or 2.2em, 1.7em, 1.4em, 1.2em, 1.1em, 1.0em).',
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
      'pdfPageSize': {
        value: 'a4',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'PDF Page Size',
        description: 'Standard paper dimensions for PDF export.',
        options: {
          'a4': 'A4 (210 × 297 mm - Global Standard)',
          'letter': 'US Letter (8.5 × 11 in - North America)',
          'a5': 'A5 (148 × 210 mm - Compact)',
          'a3': 'A3 (297 × 420 mm - Large Format)',
          'legal': 'US Legal (8.5 × 14 in)',
          'auto': 'Auto (Printer / OS Default)',
        },
      },
      'pdfPageMargin': {
        value: 'standard',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'PDF Page Margins',
        description: 'Page margin width when exporting to PDF.',
        options: {
          'standard': 'Standard Margins (15mm top/bottom, 18mm sides)',
          'comfortable': 'Comfortable / Wide Margins (20mm all sides)',
          'compact': 'Compact / Narrow Margins (8mm all sides)',
          'none': 'Zero Margins / Full Bleed (0mm - Edge to Edge)',
          'custom': 'Custom Margins (Configured below)',
        },
      },
      'customPdfMargin': {
        value: '15mm 18mm',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Custom PDF Page Margins',
        description: 'Active only when "Custom Margins" is selected above (e.g., "15mm 18mm", "1in", "10mm 15mm 10mm 15mm").',
      },
    });

    const settingKeys = [
      'theme',
      'direction',
      'enableEditorTheme',
      'themeApplicationShell',
      'fontPreset',
      'fontFamily',
      'codeFontPreset',
      'codeFont',
      'fontSize',
      'lineHeight',
      'headingSizePreset',
      'customHeadingSizes',
      'contentMaxWidth',
      'pdfExportStyle',
      'pdfPageSize',
      'pdfPageMargin',
      'customPdfMargin',
    ];

    async function getAllCurrentValues(): Promise<{ options: StyleOptions; editorEnabled: boolean; shellEnabled: boolean }> {
      let vals: Record<string, any> = {};

      if (typeof joplin.settings.values === 'function') {
        vals = await joplin.settings.values(settingKeys);
      } else {
        const results = await Promise.all(settingKeys.map((k) => joplin.settings.value(k)));
        settingKeys.forEach((k, idx) => {
          vals[k] = results[idx];
        });
      }

      const options: StyleOptions = {
        themeKey: vals['theme'] || 'atom-one-dark',
        direction: vals['direction'] || defaultDirection,
        fontPreset: vals['fontPreset'] || defaultFontPreset,
        fontFamily: vals['fontFamily'] || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        codeFontPreset: vals['codeFontPreset'] || 'fira-code',
        codeFont: vals['codeFont'] || "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: vals['fontSize'] || '16px',
        lineHeight: vals['lineHeight'] || '1.75',
        contentMaxWidth: vals['contentMaxWidth'] || 'full',
        pdfExportStyle: vals['pdfExportStyle'] || 'exact',
        headingSizePreset: vals['headingSizePreset'] || 'balanced',
        customHeadingSizes: vals['customHeadingSizes'] || '1.75em, 1.42em, 1.25em, 1.12em, 1.05em, 1.0em',
        pdfPageSize: vals['pdfPageSize'] || 'a4',
        pdfPageMargin: vals['pdfPageMargin'] || 'standard',
        customPdfMargin: vals['customPdfMargin'] || '15mm 18mm',
      };

      return {
        options,
        editorEnabled: vals['enableEditorTheme'] ?? true,
        shellEnabled: vals['themeApplicationShell'] ?? true,
      };
    }

    async function syncDesktopChromeFile(options: StyleOptions, enabled: boolean): Promise<void> {
      try {
        if (joplin.window && typeof (joplin.window as any).loadChromeCssFile === 'function') {
          const content = enabled ? buildChromeCss(options) : '';
          if (content === lastWrittenChromeCss) {
            return;
          }
          lastWrittenChromeCss = content;

          const fs = joplin.require('fs-extra');
          const dataDir: string = await joplin.plugins.dataDir();
          const chromeCssPath = `${dataDir}/theme-studio-chrome.css`;
          await fs.writeFile(chromeCssPath, content, 'utf8');
          await (joplin.window as any).loadChromeCssFile(chromeCssPath);
        }
      } catch (err) {
        console.warn('[Theme Studio] Could not synchronize desktop chrome stylesheet:', err);
      }
    }

    // 1. Initial application shell styling on cold launch
    const initialConfig = await getAllCurrentValues();
    await syncDesktopChromeFile(initialConfig.options, initialConfig.shellEnabled);

    // 2. Reactively handle user setting changes
    await joplin.settings.onChange(async (event: { keys?: string[] }) => {
      const hasRelevantChange = !event?.keys || event.keys.some((k) => settingKeys.includes(k));
      if (!hasRelevantChange) return;

      const currentConfig = await getAllCurrentValues();
      await syncDesktopChromeFile(currentConfig.options, currentConfig.shellEnabled);
    });

    // 3. Register CodeMirror Editor Content Script
    await joplin.contentScripts.register(
      ContentScriptType.CodeMirrorPlugin,
      'themeStudioCodeMirror',
      './codeMirrorTheme.js'
    );

    // 4. Respond to style requests (CodeMirror + TinyMCE Rich Text + Shell Chrome)
    await joplin.contentScripts.onMessage('themeStudioCodeMirror', async (message: any) => {
      if (message && (message.type === 'getAllStyles' || message.type === 'getEditorStyles')) {
        const config = await getAllCurrentValues();
        await syncDesktopChromeFile(config.options, config.shellEnabled);

        return {
          editorCss: config.editorEnabled ? buildEditorCss(config.options) : '',
          viewerCss: buildThemeCss(config.options),
          chromeCss: config.shellEnabled ? buildChromeCss(config.options) : '',
        };
      }
      return null;
    });

    // 5. Register Markdown Viewer Content Script
    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      'themeStudioMarkdownIt',
      './markdownTheme.js'
    );
  },
});
