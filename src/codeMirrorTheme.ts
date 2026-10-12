module.exports = {
  default: function (context: any) {
    let cachedViewerCss = '';
    let cachedEditorCss = '';
    let cachedChromeCss = '';

    function injectIntoIframes(viewerCss: string, chromeCss: string): void {
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
            // 2. Plugin Panels (Outline, Note Tabs, etc.)
            let panelStyleEl = doc.getElementById('theme-studio-panel-styles') as HTMLStyleElement | null;
            if (!panelStyleEl) {
              panelStyleEl = doc.createElement('style');
              panelStyleEl.id = 'theme-studio-panel-styles';
              doc.head.appendChild(panelStyleEl);
            }
            if (chromeCss) {
              const panelCss = `
                ${chromeCss}
                body, html, #root, #app, .panel, header, .header {
                  background-color: var(--od-bg) !important;
                  color: var(--od-fg) !important;
                }
                header, .header, .search-container, .top-bar {
                  background-color: var(--od-bg-alt) !important;
                  border-bottom: 1px solid var(--od-border) !important;
                }
                input {
                  background-color: var(--od-bg) !important;
                  color: var(--od-fg) !important;
                  border: 1px solid var(--od-border) !important;
                }
                a, span, div, li, p, i, input {
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
              if (panelStyleEl.textContent !== panelCss) {
                panelStyleEl.textContent = panelCss;
              }
            } else if (panelStyleEl.textContent) {
              panelStyleEl.textContent = '';
            }
          }
        } catch (_err) {
          // Cross-origin boundaries are safely ignored
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
        cachedViewerCss = viewerCss;
        cachedChromeCss = chromeCss || '';

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

        // 2. Apply to Application Shell (Sidebar, Note List, Toolbars, Headers) in real-time
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

        // 3. Inject styles into TinyMCE and all Plugin Panels (e.g., Outline)
        injectIntoIframes(cachedViewerCss, cachedChromeCss);
      } catch (_err) {
        // Silently recover if messaging is disconnected during note transition
      }
    }

    return {
      plugin: async function (_codeMirror: any) {
        await updateStyles();

        if (typeof window !== 'undefined') {
          window.addEventListener('focus', updateStyles);
        }

        if (typeof document !== 'undefined' && document.body) {
          const observer = new MutationObserver(() => {
            if (cachedViewerCss || cachedChromeCss) {
              injectIntoIframes(cachedViewerCss, cachedChromeCss);
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }
      },
    };
  },
};
