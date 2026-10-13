module.exports = {
  default: function (context: any) {
    let cachedViewerCss = '';
    let cachedEditorCss = '';
    let cachedChromeCss = '';
    let cachedPanelCss = '';
    let isInitialized = false;

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

    function injectIntoIframes(viewerCss: string, panelCss: string): void {
      if (typeof document === 'undefined') return;

      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe: HTMLIFrameElement) => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc || !doc.head) return;

          // 1. Rich Text Editor (TinyMCE)
          if (
            doc.body?.id === 'tinymce' ||
            doc.querySelector('#tinymce') ||
            doc.body?.classList.contains('mce-content-body')
          ) {
            let styleEl = doc.getElementById('theme-studio-tinymce-styles') as HTMLStyleElement | null;
            if (!styleEl) {
              styleEl = doc.createElement('style');
              styleEl.id = 'theme-studio-tinymce-styles';
              doc.head.appendChild(styleEl);
            }
            if (viewerCss && styleEl.textContent !== viewerCss) {
              styleEl.textContent = viewerCss;
            }
          } else {
            // 2. Plugin Webview Panels (Outline, Note Tabs, etc.)
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
          // Cross-origin boundaries restrict document access; log any unexpected DOM issues
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

        // 3. Inject styles into TinyMCE and all Plugin Panels (Outline, etc.)
        injectIntoIframes(cachedViewerCss, cachedPanelCss);
      } catch (err) {
        console.warn('[Theme Studio] Failed to retrieve or update styles from main process:', err);
      }
    }

    return {
      plugin: async function (_codeMirror: any) {
        await updateStyles();

        // Prevent duplicate observers and event listeners on repeated note switches
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
            // Strictly ignore CodeMirror keystrokes and line updates; only react when an iframe mounts
            let hasIframeMutation = false;
            for (const mutation of mutations) {
              for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i];
                if (node.nodeType === 1) { // ELEMENT_NODE
                  if (node.nodeName === 'IFRAME' || (node as Element).querySelector?.('iframe')) {
                    hasIframeMutation = true;
                    break;
                  }
                }
              }
              if (hasIframeMutation) break;
            }

            if (!hasIframeMutation) return;

            // Batch and debounce iframe injections to avoid layout thrashing
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
