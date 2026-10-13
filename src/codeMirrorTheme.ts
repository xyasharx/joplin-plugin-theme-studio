module.exports = {
  default: function (context: any) {
    let cachedViewerCss = '';
    let cachedEditorCss = '';
    let cachedChromeCss = '';
    let cachedPanelCss = '';
    let isInitialized = false;

    const watchedIframes = new WeakSet<HTMLIFrameElement>();

    function computePanelCss(chromeCss: string): string {
      if (!chromeCss) return '';
      return `
        ${chromeCss}
        :root {
          --joplin-background-color: var(--od-bg) !important;
          --joplin-background-color-transparent30: var(--od-selection) !important;
          --joplin-color: var(--od-fg) !important;
          --joplin-color-hover: var(--od-link) !important;
          --joplin-divider-color: var(--od-border) !important;
        }
        *, *::before, *::after {
          border-color: var(--od-border) !important;
        }
        body, html, #root, #app, .panel, header, .header, nav, .toolbar, .search-container, .top-bar {
          background-color: var(--od-bg) !important;
          color: var(--od-fg) !important;
        }
        header, .header, nav, .toolbar, .search-container, .top-bar, .search-box {
          background-color: var(--od-bg-alt) !important;
          border-bottom: 1px solid var(--od-border) !important;
        }
        input, input[type="text"], input[type="search"] {
          background-color: var(--od-bg) !important;
          color: var(--od-fg) !important;
          border: 1px solid var(--od-border) !important;
        }
        a, span, div, li, p, i, button {
          color: var(--od-fg) !important;
        }
        svg, path {
          fill: var(--od-fg) !important;
          color: var(--od-fg) !important;
        }
        a:hover, .header-list-item:hover, li:hover {
          background-color: var(--od-selection) !important;
        }
      `;
    }

    function applyTinyMceStyles(doc: Document): boolean {
      if (!doc || !doc.head) return false;
      const isReady =
        doc.body?.id === 'tinymce' ||
        doc.body?.classList?.contains('mce-content-body') ||
        !!doc.querySelector?.('#tinymce');

      if (!isReady) return false;

      let styleEl = doc.getElementById('theme-studio-tinymce-styles') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = 'theme-studio-tinymce-styles';
        doc.head.appendChild(styleEl);
      }
      if (cachedViewerCss && styleEl.textContent !== cachedViewerCss) {
        styleEl.textContent = cachedViewerCss;
      }
      return true;
    }

    function watchTinyMceIframe(iframe: HTMLIFrameElement): void {
      if (watchedIframes.has(iframe)) return;
      watchedIframes.add(iframe);

      let attempts = 0;
      const maxAttempts = 30; // 30 * 50ms = 1.5 seconds maximum timeout

      const intervalId = setInterval(() => {
        attempts++;
        try {
          if (!iframe.isConnected) {
            clearInterval(intervalId);
            watchedIframes.delete(iframe);
            return;
          }

          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc && applyTinyMceStyles(doc)) {
            clearInterval(intervalId);
            return;
          }
        } catch (_err) {
          // Ignore transient security boundaries during document initialization
        }

        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
        }
      }, 50);

      iframe.addEventListener(
        'load',
        () => {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc && applyTinyMceStyles(doc)) {
              clearInterval(intervalId);
            }
          } catch (_err) {}
        },
        { once: true }
      );
    }

    function injectIntoIframes(viewerCss: string, panelCss: string): void {
      if (typeof document === 'undefined') return;

      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe: HTMLIFrameElement) => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;

          const isTinyMce =
            iframe.classList?.contains('tox-edit-area__iframe') ||
            iframe.id?.includes('tinymce') ||
            !!iframe.closest?.('.tox, .tox-tinymce, .joplin-tinymce') ||
            doc?.body?.id === 'tinymce' ||
            doc?.body?.classList?.contains('mce-content-body') ||
            !!doc?.querySelector?.('#tinymce');

          if (isTinyMce) {
            if (!doc || !applyTinyMceStyles(doc)) {
              watchTinyMceIframe(iframe);
            }
          } else if (doc && doc.head) {
            // Plugin Webview Panels (Outline, Note Tabs, etc.)
            let panelStyleEl = doc.getElementById('theme-studio-panel-styles') as HTMLStyleElement | null;
            if (!panelStyleEl) {
              panelStyleEl = doc.createElement('style');
              panelStyleEl.id = 'theme-studio-panel-styles';
              doc.head.appendChild(panelStyleEl);
            }
            if (panelCss) {
              if (panelStyleEl.textContent !== panelCss) {
                panelStyleEl.textContent = panelCss;
              }
            } else if (panelStyleEl.textContent) {
              panelStyleEl.textContent = '';
            }
          }
        } catch (err) {
          if (!(err instanceof DOMException && err.name === 'SecurityError')) {
            console.debug('[Theme Studio] Could not inject styles into iframe:', err);
          }
        }
      });
    }

    async function updateStyles(): Promise<void> {
      try {
        const res: { editorCss: string; viewerCss: string; chromeCss?: string } | null = await context.postMessage({
          type: 'getAllStyles',
        });
        if (!res) return;

        const { editorCss, viewerCss, chromeCss } = res;
        cachedViewerCss = viewerCss || '';
        const newChromeCss = chromeCss || '';

        if (newChromeCss !== cachedChromeCss) {
          cachedChromeCss = newChromeCss;
          cachedPanelCss = computePanelCss(cachedChromeCss);
        }

        // 1. Apply to Markdown Editor (CodeMirror 6 / 5)
        if (editorCss && editorCss !== cachedEditorCss && typeof document !== 'undefined') {
          cachedEditorCss = editorCss;
          let styleEl = document.getElementById('theme-studio-editor-styles') as HTMLStyleElement | null;
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'theme-studio-editor-styles';
            document.head.appendChild(styleEl);
          }
          if (styleEl.textContent !== editorCss) {
            styleEl.textContent = editorCss;
          }
        }

        // 2. Apply to Application Shell in real-time
        if (typeof document !== 'undefined') {
          let chromeStyleEl = document.getElementById('theme-studio-chrome-styles') as HTMLStyleElement | null;
          if (cachedChromeCss) {
            if (!chromeStyleEl) {
              chromeStyleEl = document.createElement('style');
              chromeStyleEl.id = 'theme-studio-chrome-styles';
              document.head.appendChild(chromeStyleEl);
            }
            if (chromeStyleEl.textContent !== cachedChromeCss) {
              chromeStyleEl.textContent = cachedChromeCss;
            }
          } else if (chromeStyleEl) {
            chromeStyleEl.textContent = '';
          }
        }

        // 3. Inject styles into TinyMCE and all Plugin Panels
        injectIntoIframes(cachedViewerCss, cachedPanelCss);
      } catch (err) {
        console.warn('[Theme Studio] Failed to retrieve or update styles from main process:', err);
      }
    }

    function isCodeMirrorKeystrokeMutation(mutation: MutationRecord): boolean {
      const target = mutation.target as HTMLElement | null;
      if (!target) return false;
      return !!(
        target.closest?.('.cm-editor, .cm-content, .CodeMirror-lines, .CodeMirror') ||
        target.classList?.contains?.('cm-line')
      );
    }

    return {
      plugin: async function (_codeMirror: any) {
        await updateStyles();

        if (isInitialized) {
          return;
        }
        isInitialized = true;

        if (typeof window !== 'undefined') {
          window.addEventListener('focus', updateStyles);
        }

        if (typeof document !== 'undefined' && document.body) {
          let rafId: number | null = null;
          const observer = new MutationObserver((mutations: MutationRecord[]) => {
            // If all mutations occurred strictly inside CodeMirror text nodes, bypass entirely
            const isAllCodeMirror = mutations.every(isCodeMirrorKeystrokeMutation);
            if (isAllCodeMirror) {
              return;
            }

            // Batched synchronization for editor toggles, sidebar clicks, and panel insertions
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
              rafId = null;
              if (cachedViewerCss || cachedPanelCss) {
                injectIntoIframes(cachedViewerCss, cachedPanelCss);
              }
            });
          });

          observer.observe(document.body, { childList: true, subtree: true });
        }
      },
    };
  },
};
