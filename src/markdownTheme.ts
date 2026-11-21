import { buildThemeCss, StyleOptions } from './styles';
import { themes, ThemePalette } from './themes';
import { generatePalette, parsePaletteJson, sanitizePaletteName } from './palette';

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

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * Build the runtime palette map available to the viewer. The content script
 * cannot call the Joplin data API, so it reconstructs the same registry the
 * main process uses: built-in themes plus the generated custom palette and
 * the palettes imported via the `customPalettes` setting.
 */
function buildViewerPalettes(pluginOptions: any): Record<string, ThemePalette> {
  const palettes: Record<string, ThemePalette> = { ...themes };

  const customPalettesJson = readSetting(pluginOptions, 'customPalettes', '');
  if (customPalettesJson.trim()) {
    const parsed = parsePaletteJson(customPalettesJson);
    for (const palette of parsed.palettes) {
      palettes[`imported:${sanitizePaletteName(palette.name) || 'palette'}`] = palette;
    }
  }

  const bg = readSetting(pluginOptions, 'customPaletteBg', '');
  const fg = readSetting(pluginOptions, 'customPaletteFg', '');
  const accent = readSetting(pluginOptions, 'customPaletteAccent', '');
  if (HEX_COLOR.test(bg) && HEX_COLOR.test(fg) && HEX_COLOR.test(accent)) {
    const name = readSetting(pluginOptions, 'customPaletteName', 'Custom Palette') || 'Custom Palette';
    palettes['custom'] = generatePalette(name, { bg, fg, accent });
  }

  return palettes;
}

function getMemoizedViewerCss(pluginOptions: any): string {
  const themeKey = readSetting(pluginOptions, 'theme', 'atom-one-dark');
  const noteThemeEffective = readSetting(pluginOptions, 'noteThemeEffective', '');
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
  const customCss = readSetting(pluginOptions, 'customCss', '');
  const headingSizePreset = readSetting(pluginOptions, 'headingSizePreset', 'balanced');
  const customHeadingSizes = readSetting(pluginOptions, 'customHeadingSizes', '1.75em, 1.42em, 1.25em, 1.12em, 1.05em, 1.0em');
  const letterSpacing = readSetting(pluginOptions, 'letterSpacing', '');
  const textAlign = readSetting(pluginOptions, 'textAlign', 'left');
  const hyphenation = readSetting(pluginOptions, 'hyphenation', 'false');
  const fontLigatures = readSetting(pluginOptions, 'fontLigatures', 'false');
  const mobileDensity = readSetting(pluginOptions, 'mobileDensity', 'default');
  const customPalettesJson = readSetting(pluginOptions, 'customPalettes', '');
  const customPaletteBg = readSetting(pluginOptions, 'customPaletteBg', '');
  const customPaletteFg = readSetting(pluginOptions, 'customPaletteFg', '');
  const customPaletteAccent = readSetting(pluginOptions, 'customPaletteAccent', '');

  // Fast cache key comparison
  const cacheKey = JSON.stringify([
    themeKey, noteThemeEffective, direction, fontPreset, fontSize, lineHeight, fontFamily, codeFontPreset, codeFont,
    contentMaxWidth, pdfExportStyle, pdfPageSize, pdfPageMargin, customPdfMargin, headingSizePreset, customHeadingSizes, customCss,
    letterSpacing, textAlign, hyphenation, fontLigatures, mobileDensity, customPalettesJson, customPaletteBg, customPaletteFg, customPaletteAccent,
  ]);

  if (cacheKey !== lastViewerCacheKey || !cachedViewerCss) {
    lastViewerCacheKey = cacheKey;
    const options: StyleOptions = {
      themeKey,
      noteThemeEffective,
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
      customCss,
      letterSpacing,
      textAlign,
      hyphenation: hyphenation === 'true',
      fontLigatures: fontLigatures === 'true',
      mobileDensity,
    };
    cachedViewerCss = buildThemeCss(options, 'viewer', buildViewerPalettes(pluginOptions));
  }

  return cachedViewerCss;
}

// Right-to-left scripts, by Unicode script property. Covers Hebrew, Arabic
// (including Extended-A/B, which the old \u0591-\u07FF block range missed),
// Syriac, Thaana, NKo, Adlam, Samaritan, Mandaic, Yezidi and Hanifi Rohingya.
const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Adlam}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Yezidi}\p{Script=Hanifi_Rohingya}]/u;
// First STRONG character: skips whitespace, punctuation, symbols and every
// Unicode decimal digit (\p{Nd} covers ASCII, Arabic-Indic U+0660-0669 and
// Devanagari alike). Digits carry bidi class AN/EN, i.e. they are weak — a
// paragraph that opens with them must not be classified by them.
const FIRST_SIGNIFICANT_CHAR = /[^\s\p{Nd}\p{P}\p{S}]/u;

function isRtlContent(str: string): boolean {
  if (!str) return false;
  // Stops at the first strong character instead of scanning the whole block:
  // O(1) in the common case rather than O(length) per paragraph.
  const match = FIRST_SIGNIFICANT_CHAR.exec(str);
  return match ? RTL_SCRIPT.test(match[0]) : false;
}

export default function (_context: any) {
    return {
      plugin: function (markdownIt: any, pluginOptions: any) {
        // Explicitly stamp dir="rtl" or dir="ltr" based on first strong character
        markdownIt.core.ruler.push('theme_studio_bidi_tagger', (state: any) => {
          const direction = readSetting(pluginOptions, 'direction', 'ltr');
          if (direction !== 'auto') return;

          const tokens = state.tokens;
          const len = tokens.length;

          for (let i = 0; i < len; i++) {
            const token = tokens[i];

            // 1. Paragraphs & Headings
            if (token.type === 'paragraph_open' || token.type === 'heading_open') {
              const inlineToken = tokens[i + 1];
              if (inlineToken && inlineToken.type === 'inline' && inlineToken.content) {
                token.attrSet('dir', isRtlContent(inlineToken.content) ? 'rtl' : 'ltr');
              }
            }

            // 2. Lists: evaluate the first item to give the <ul> / <ol> container the matching direction
            if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
              let listDir = 'ltr';
              for (let j = i + 1; j < len; j++) {
                if (tokens[j].type === 'bullet_list_close' || tokens[j].type === 'ordered_list_close') break;
                if (tokens[j].type === 'inline' && tokens[j].content) {
                  listDir = isRtlContent(tokens[j].content) ? 'rtl' : 'ltr';
                  break;
                }
              }
              token.attrSet('dir', listDir);
            }

            // 3. Individual List Items
            if (token.type === 'list_item_open') {
              for (let j = i + 1; j < len; j++) {
                if (tokens[j].type === 'list_item_close') break;
                if (tokens[j].type === 'inline' && tokens[j].content) {
                  token.attrSet('dir', isRtlContent(tokens[j].content) ? 'rtl' : 'ltr');
                  break;
                }
              }
            }

            // 4. Blockquotes
            if (token.type === 'blockquote_open') {
              for (let j = i + 1; j < len; j++) {
                if (tokens[j].type === 'blockquote_close') break;
                if (tokens[j].type === 'inline' && tokens[j].content) {
                  token.attrSet('dir', isRtlContent(tokens[j].content) ? 'rtl' : 'ltr');
                  break;
                }
              }
            }
          }
        });

        markdownIt.core.ruler.push('theme_studio_injector', (state: any) => {
          // Instant O(1) retrieval from memoized cache
          const css = getMemoizedViewerCss(pluginOptions);

          const token = new state.Token('html_block', '', 0);
          token.content = `<style id="joplin-theme-studio-styles">\n${css}\n</style>`;
          state.tokens.unshift(token);
        });
      },
    };
}
