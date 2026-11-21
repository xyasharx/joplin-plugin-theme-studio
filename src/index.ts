import joplin from 'api';
import { ContentScriptType, SettingItemType } from 'api/types';
import { buildEditorCss, buildThemeCss, buildChromeCss, buildPanelCss, StyleOptions } from './styles';
import { themes } from './themes';
import { buildPreviewHtml } from './preview';

joplin.plugins.register({
  onStart: async function () {
    let defaultDirection = 'ltr';
    let defaultFontPreset = 'inter';
    let lastWrittenChromeCss: string | null = null;
    let previewPanel: any = null;
    let previewRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    // Platform detection: the application-shell CSS and iframe handling are
    // desktop-only. Older API versions do not expose `platform`; assume desktop.
    let platform: 'desktop' | 'mobile' | 'unknown' = 'desktop';
    try {
      const info = typeof joplin.versionInfo === 'function' ? await joplin.versionInfo() : null;
      if (info && (info.platform === 'mobile' || info.platform === 'desktop')) {
        platform = info.platform;
      }
    } catch (err) {
      console.warn('[Theme Studio] Could not detect platform. Assuming desktop:', err);
    }
    const isMobile = platform === 'mobile';

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
      'customCss': {
        value: '',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        public: true,
        label: 'Custom CSS for notes',
        description: 'Extra CSS appended after the theme stylesheet (notes and Rich Text editor). Keep it on one line, e.g. "#rendered-md h1 { letter-spacing: -0.5px; }".',
      },
      'colorSchemeMode': {
        value: 'theme',
        type: SettingItemType.String,
        section: 'themeStudioSection',
        isEnum: true,
        public: true,
        label: 'Color Scheme Mode',
        description: 'Follow the operating system light/dark preference. Themes without a matching light/dark counterpart keep their own look in both schemes.',
        options: {
          'theme': 'Use Selected Theme',
          'system': 'Follow System (Light / Dark)',
        },
      },
      'styleBlockquotes': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioSection',
        public: true,
        label: 'Style Blockquotes',
        description: 'Apply the theme border, background and padding to blockquotes. Disable to render them as plain text.',
      },
      'styleTables': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioSection',
        public: true,
        label: 'Style Tables',
        description: 'Apply theme borders, stripes and cell padding to tables. Disable to render them without any table styling.',
      },
      'styleImages': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioSection',
        public: true,
        label: 'Style Images',
        description: 'Apply the theme shadow, border-radius and max-height to images. Disable to render them without decoration.',
      },
      'styleHeadings': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioSection',
        public: true,
        label: 'Style Headings',
        description: 'Apply theme colours and the heading accent borders. Disable to render headings in the body colour without borders.',
      },
      'styleLinks': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioSection',
        public: true,
        label: 'Style Links',
        description: 'Apply the theme link colour and underline. Disable to render links like plain body text.',
      },
      'styleCodeBlocks': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioSection',
        public: true,
        label: 'Style Code Blocks',
        description: 'Apply theme backgrounds and borders to code blocks and inline code. Disable to render them without backgrounds.',
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
      'customCss',
      'colorSchemeMode',
      'styleBlockquotes',
      'styleTables',
      'styleImages',
      'styleHeadings',
      'styleLinks',
      'styleCodeBlocks',
    ];

    /** Reads all plugin settings in one round-trip (or via `value()` on APIs that lack `values()`). */
    async function readSettings(): Promise<Record<string, any>> {
      if (typeof joplin.settings.values === 'function') {
        return joplin.settings.values(settingKeys);
      }
      const results = await Promise.all(settingKeys.map((k) => joplin.settings.value(k)));
      const vals: Record<string, any> = {};
      settingKeys.forEach((k, idx) => {
        vals[k] = results[idx];
      });
      return vals;
    }

    async function getAllCurrentValues(): Promise<{ options: StyleOptions; editorEnabled: boolean; shellEnabled: boolean; version: string }> {
      const vals = await readSettings();

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
        customCss: vals['customCss'] || '',
        colorSchemeMode: vals['colorSchemeMode'] || 'theme',
        styleBlockquotes: vals['styleBlockquotes'] ?? true,
        styleTables: vals['styleTables'] ?? true,
        styleImages: vals['styleImages'] ?? true,
        styleHeadings: vals['styleHeadings'] ?? true,
        styleLinks: vals['styleLinks'] ?? true,
        styleCodeBlocks: vals['styleCodeBlocks'] ?? true,
      };

      return {
        options,
        version: makeStyleVersion(vals),
        editorEnabled: vals['enableEditorTheme'] ?? true,
        shellEnabled: vals['themeApplicationShell'] ?? true,
      };
    }

    /**
     * Cheap change token for the content scripts. Joplin has no push channel to
     * a content script, so the script polls this instead of re-downloading the
     * whole stylesheet.
     */
    function makeStyleVersion(vals: Record<string, any>): string {
      return JSON.stringify([platform, ...settingKeys.map((k) => vals[k] ?? null)]);
    }

    async function getStyleVersion(): Promise<string> {
      return makeStyleVersion(await readSettings());
    }

    // Serialise shell writes: a command (immediate refresh) and the debounced
    // onChange handler can otherwise overlap and finish out of order.
    let chromeSyncChain: Promise<void> = Promise.resolve();

    async function syncDesktopChromeFile(options: StyleOptions, enabled: boolean): Promise<void> {
      const run = async (): Promise<void> => {
        if (isMobile) return;
        try {
          if (joplin.window && typeof (joplin.window as any).loadChromeCssFile === 'function') {
            const content = enabled ? buildChromeCss(options) : '';
            if (content === lastWrittenChromeCss) {
              return;
            }

            // Joplin de-duplicates this path and re-creates its <link>; Blink gives
            // local files a zero freshness lifetime on desktop, so the new content
            // is picked up immediately. This is the single source of truth for the
            // application shell – the content script must not inject a copy.
            const fs = joplin.require('fs-extra');
            const dataDir: string = await joplin.plugins.dataDir();
            const chromeCssPath = `${dataDir}/theme-studio-chrome.css`;
            await fs.writeFile(chromeCssPath, content, 'utf8');
            await (joplin.window as any).loadChromeCssFile(chromeCssPath);
            lastWrittenChromeCss = content; // only after success, so failures are retried
          }
        } catch (err) {
          console.warn('[Theme Studio] Could not synchronize desktop chrome stylesheet:', err);
        }
      };

      chromeSyncChain = chromeSyncChain.then(run, run);
      return chromeSyncChain;
    }

    // 1. Initial application shell styling on cold launch
    const initialConfig = await getAllCurrentValues();
    await syncDesktopChromeFile(initialConfig.options, initialConfig.shellEnabled);

    // Live preview panel ---------------------------------------------------
    // A view panel renders a standalone HTML document with the generated
    // viewer stylesheet and a sample note, so settings changes are visible
    // without opening a note. The panel is created once and kept hidden until
    // the user opens it via the command; refreshes are debounced because
    // settings changes fire per key.
    async function refreshPreview(): Promise<void> {
      if (!previewPanel) return;
      try {
        const cfg = await getAllCurrentValues();
        await joplin.views.panels.setHtml(previewPanel, buildPreviewHtml(cfg.options));
      } catch (err) {
        console.warn('[Theme Studio] Could not refresh the live preview panel:', err);
      }
    }

    function schedulePreviewRefresh(): void {
      if (previewRefreshTimer) clearTimeout(previewRefreshTimer);
      previewRefreshTimer = setTimeout(() => {
        previewRefreshTimer = null;
        void refreshPreview();
      }, 250);
    }

    try {
      previewPanel = await joplin.views.panels.create('themeStudioPreview');
      await joplin.views.panels.show(previewPanel, false);
      await refreshPreview();
    } catch (err) {
      console.warn('[Theme Studio] Could not create the live preview panel:', err);
      previewPanel = null;
    }

    // 2. Reactively handle user setting changes
    await joplin.settings.onChange(async (event: { keys?: string[] }) => {
      const hasRelevantChange = !event?.keys || event.keys.some((k) => settingKeys.includes(k));
      if (!hasRelevantChange) return;

      const currentConfig = await getAllCurrentValues();
      await syncDesktopChromeFile(currentConfig.options, currentConfig.shellEnabled);
      if (previewPanel) schedulePreviewRefresh();
    });

    // 3. Commands (Command Palette, Keyboard Shortcuts screen)
    const themeKeys = Object.keys(themes);

    const applyCurrentConfig = async (): Promise<void> => {
      const cfg = await getAllCurrentValues();
      await syncDesktopChromeFile(cfg.options, cfg.shellEnabled);
    };

    await joplin.commands.register({
      name: 'themeStudio.nextTheme',
      label: 'Theme Studio: Next colour theme',
      iconName: 'fas fa-palette',
      execute: async () => {
        const cfg = await getAllCurrentValues();
        const index = themeKeys.indexOf(cfg.options.themeKey);
        const next = themeKeys[(index + 1) % themeKeys.length];
        await joplin.settings.setValue('theme', next);
        await applyCurrentConfig();
      },
    });

    await joplin.commands.register({
      name: 'themeStudio.toggleShell',
      label: 'Theme Studio: Toggle application shell theming',
      iconName: 'fas fa-columns',
      execute: async () => {
        const cfg = await getAllCurrentValues();
        await joplin.settings.setValue('themeApplicationShell', !cfg.shellEnabled);
        await applyCurrentConfig();
      },
    });

    await joplin.commands.register({
      name: 'themeStudio.toggleEditor',
      label: 'Theme Studio: Toggle Markdown editor theming',
      iconName: 'fas fa-code',
      execute: async () => {
        const cfg = await getAllCurrentValues();
        await joplin.settings.setValue('enableEditorTheme', !cfg.editorEnabled);
      },
    });

    await joplin.commands.register({
      name: 'themeStudio.copyCss',
      label: 'Theme Studio: Copy generated note CSS to clipboard',
      iconName: 'fas fa-copy',
      execute: async () => {
        const cfg = await getAllCurrentValues();
        try {
          await joplin.clipboard.writeText(buildThemeCss(cfg.options, 'viewer'));
        } catch (err) {
          console.warn('[Theme Studio] Could not copy the CSS to the clipboard:', err);
        }
      },
    });

    await joplin.commands.register({
      name: 'themeStudio.openPreview',
      label: 'Theme Studio: Open live preview',
      iconName: 'fas fa-eye',
      execute: async () => {
        if (!previewPanel) {
          try {
            previewPanel = await joplin.views.panels.create('themeStudioPreview');
          } catch (err) {
            console.warn('[Theme Studio] Could not create the live preview panel:', err);
            return;
          }
        }
        await refreshPreview();
        await joplin.views.panels.show(previewPanel, true);
      },
    });

    // 4. Register CodeMirror Editor Content Script
    await joplin.contentScripts.register(
      ContentScriptType.CodeMirrorPlugin,
      'themeStudioCodeMirror',
      './codeMirrorTheme.js'
    );

    // 5. Respond to style requests (CodeMirror + TinyMCE Rich Text + Shell Chrome)
    await joplin.contentScripts.onMessage('themeStudioCodeMirror', async (message: any) => {
      if (message && message.type === 'getStyleVersion') {
        return { version: await getStyleVersion() };
      }

      if (message && (message.type === 'getAllStyles' || message.type === 'getEditorStyles')) {
        const config = await getAllCurrentValues();
        await syncDesktopChromeFile(config.options, config.shellEnabled);

        return {
          version: config.version,
          editorCss: config.editorEnabled ? buildEditorCss(config.options) : '',
          viewerCss: buildThemeCss(config.options, 'tinymce'), // Rich Text iframe only; the viewer builds its own
          panelCss: !isMobile && config.shellEnabled ? buildPanelCss(config.options) : '',
          platform,
        };
      }
      return null;
    });

    // 6. Register Markdown Viewer Content Script
    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      'themeStudioMarkdownIt',
      './markdownTheme.js'
    );
  },
});
