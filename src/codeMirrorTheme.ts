/**
 * Theme Studio – CodeMirror content script.
 *
 * Responsibilities (desktop):
 *   1. Inject the Markdown-editor stylesheet into the main document.
 *   2. Inject the viewer stylesheet into the TinyMCE (Rich Text) iframe.
 *   3. Inject the panel stylesheet into same-origin plugin-panel iframes.
 *
 * Responsibilities (mobile):
 *   1. Inject the Markdown-editor stylesheet. Nothing else – there are no
 *      iframes inside the mobile editor WebView, and no application shell.
 *
 * IMPORTANT – lifecycle:
 *   Joplin re-evaluates this script and calls `default(context)` for EVERY
 *   CodeMirror instance (see @joplin/editor PluginLoader). Any observer or
 *   listener created here therefore outlives the editor that created it.
 *   All long-lived state is kept in ONE per-window runtime object so that
 *   remounting the editor (Options round-trips, Rich Text <-> Markdown
 *   toggles, …) re-uses the existing observer instead of stacking new ones.
 */

interface StylePayload {
  editorCss: string;
  viewerCss: string;
  panelCss: string;
  platform: 'desktop' | 'mobile' | 'unknown';
}

interface ThemeStudioRuntime {
  viewerCss: string;
  editorCss: string;
  panelCss: string;
  isMobile: boolean;
  hooksInstalled: boolean;
  observer: MutationObserver | null;
  onFocus: (() => void) | null;
  rafId: number | null;
  inFlight: Promise<void> | null;
  watchedIframes: WeakSet<HTMLIFrameElement>;
  postMessage: ((message: unknown) => Promise<unknown>) | null;
}

const RUNTIME_KEY = '__joplinThemeStudioRuntime__';
const EDITOR_STYLE_ID = 'theme-studio-editor-styles';
const TINYMCE_STYLE_ID = 'theme-studio-tinymce-styles';
const PANEL_STYLE_ID = 'theme-studio-panel-styles';

// Selectors that identify a CodeMirror subtree. Mutations confined to it are
// keystrokes / cursor moves and never require an iframe re-scan.
const CODEMIRROR_SCOPE_SELECTOR = '.cm-editor, .cm-content, .CodeMirror-lines, .CodeMirror';

function getRuntime(): ThemeStudioRuntime {
  const host: any = typeof window !== 'undefined' ? window : globalThis;
  if (!host[RUNTIME_KEY]) {
    const runtime: ThemeStudioRuntime = {
      viewerCss: '',
      editorCss: '',
      panelCss: '',
      isMobile: false,
      hooksInstalled: false,
      observer: null,
      onFocus: null,
      rafId: null,
      inFlight: null,
      watchedIframes: new WeakSet<HTMLIFrameElement>(),
      postMessage: null,
    };
    host[RUNTIME_KEY] = runtime;
  }
  return host[RUNTIME_KEY] as ThemeStudioRuntime;
}

/** Create-or-update a <style> element. An empty `css` removes the element. */
function setStyle(doc: Document, id: string, css: string): void {
  if (!doc || !doc.head) return;
  let el = doc.getElementById(id) as HTMLStyleElement | null;

  if (!css) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }
  if (el.textContent !== css) {
    el.textContent = css;
  }
}

function isTinyMceDocument(doc: Document | null | undefined): boolean {
  if (!doc || !doc.body) return false;
  return doc.body.id === 'tinymce' || doc.body.classList.contains('mce-content-body');
}

function isTinyMceIframe(iframe: HTMLIFrameElement, doc: Document | null): boolean {
  return (
    iframe.classList.contains('tox-edit-area__iframe') ||
    (!!iframe.id && iframe.id.includes('tinymce')) ||
    !!iframe.closest('.tox, .tox-tinymce, .joplin-tinymce') ||
    isTinyMceDocument(doc)
  );
}

/**
 * Safely obtain a same-origin iframe document. Cross-origin frames (the note
 * viewer since Joplin 3.1, isolated plugin panels) yield null and are skipped.
 */
function getSameOriginDocument(iframe: HTMLIFrameElement): Document | null {
  try {
    return iframe.contentDocument || iframe.contentWindow?.document || null;
  } catch (_err) {
    return null;
  }
}

function applyTinyMceStyles(runtime: ThemeStudioRuntime, doc: Document | null): boolean {
  if (!isTinyMceDocument(doc) || !doc!.head) return false;
  setStyle(doc!, TINYMCE_STYLE_ID, runtime.viewerCss);
  return true;
}

/** TinyMCE builds its document asynchronously – poll briefly until it is ready. */
function watchTinyMceIframe(runtime: ThemeStudioRuntime, iframe: HTMLIFrameElement): void {
  if (runtime.watchedIframes.has(iframe)) return;
  runtime.watchedIframes.add(iframe);

  const maxAttempts = 40; // 40 × 50 ms = 2 s
  let attempts = 0;

  const stop = () => {
    clearInterval(intervalId);
    runtime.watchedIframes.delete(iframe);
  };

  const tryApply = (): boolean => {
    if (!iframe.isConnected) return true; // nothing left to do
    return applyTinyMceStyles(runtime, getSameOriginDocument(iframe));
  };

  const intervalId = setInterval(() => {
    attempts++;
    if (tryApply() || attempts >= maxAttempts) stop();
  }, 50);

  iframe.addEventListener(
    'load',
    () => {
      if (tryApply()) stop();
    },
    { once: true }
  );
}

function injectIntoIframes(runtime: ThemeStudioRuntime): void {
  if (runtime.isMobile || typeof document === 'undefined') return;

  const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe');
  for (let i = 0; i < iframes.length; i++) {
    const iframe = iframes[i];

    // Never touch Joplin's own note viewer. On Joplin >= 3.1 it is cross-origin
    // anyway; on older versions injecting panel CSS there would break
    // highlight.js colours and Mermaid fills.
    if (iframe.classList.contains('noteTextViewer')) continue;

    const doc = getSameOriginDocument(iframe);

    if (isTinyMceIframe(iframe, doc)) {
      if (!applyTinyMceStyles(runtime, doc)) {
        watchTinyMceIframe(runtime, iframe);
      }
      continue;
    }

    // Same-origin plugin panels (Outline, Note Tabs, …)
    if (doc && doc.head) {
      setStyle(doc, PANEL_STYLE_ID, runtime.panelCss);
    }
  }
}

function applyAll(runtime: ThemeStudioRuntime): void {
  if (typeof document === 'undefined') return;

  // 1. Markdown editor (CodeMirror 6 / 5). Empty CSS removes the element, so
  //    turning the setting off takes effect without a restart.
  setStyle(document, EDITOR_STYLE_ID, runtime.editorCss);

  // 2. Rich Text editor + plugin panels (desktop only).
  injectIntoIframes(runtime);
}

function updateStyles(runtime: ThemeStudioRuntime): Promise<void> {
  // Coalesce concurrent requests (window focus bursts, editor remount).
  if (runtime.inFlight) return runtime.inFlight;

  runtime.inFlight = (async () => {
    try {
      if (!runtime.postMessage) return;
      const res = (await runtime.postMessage({ type: 'getAllStyles' })) as StylePayload | null;
      if (!res) return;

      runtime.isMobile = res.platform === 'mobile';
      runtime.editorCss = res.editorCss || '';
      runtime.viewerCss = res.viewerCss || '';
      runtime.panelCss = runtime.isMobile ? '' : res.panelCss || '';

      applyAll(runtime);
    } catch (err) {
      console.warn('[Theme Studio] Failed to retrieve or apply styles:', err);
    } finally {
      runtime.inFlight = null;
    }
  })();

  return runtime.inFlight;
}

function isCodeMirrorMutation(mutation: MutationRecord): boolean {
  const target = mutation.target as Element | null;
  if (!target) return false;
  const el = target.nodeType === 1 ? target : (target.parentElement as Element | null);
  return !!el && !!el.closest(CODEMIRROR_SCOPE_SELECTOR);
}

/** Installed once per window, regardless of how many editors are created. */
function installGlobalHooks(runtime: ThemeStudioRuntime): void {
  if (runtime.hooksInstalled) return;
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) return;

  // Mobile: no iframes, no shell – the editor WebView is rebuilt on every
  // navigation, so a one-shot application in plugin() is all that is needed.
  if (runtime.isMobile) {
    runtime.hooksInstalled = true;
    return;
  }

  runtime.onFocus = () => {
    void updateStyles(runtime);
  };
  window.addEventListener('focus', runtime.onFocus);

  runtime.observer = new MutationObserver((mutations) => {
    // Keystrokes / cursor movement: every record lives inside CodeMirror.
    if (mutations.every(isCodeMirrorMutation)) return;

    // Something else changed (editor toggled, panel mounted, TinyMCE created):
    // re-scan iframes once per animation frame.
    if (runtime.rafId !== null) return;
    runtime.rafId = requestAnimationFrame(() => {
      runtime.rafId = null;
      if (runtime.viewerCss || runtime.panelCss) injectIntoIframes(runtime);
    });
  });
  runtime.observer.observe(document.body, { childList: true, subtree: true });

  runtime.hooksInstalled = true;
}

module.exports = {
  default: function (context: any) {
    const runtime = getRuntime();

    // Always talk through the newest editor's channel.
    runtime.postMessage = (message: unknown) => context.postMessage(message);

    return {
      plugin: async function (_codeMirror: any) {
        await updateStyles(runtime);
        installGlobalHooks(runtime);
      },
    };
  },
};
