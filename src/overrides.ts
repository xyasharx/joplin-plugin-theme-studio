/**
 * Per-note theme overrides.
 *
 * Users can pin a palette to notebooks or tags so that, for example, a
 * "work notes" notebook uses one palette while personal notes use another.
 * The active note's context (notebook chain + tags) is resolved by the main
 * process through the Joplin workspace/data APIs; this module holds the
 * parsing and matching logic as pure functions so it can be unit-tested
 * without Joplin.
 *
 * Override line format (one mapping per line, `#` comments and blank lines
 * are ignored):
 *   id:<notebookId>=<themeKey>       match by notebook ID
 *   title:<Notebook Title>=<themeKey> match by exact notebook title
 *   id:<tagId>=<themeKey>            match by tag ID
 *   title:<Tag Title>=<themeKey>     match by exact tag title
 */

export type OverrideKind = 'notebook' | 'tag';

export interface ParsedOverride {
  /** 'id' or 'title' */
  match: 'id' | 'title';
  /** The notebook/tag id or title to match. */
  value: string;
  /** The theme key to apply when matched. */
  themeKey: string;
  /** 1-based line number, for error reporting. */
  line: number;
}

export interface OverrideParseResult {
  overrides: ParsedOverride[];
  errors: string[];
}

const THEME_KEY = /^[a-z0-9][a-z0-9._:-]*$/i;

export function parseOverrideLines(text: string, kind: OverrideKind): OverrideParseResult {
  const overrides: ParsedOverride[] = [];
  const errors: string[] = [];
  const lines = String(text || '').split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const lineNo = index + 1;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0 || eqIndex === line.length - 1) {
      errors.push(`Line ${lineNo}: expected format "id:<value>=<themeKey>" or "title:<value>=<themeKey>"`);
      return;
    }

    const left = line.slice(0, eqIndex).trim();
    const themeKey = line.slice(eqIndex + 1).trim();

    const colonIndex = left.indexOf(':');
    if (colonIndex <= 0) {
      errors.push(`Line ${lineNo}: missing "id:" or "title:" prefix`);
      return;
    }

    const match = left.slice(0, colonIndex).toLowerCase();
    const value = left.slice(colonIndex + 1).trim();
    if (match !== 'id' && match !== 'title') {
      errors.push(`Line ${lineNo}: unknown prefix "${match}:"; use "id:" or "title:"`);
      return;
    }
    if (!value) {
      errors.push(`Line ${lineNo}: empty ${kind} value after the prefix`);
      return;
    }
    if (!THEME_KEY.test(themeKey)) {
      errors.push(`Line ${lineNo}: invalid theme key "${themeKey}"`);
      return;
    }

    overrides.push({ match, value, themeKey, line: lineNo });
  });

  return { overrides, errors };
}

export interface NoteContext {
  /** Notebook chain from the note's own notebook up to the root, nearest first. */
  notebooks: { id: string; title: string }[];
  /** Tags attached to the note. */
  tags: { id: string; title: string }[];
}

export interface OverrideResolution {
  themeKey: string;
  source: 'notebook' | 'tag' | 'default';
  /** Human-readable description of what matched, for diagnostics. */
  matched: string;
}

function matchOverride(overrides: ParsedOverride[], ids: string[], titles: string[]): ParsedOverride | null {
  for (const override of overrides) {
    if (override.match === 'id' && ids.includes(override.value)) return override;
  }
  for (const override of overrides) {
    if (override.match === 'title' && titles.some((title) => title.trim().toLowerCase() === override.value.toLowerCase())) {
      return override;
    }
  }
  return null;
}

/**
 * Resolve the effective theme for a note. Notebook overrides win over tag
 * overrides; within each kind, the first matching entry wins (overrides are
 * evaluated in declaration order, and the notebook chain is ordered nearest
 * first so nested notebooks take precedence over their parents).
 */
export function resolveThemeOverride(
  noteContext: NoteContext,
  overrides: { notebook: ParsedOverride[]; tag: ParsedOverride[] },
  defaultTheme: string,
): OverrideResolution {
  const notebookIds = noteContext.notebooks.map((n) => n.id);
  const notebookTitles = noteContext.notebooks.map((n) => n.title);
  const tagIds = noteContext.tags.map((t) => t.id);
  const tagTitles = noteContext.tags.map((t) => t.title);

  const notebookMatch = matchOverride(overrides.notebook, notebookIds, notebookTitles);
  if (notebookMatch) {
    return { themeKey: notebookMatch.themeKey, source: 'notebook', matched: `notebook ${notebookMatch.value}` };
  }

  const tagMatch = matchOverride(overrides.tag, tagIds, tagTitles);
  if (tagMatch) {
    return { themeKey: tagMatch.themeKey, source: 'tag', matched: `tag ${tagMatch.value}` };
  }

  return { themeKey: defaultTheme, source: 'default', matched: 'default theme' };
}
