import joplin from 'api';
import { ContentScriptType, SettingItemType } from 'api/types';
import { buildEditorCss, buildThemeCss, buildChromeCss, buildPanelCss, StyleOptions, PaletteMap } from './styles';
import { themes, ThemePalette } from './themes';
import { buildPreviewHtml } from './preview';
import { generatePalette, parsePaletteJson, exportPalettes, sanitizePaletteName } from './palette';
import { parseOverrideLines, resolveThemeOverride, NoteContext } from './overrides';

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

    /**
     * The settings page is organized into native Joplin sections — one per
     * category. Joplin renders each registered section as its own grouped,
     * collapsible block in the settings UI, complete with a label, icon and
     * description, which gives the page a real visual hierarchy instead of a
     * flat list of rows. Settings are registered in category order and each
     * belongs to its category's section; the section header carries the
     * category context, so labels stay clean and short.
     */
    const THEME_STUDIO_CATEGORIES: { id: string; section: string; title: string; summary: string; iconName: string }[] = [
      { id: 'appearance', section: 'themeStudioAppearanceSection', title: 'Theme & Appearance', summary: 'Colors, direction and where the theme is applied.', iconName: 'fas fa-palette' },
      { id: 'typography', section: 'themeStudioTypographySection', title: 'Typography', summary: 'Fonts, sizes, line spacing and reading width.', iconName: 'fas fa-font' },
      { id: 'elements', section: 'themeStudioElementsSection', title: 'Code & Markdown Elements', summary: 'Code fonts and per-element styling toggles.', iconName: 'fas fa-code' },
      { id: 'export', section: 'themeStudioExportSection', title: 'Export', summary: 'PDF appearance, page size and margins.', iconName: 'fas fa-file-pdf' },
      { id: 'advanced', section: 'themeStudioAdvancedSection', title: 'Advanced', summary: 'Custom CSS and palette data for fine-grained control.', iconName: 'fas fa-sliders-h' },
    ];
    for (const category of THEME_STUDIO_CATEGORIES) {
      await joplin.settings.registerSection(category.section, {
        label: category.title,
        iconName: category.iconName,
        description: category.summary,
      });
    }

    // ---------------------------------------------------------------------
    // Runtime palette registry (P2: palette builder + import/export).
    //
    // Built-in themes live in themes.ts. On top of them the plugin exposes:
    //  - the generated "custom" palette, derived from three base colours,
    //  - palettes imported from JSON (stored in the `customPalettes` setting).
    // The registry is the single source of truth for style builds, the theme
    // selector and palette export.
    // ---------------------------------------------------------------------
    const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

    function buildCustomPalette(vals: Record<string, any>): ThemePalette | null {
      const bg = String(vals['customPaletteBg'] || '');
      const fg = String(vals['customPaletteFg'] || '');
      const accent = String(vals['customPaletteAccent'] || '');
      if (!HEX_COLOR.test(bg) || !HEX_COLOR.test(fg) || !HEX_COLOR.test(accent)) return null;
      const name = String(vals['customPaletteName'] || 'Custom Palette').trim() || 'Custom Palette';
      return generatePalette(name, { bg, fg, accent });
    }

    let runtimeThemes: Record<string, ThemePalette> = { ...themes };

    function rebuildRuntimeThemes(customPalettesJson: string): { imported: ThemePalette[]; errors: string[] } {
      const next: Record<string, ThemePalette> = { ...themes };
      const imported: ThemePalette[] = [];
      const errors: string[] = [];

      if (customPalettesJson && customPalettesJson.trim()) {
        const parsed = parsePaletteJson(customPalettesJson);
        errors.push(...parsed.errors);
        for (const palette of parsed.palettes) {
          const key = `imported:${sanitizePaletteName(palette.name) || 'palette'}`;
          next[key] = palette;
          imported.push(palette);
        }
      }

      runtimeThemes = next;
      return { imported, errors };
    }

    await joplin.settings.registerSettings({
      // ── Theme & Appearance ──────────────────────────────────────────────
      'theme': {
        value: 'atom-one-dark',
        type: SettingItemType.String,
        section: 'themeStudioAppearanceSection',
        isEnum: true,
        public: true,
        label: 'Color Theme',
        description: 'Choose your desired color scheme. The "custom" palette is generated from the base colours below; imported palettes appear after the built-in ones.',
        options: Object.fromEntries(Object.entries(themes).map(([key, palette]) => [key, palette.name])),
      },
      'colorSchemeMode': {
        value: 'theme',
        type: SettingItemType.String,
        section: 'themeStudioAppearanceSection',
        isEnum: true,
        public: true,
        label: 'Color Scheme Mode',
        description: 'Follow the operating system light/dark preference. Themes without a matching light/dark counterpart keep their own look in both schemes.',
        options: {
          'theme': 'Use Selected Theme',
          'system': 'Follow System (Light / Dark)',
        },
      },
      'direction': {
        value: defaultDirection,
        type: SettingItemType.String,
        section: 'themeStudioAppearanceSection',
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
        section: 'themeStudioAppearanceSection',
        public: true,
        label: 'Apply Theme to Markdown Editor',
        description: 'Styles the CodeMirror editor (background, colors, line numbers, headings) to match the viewer.',
      },
      'themeApplicationShell': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioAppearanceSection',
        public: true,
        label: 'Theme Application Shell (Sidebar & Note List)',
        description: 'Applies the active palette to Joplin\'s desktop sidebar, note list, and header (Desktop only).',
      },
      'themeByNotebook': {
        value: '',
        type: SettingItemType.String,
        section: 'themeStudioAppearanceSection',
        public: true,
        label: 'Per-Notebook Theme Overrides',
        description: 'One mapping per line: "id:<notebookId>=<themeKey>" or "title:<Notebook Title>=<themeKey>". The active note uses the first matching notebook in its chain; otherwise the default theme applies.',
      },
      'themeByTag': {
        value: '',
        type: SettingItemType.String,
        section: 'themeStudioAppearanceSection',
        public: true,
        label: 'Per-Tag Theme Overrides',
        description: 'One mapping per line: "id:<tagId>=<themeKey>" or "title:<Tag Title>=<themeKey>". Applied when the active note matches a tag and no notebook override matched.',
      },
      'noteThemeEffective': {
        value: '',
        type: SettingItemType.String,
        section: 'themeStudioAppearanceSection',
        public: true,
        advanced: true,
        label: 'Active Note Theme (auto-managed)',
        description: 'Internal: the theme resolved for the currently selected note from the per-notebook/per-tag overrides. Updated automatically; leave empty to use the selected theme.',
      },
      // ── Typography ───────────────────────────────────────────────────────
      'fontPreset': {
        value: defaultFontPreset,
        type: SettingItemType.String,
        section: 'themeStudioTypographySection',
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
        section: 'themeStudioTypographySection',
        public: true,
        label: 'Custom Font Stack',
        description: 'Active only when "Custom Font Stack" is selected above.',
      },
      'fontSize': {
        value: '16px',
        type: SettingItemType.String,
        section: 'themeStudioTypographySection',
        public: true,
        label: 'Font Size',
        description: 'Base font size (e.g., 14px, 16px, 18px, 20px). Works across Desktop & Mobile.',
      },
      'lineHeight': {
        value: '1.75',
        type: SettingItemType.String,
        section: 'themeStudioTypographySection',
        public: true,
        label: 'Line Height',
        description: 'Reading line spacing (e.g., 1.6, 1.75, 1.9).',
      },
      'letterSpacing': {
        value: '',
        type: SettingItemType.String,
        section: 'themeStudioTypographySection',
        public: true,
        label: 'Letter Spacing',
        description: 'Tracking applied to note text (e.g. 0.5px, 0.02em). Empty keeps the default spacing.',
      },
      'textAlign': {
        value: 'left',
        type: SettingItemType.String,
        section: 'themeStudioTypographySection',
        isEnum: true,
        public: true,
        label: 'Paragraph Alignment',
        description: 'Paragraph text alignment for notes.',
        options: {
          'left': 'Left (Default)',
          'justify': 'Justify',
        },
      },
      'hyphenation': {
        value: false,
        type: SettingItemType.Bool,
        section: 'themeStudioTypographySection',
        public: true,
        label: 'Hyphenation',
        description: 'Enables automatic hyphenation of note paragraphs (requires a browser with hyphenation support and a matching note language).',
      },
      'fontLigatures': {
        value: false,
        type: SettingItemType.Bool,
        section: 'themeStudioTypographySection',
        public: true,
        label: 'Font Ligatures',
        description: 'Enables common typographic ligatures (fi, fl, ffi) in note text via font-variant-ligatures.',
      },
      'mobileDensity': {
        value: 'default',
        type: SettingItemType.String,
        section: 'themeStudioTypographySection',
        isEnum: true,
        public: true,
        label: 'Mobile Density',
        description: 'Font size scale applied on screens under 768px. Compact fits more content per screen; Large improves readability on small displays.',
        options: {
          'compact': 'Compact',
          'default': 'Default',
          'large': 'Large',
        },
      },
      'headingSizePreset': {
        value: 'balanced',
        type: SettingItemType.String,
        section: 'themeStudioTypographySection',
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
        section: 'themeStudioTypographySection',
        public: true,
        label: 'Custom Heading Sizes (H1 - H6)',
        description: 'Active only when "Custom Sizes" is selected. Comma-separated sizes from H1 to H6 (e.g., 28px, 24px, 20px, 18px, 16px, 14px or 2.2em, 1.7em, 1.4em, 1.2em, 1.1em, 1.0em).',
      },
      'contentMaxWidth': {
        value: 'full',
        type: SettingItemType.String,
        section: 'themeStudioTypographySection',
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
      // ── Code & Markdown Elements ────────────────────────────────────────
      'codeFontPreset': {
        value: 'fira-code',
        type: SettingItemType.String,
        section: 'themeStudioElementsSection',
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
        section: 'themeStudioElementsSection',
        public: true,
        label: 'Custom Code Font Stack',
        description: 'Active only when "Custom Code Font" is selected above.',
      },
      'styleBlockquotes': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioElementsSection',
        public: true,
        label: 'Style Blockquotes',
        description: 'Apply the theme border, background and padding to blockquotes. Disable to render them as plain text.',
      },
      'styleTables': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioElementsSection',
        public: true,
        label: 'Style Tables',
        description: 'Apply theme borders, stripes and cell padding to tables. Disable to render them without any table styling.',
      },
      'styleImages': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioElementsSection',
        public: true,
        label: 'Style Images',
        description: 'Apply the theme shadow, border-radius and max-height to images. Disable to render them without decoration.',
      },
      'styleHeadings': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioElementsSection',
        public: true,
        label: 'Style Headings',
        description: 'Apply theme colours and the heading accent borders. Disable to render headings in the body colour without borders.',
      },
      'styleLinks': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioElementsSection',
        public: true,
        label: 'Style Links',
        description: 'Apply the theme link colour and underline. Disable to render links like plain body text.',
      },
      'styleCodeBlocks': {
        value: true,
        type: SettingItemType.Bool,
        section: 'themeStudioElementsSection',
        public: true,
        label: 'Style Code Blocks',
        description: 'Apply theme backgrounds and borders to code blocks and inline code. Disable to render them without backgrounds.',
      },
      // ── Export ──────────────────────────────────────────────────────────
      'pdfExportStyle': {
        value: 'exact',
        type: SettingItemType.String,
        section: 'themeStudioExportSection',
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
        section: 'themeStudioExportSection',
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
        section: 'themeStudioExportSection',
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
        section: 'themeStudioExportSection',
        public: true,
        label: 'Custom PDF Page Margins',
        description: 'Active only when "Custom Margins" is selected above (e.g., "15mm 18mm", "1in", "10mm 15mm 10mm 15mm").',
      },
      // ── Advanced ───────────────────────────────────────────────────────
      'customCss': {
        value: '',
        type: SettingItemType.String,
        section: 'themeStudioAdvancedSection',
        public: true,
        label: 'Custom CSS for notes',
        description: 'Extra CSS appended after the theme stylesheet (notes and Rich Text editor). Keep it on one line, e.g. "#rendered-md h1 { letter-spacing: -0.5px; }".',
      },
      'customPalettes': {
        value: '',
        type: SettingItemType.String,
        section: 'themeStudioAdvancedSection',
        public: true,
        label: 'Imported Palettes (JSON)',
        description: 'Palettes imported via the "Import palettes from clipboard" command, stored as JSON. Each entry is { "name", "isDark", "variables": { ... } } or { "name", "base": { "bg", "fg", "accent" } }.',
      },
      'customPaletteName': {
        value: 'Custom Palette',
        type: SettingItemType.String,
        section: 'themeStudioAdvancedSection',
        public: true,
        label: 'Custom Palette Name',
        description: 'Display name of the generated custom palette.',
      },
      'customPaletteBg': {
        value: '#1e1e2e',
        type: SettingItemType.String,
        section: 'themeStudioAdvancedSection',
        public: true,
        label: 'Custom Palette Background',
        description: 'Base background colour (#RRGGBB) for the generated custom palette.',
      },
      'customPaletteFg': {
        value: '#cdd6f4',
        type: SettingItemType.String,
        section: 'themeStudioAdvancedSection',
        public: true,
        label: 'Custom Palette Foreground',
        description: 'Base text colour (#RRGGBB) for the generated custom palette.',
      },
      'customPaletteAccent': {
        value: '#89b4fa',
        type: SettingItemType.String,
        section: 'themeStudioAdvancedSection',
        public: true,
        label: 'Custom Palette Accent',
        description: 'Base accent colour (#RRGGBB); the heading scale and links are derived from it.',
      },
    });

    // The theme selector was registered above with the built-in palettes.
    // Re-register it with the full, dynamic option list (built-in + custom +
    // imported palettes). Re-registering overwrites the metadata in place,
    // so the selector keeps its position at the top of the section.
    const paletteVals = typeof joplin.settings.values === 'function'
      ? await joplin.settings.values(['customPalettes'])
      : {};
    const importedAtStartup = rebuildRuntimeThemes(String((paletteVals as any)['customPalettes'] || ''));
    if (importedAtStartup.errors.length) {
      console.warn('[Theme Studio] Could not load some imported palettes:', importedAtStartup.errors.join('; '));
    }
    const builderVals = typeof joplin.settings.values === 'function'
      ? await joplin.settings.values(['customPaletteName', 'customPaletteBg', 'customPaletteFg', 'customPaletteAccent'])
      : {};
    const customPalette = buildCustomPalette(builderVals as any);
    if (customPalette) {
      runtimeThemes['custom'] = customPalette;
    }

    const themeOptions: Record<string, string> = {};
    for (const [key, palette] of Object.entries(runtimeThemes)) {
      themeOptions[key] = palette.name;
    }

    await joplin.settings.registerSettings({
      'theme': {
        value: 'atom-one-dark',
        type: SettingItemType.String,
        section: 'themeStudioAppearanceSection',
        isEnum: true,
        public: true,
        label: 'Color Theme',
        description: 'Choose your desired color scheme. The "custom" palette is generated from the base colours below; imported palettes appear after the built-in ones.',
        options: themeOptions,
      },
    });

    const settingKeys = [
      // Theme & Appearance
      'theme',
      'direction',
      'enableEditorTheme',
      'themeApplicationShell',
      'colorSchemeMode',
      'themeByNotebook',
      'themeByTag',
      'noteThemeEffective',
      // Typography
      'fontPreset',
      'fontFamily',
      'fontSize',
      'lineHeight',
      'letterSpacing',
      'textAlign',
      'hyphenation',
      'fontLigatures',
      'mobileDensity',
      'headingSizePreset',
      'customHeadingSizes',
      'contentMaxWidth',
      // Code & Markdown Elements
      'codeFontPreset',
      'codeFont',
      'styleBlockquotes',
      'styleTables',
      'styleImages',
      'styleHeadings',
      'styleLinks',
      'styleCodeBlocks',
      // Export
      'pdfExportStyle',
      'pdfPageSize',
      'pdfPageMargin',
      'customPdfMargin',
      // Advanced
      'customCss',
      'customPalettes',
      'customPaletteName',
      'customPaletteBg',
      'customPaletteFg',
      'customPaletteAccent',
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
        letterSpacing: vals['letterSpacing'] || '',
        textAlign: vals['textAlign'] || 'left',
        hyphenation: vals['hyphenation'] ?? false,
        fontLigatures: vals['fontLigatures'] ?? false,
        mobileDensity: vals['mobileDensity'] || 'default',
        noteThemeEffective: vals['noteThemeEffective'] || '',
        themeByNotebook: vals['themeByNotebook'] || '',
        themeByTag: vals['themeByTag'] || '',
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
            const content = enabled ? buildChromeCss(options, runtimeThemes) : '';
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

    // Per-note theme overrides (P2) -----------------------------------------
    // The active note's notebook chain and tags are resolved through the
    // Joplin workspace/data APIs and matched against the per-notebook and
    // per-tag override settings. The resolved palette is published in the
    // internal `noteThemeEffective` setting, which the Markdown viewer reads
    // when it builds its stylesheet (content scripts cannot call the data
    // API, so the main process does the resolution).
    const noteContextCache = new Map<string, { context: NoteContext; ts: number }>();
    const NOTE_CONTEXT_CACHE_MAX = 100;
    const NOTE_CONTEXT_TTL_MS = 5 * 60 * 1000;

    async function resolveNoteContext(noteId: string): Promise<NoteContext | null> {
      const cached = noteContextCache.get(noteId);
      if (cached && Date.now() - cached.ts < NOTE_CONTEXT_TTL_MS) return cached.context;

      try {
        const note = await joplin.data.get(['notes', noteId], { fields: ['id', 'parent_id'] }) as any;
        if (!note || !note.id) return null;

        // Walk the notebook chain from the note's own notebook up to the root.
        const notebooks: { id: string; title: string }[] = [];
        let parentId: string | undefined = note.parent_id;
        const seen = new Set<string>();
        while (parentId && !seen.has(parentId)) {
          seen.add(parentId);
          const folder = await joplin.data.get(['folders', parentId], { fields: ['id', 'parent_id', 'title'] }) as any;
          if (!folder || !folder.id) break;
          notebooks.push({ id: folder.id, title: folder.title || '' });
          parentId = folder.parent_id;
          if (notebooks.length >= 20) break;
        }

        const tagItems = await joplin.data.get(['notes', noteId, 'tags'], { fields: ['id', 'title'] }) as any[];
        const tags = Array.isArray(tagItems)
          ? tagItems.filter((t) => t && t.id).map((t) => ({ id: t.id, title: t.title || '' }))
          : [];

        const context: NoteContext = { notebooks, tags };
        noteContextCache.set(noteId, { context, ts: Date.now() });
        if (noteContextCache.size > NOTE_CONTEXT_CACHE_MAX) {
          const oldest = noteContextCache.keys().next().value;
          if (oldest !== undefined) noteContextCache.delete(oldest);
        }
        return context;
      } catch (err) {
        console.warn('[Theme Studio] Could not resolve note context for overrides:', err);
        return null;
      }
    }

    async function refreshEffectiveTheme(): Promise<void> {
      try {
        const vals = await readSettings();
        const overrideText = `${vals['themeByNotebook'] || ''}\n${vals['themeByTag'] || ''}`;
        if (!overrideText.trim()) {
          if (vals['noteThemeEffective']) {
            await joplin.settings.setValue('noteThemeEffective', '');
          }
          return;
        }

        const note = await joplin.workspace.selectedNote();
        if (!note || !note.id) {
          if (vals['noteThemeEffective']) {
            await joplin.settings.setValue('noteThemeEffective', '');
          }
          return;
        }

        const context = await resolveNoteContext(note.id);
        if (!context) return;

        const notebookParse = parseOverrideLines(vals['themeByNotebook'] || '', 'notebook');
        const tagParse = parseOverrideLines(vals['themeByTag'] || '', 'tag');
        if (notebookParse.errors.length || tagParse.errors.length) {
          console.warn('[Theme Studio] Invalid override settings:', [...notebookParse.errors, ...tagParse.errors].join('; '));
        }

        const resolution = resolveThemeOverride(
          context,
          { notebook: notebookParse.overrides, tag: tagParse.overrides },
          vals['theme'] || 'atom-one-dark',
        );

        if (resolution.themeKey !== (vals['noteThemeEffective'] || '')) {
          await joplin.settings.setValue('noteThemeEffective', resolution.themeKey);
        }
      } catch (err) {
        console.warn('[Theme Studio] Could not refresh the active note theme:', err);
      }
    }

    // Track the selected note so the effective theme follows note switches and
    // note edits (a note's notebook/tags can change without a selection change).
    try {
      await joplin.workspace.onNoteSelectionChange(() => {
        void refreshEffectiveTheme();
      });
      await joplin.workspace.onNoteChange(() => {
        void refreshEffectiveTheme();
      });
    } catch (err) {
      console.warn('[Theme Studio] Could not subscribe to workspace events:', err);
    }

    // 1. Initial application shell styling on cold launch
    const initialConfig = await getAllCurrentValues();
    await syncDesktopChromeFile(initialConfig.options, initialConfig.shellEnabled);
    await refreshEffectiveTheme();

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
        await joplin.views.panels.setHtml(previewPanel, buildPreviewHtml(cfg.options, runtimeThemes));
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
      const changedKeys = event?.keys || [];
      const hasRelevantChange = !event?.keys || event.keys.some((k) => settingKeys.includes(k));
      if (!hasRelevantChange) return;

      // Palette builder colours changed: regenerate the custom palette in the
      // runtime registry so style builds and the selector reflect the new base.
      if (changedKeys.some((k) => k.startsWith('customPalette'))) {
        const builderVals = await joplin.settings.values(['customPaletteName', 'customPaletteBg', 'customPaletteFg', 'customPaletteAccent']);
        const customPalette = buildCustomPalette(builderVals);
        if (customPalette) {
          runtimeThemes['custom'] = customPalette;
        } else {
          delete runtimeThemes['custom'];
        }
      }

      // Override settings or the selected theme changed: re-resolve the
      // active note's effective theme.
      if (changedKeys.some((k) => k === 'theme' || k === 'themeByNotebook' || k === 'themeByTag')) {
        await refreshEffectiveTheme();
      }

      const currentConfig = await getAllCurrentValues();
      await syncDesktopChromeFile(currentConfig.options, currentConfig.shellEnabled);
      if (previewPanel) schedulePreviewRefresh();
    });

    // 3. Commands (Command Palette, Keyboard Shortcuts screen)
    const themeKeys = Object.keys(runtimeThemes);

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

    // Per-theme commands (P3): one entry per palette in the runtime registry,
    // so keyboard-only users can jump straight to a specific theme from the
    // Command Palette without cycling. The label carries the display name;
    // the key is kept in the command name for programmatic execution.
    for (const [themeKey, palette] of Object.entries(runtimeThemes)) {
      await joplin.commands.register({
        name: `themeStudio.useTheme.${themeKey}`,
        label: `Theme Studio: Use ${palette.name}`,
        iconName: 'fas fa-paint-brush',
        execute: async () => {
          await joplin.settings.setValue('theme', themeKey);
          await applyCurrentConfig();
        },
      });
    }

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
          await joplin.clipboard.writeText(buildThemeCss(cfg.options, 'viewer', runtimeThemes));
        } catch (err) {
          console.warn('[Theme Studio] Could not copy the CSS to the clipboard:', err);
        }
      },
    });

    await joplin.commands.register({
      name: 'themeStudio.exportPalettes',
      label: 'Theme Studio: Export all palettes to clipboard',
      iconName: 'fas fa-download',
      execute: async () => {
        try {
          const payload = exportPalettes(Object.values(runtimeThemes));
          await joplin.clipboard.writeText(payload);
        } catch (err) {
          console.warn('[Theme Studio] Could not export the palettes to the clipboard:', err);
        }
      },
    });

    await joplin.commands.register({
      name: 'themeStudio.importPalettes',
      label: 'Theme Studio: Import palettes from clipboard',
      iconName: 'fas fa-upload',
      execute: async () => {
        try {
          const json = await joplin.clipboard.readText();
          if (!json || !json.trim()) {
            console.warn('[Theme Studio] The clipboard is empty; nothing to import.');
            return;
          }
          const { palettes, errors } = parsePaletteJson(json);
          if (errors.length) {
            console.warn('[Theme Studio] Could not import some palettes:', errors.join('; '));
          }
          if (!palettes.length) return;

          // Merge by name: entries replace existing imported palettes with the
          // same name and add new ones. The enum options update on next start.
          const existing = await joplin.settings.value('customPalettes');
          const current = parsePaletteJson(String(existing || '')).palettes;
          const byName = new Map(current.map((p) => [p.name, p]));
          for (const palette of palettes) byName.set(palette.name, palette);
          await joplin.settings.setValue('customPalettes', JSON.stringify(Array.from(byName.values())));

          const result = rebuildRuntimeThemes(JSON.stringify(Array.from(byName.values())));
          if (result.errors.length) {
            console.warn('[Theme Studio] Imported palettes failed validation:', result.errors.join('; '));
          }
          await refreshEffectiveTheme();
        } catch (err) {
          console.warn('[Theme Studio] Could not import the palettes from the clipboard:', err);
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
          editorCss: config.editorEnabled ? buildEditorCss(config.options, runtimeThemes) : '',
          viewerCss: buildThemeCss(config.options, 'tinymce', runtimeThemes), // Rich Text iframe only; the viewer builds its own
          panelCss: !isMobile && config.shellEnabled ? buildPanelCss(config.options, runtimeThemes) : '',
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
