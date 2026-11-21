/**
 * Palette generation and import/export utilities.
 *
 * A palette can be authored two ways:
 *  - **Builder**: three base colours (background, foreground, accent) are
 *    expanded into a complete ThemePalette with a deterministic colour
 *    derivation (hue rotations for the heading scale, luminance mixes for
 *    chrome surfaces, alpha tints for selection/mark).
 *  - **Import**: a full palette object (all `--od-*` variables) or a base
 *    object, validated before it joins the runtime registry.
 *
 * Pure module: no Joplin API, no side effects, fully unit-testable.
 */

import type { ThemePalette } from './themes';

/** Every `--od-*` variable a palette must define to be complete. */
export const PALETTE_REQUIRED_VARS = [
  '--od-bg',
  '--od-fg',
  '--od-bg-alt',
  '--od-border',
  '--od-comment',
  '--od-h1',
  '--od-h2',
  '--od-h3',
  '--od-h4',
  '--od-h5',
  '--od-h6',
  '--od-link',
  '--od-link-hover',
  '--od-code-bg',
  '--od-code-fg',
  '--od-pre-bg',
  '--od-pre-border',
  '--od-table-even',
  '--od-table-odd',
  '--od-table-th',
  '--od-scrollbar-track',
  '--od-scrollbar-thumb',
  '--od-scrollbar-hover',
  '--od-mermaid-bg',
  '--od-mermaid-border',
  '--od-selection',
  '--od-mark-bg',
  '--od-kbd-bg',
] as const;

export interface BaseColors {
  bg: string;
  fg: string;
  accent: string;
}

export interface PaletteValidation {
  ok: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as [number, number, number];
}

export function rgbToHsl(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [Math.round(channel(hue + 1 / 3) * 255), Math.round(channel(hue) * 255), Math.round(channel(hue - 1 / 3) * 255)];
}

export function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** Linear mix of two hex colours. `amount` 0 = a, 1 = b. */
export function mixHex(a: string, b: string, amount: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const mix = (x: number, y: number): number => Math.round(x + (y - x) * amount);
  return '#' + [0, 1, 2].map((i) => mix(ca[i], cb[i]).toString(16).padStart(2, '0')).join('');
}

/** Rotate a hex colour's hue by `degrees`, keeping saturation and lightness. */
export function rotateHue(hex: string, degrees: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(rgb);
  return hslToHex(h + degrees, s, l);
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return 1;
  const [hi, lo] = [relativeLuminance(ca), relativeLuminance(cb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Nudge a colour towards black or white until it reaches `minRatio` against `background`. */
export function ensureContrast(color: string, background: string, minRatio = 3): string {
  const fg = hexToRgb(color);
  const bg = hexToRgb(background);
  if (!fg || !bg || contrastRatio(color, background) >= minRatio) return color;

  const lighten = relativeLuminance(bg) < 0.5;
  const target: [number, number, number] = lighten ? [255, 255, 255] : [0, 0, 0];
  const step = lighten ? 1 : -1;
  for (let i = 0; i < 255; i++) {
    const candidate: [number, number, number] = [
      Math.max(0, Math.min(255, fg[0] + step * i)),
      Math.max(0, Math.min(255, fg[1] + step * i)),
      Math.max(0, Math.min(255, fg[2] + step * i)),
    ];
    const hex = '#' + candidate.map((c) => c.toString(16).padStart(2, '0')).join('');
    if (contrastRatio(hex, background) >= minRatio) return hex;
  }
  return target.length ? color : color;
}

export function isDarkColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  return rgb ? relativeLuminance(rgb) < 0.5 : true;
}

// ---------------------------------------------------------------------------
// Palette generation
// ---------------------------------------------------------------------------

/**
 * Expand three base colours into a complete ThemePalette. The derivation is
 * deterministic so the same inputs always produce the same stylesheet.
 */
export function generatePalette(name: string, base: BaseColors): ThemePalette {
  const bg = base.bg;
  const fg = base.fg;
  const accent = base.accent;
  const isDark = isDarkColor(bg);

  const bgAlt = mixHex(bg, fg, isDark ? 0.08 : 0.06);
  const comment = mixHex(fg, bg, isDark ? 0.45 : 0.4);

  // Heading scale: the accent plus a hue-rotated companion family. Rotations
  // stay modest so the family reads as one palette rather than rainbow noise.
  const h1 = accent;
  const h2 = rotateHue(accent, -28);
  const h3 = rotateHue(accent, 36);
  const h4 = rotateHue(accent, -52);
  const h5 = rotateHue(accent, 64);
  const h6 = rotateHue(accent, 96);

  const codeBg = bgAlt;
  const codeFg = ensureContrast(h1, codeBg);

  const tableTh = mixHex(bg, fg, isDark ? 0.15 : 0.12);
  const scrollbarThumb = mixHex(fg, bg, isDark ? 0.55 : 0.5);
  const scrollbarHover = mixHex(fg, bg, isDark ? 0.45 : 0.4);
  const markBg = mixHex(accent, bg, isDark ? 0.78 : 0.72);

  const variables: Record<string, string> = {
    '--od-bg': bg,
    '--od-fg': fg,
    '--od-bg-alt': bgAlt,
    '--od-border': bgAlt,
    '--od-comment': comment,
    '--od-h1': h1,
    '--od-h2': h2,
    '--od-h3': h3,
    '--od-h4': h4,
    '--od-h5': h5,
    '--od-h6': h6,
    '--od-link': accent,
    '--od-link-hover': rotateHue(accent, 24),
    '--od-code-bg': codeBg,
    '--od-code-fg': codeFg,
    '--od-pre-bg': bgAlt,
    '--od-pre-border': bgAlt,
    '--od-table-even': bgAlt,
    '--od-table-odd': bg,
    '--od-table-th': tableTh,
    '--od-scrollbar-track': bgAlt,
    '--od-scrollbar-thumb': scrollbarThumb,
    '--od-scrollbar-hover': scrollbarHover,
    '--od-mermaid-bg': bgAlt,
    '--od-mermaid-border': bgAlt,
    '--od-selection': withAlpha(accent, 0.25),
    '--od-mark-bg': markBg,
    '--od-kbd-bg': bgAlt,
  };

  return { name, isDark, variables };
}

// ---------------------------------------------------------------------------
// Validation / import / export
// ---------------------------------------------------------------------------

const COLOR_VALUE = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))$/;

export function validatePalette(input: any, label = 'palette'): PaletteValidation {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: [`${label}: expected an object`] };
  }
  if (typeof input.name !== 'string' || !input.name.trim()) {
    errors.push(`${label}: "name" must be a non-empty string`);
  }
  if (typeof input.isDark !== 'boolean') {
    errors.push(`${label}: "isDark" must be a boolean`);
  }
  if (!input.variables || typeof input.variables !== 'object' || Array.isArray(input.variables)) {
    errors.push(`${label}: "variables" must be an object`);
    return { ok: false, errors };
  }
  for (const key of PALETTE_REQUIRED_VARS) {
    const value = input.variables[key];
    if (typeof value !== 'string' || !COLOR_VALUE.test(value)) {
      errors.push(`${label}: missing or invalid "${key}"`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Parse an imported JSON payload. Accepts a JSON array of palette objects
 * (full `variables` or `base` colours, which are expanded) or a single object.
 * Returns validated, name-sanitized palettes plus any errors.
 */
export function parsePaletteJson(json: string): { palettes: ThemePalette[]; errors: string[] } {
  const errors: string[] = [];
  const palettes: ThemePalette[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return { palettes, errors: [`Invalid JSON: ${(err as Error).message}`] };
  }

  // Accept a bare array, a single palette object, or a { "palettes": [...] }
  // wrapper (the shape exportPalettes round-trips through).
  let entries: any[];
  if (Array.isArray(parsed)) {
    entries = parsed;
  } else if (parsed && Array.isArray(parsed.palettes)) {
    entries = parsed.palettes;
  } else {
    entries = [parsed];
  }
  if (entries.length === 0) {
    return { palettes, errors: ['The JSON payload is an empty array'] };
  }

  entries.forEach((entry: any, index: number) => {
    const label = `palette ${index + 1}`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${label}: expected an object`);
      return;
    }

    let palette: ThemePalette;
    if (entry.base && typeof entry.base === 'object') {
      const base = entry.base;
      const baseErrors: string[] = [];
      for (const key of ['bg', 'fg', 'accent'] as const) {
        if (typeof base[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(base[key])) {
          baseErrors.push(`${label}: base.${key} must be a #RRGGBB colour`);
        }
      }
      if (baseErrors.length) {
        errors.push(...baseErrors);
        return;
      }
      const isDark = typeof entry.isDark === 'boolean' ? entry.isDark : isDarkColor(base.bg);
      palette = generatePalette(String(entry.name || 'Imported'), { bg: base.bg, fg: base.fg, accent: base.accent });
      palette.isDark = isDark;
    } else {
      const validation = validatePalette(entry, label);
      if (!validation.ok) {
        errors.push(...validation.errors);
        return;
      }
      palette = {
        name: String(entry.name),
        isDark: entry.isDark,
        variables: { ...entry.variables },
      };
    }

    palettes.push(palette);
  });

  return { palettes, errors };
}

/** Serialize palettes (full definitions) to the shareable JSON format. */
export function exportPalettes(palettes: ThemePalette[]): string {
  const payload = palettes.map((palette) => ({
    name: palette.name,
    isDark: palette.isDark,
    variables: { ...palette.variables },
  }));
  return JSON.stringify(payload, null, 2);
}

/** Stable, URL-safe theme key for an imported palette name. */
export function sanitizePaletteName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
