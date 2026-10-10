module.exports = {
  default: function (context: any) {
    let cachedViewerCss = '';
    let cachedEditorCss = '';

    function injectIntoTinyMCE(css: string): void {
      if (typeof document === 'undefined' || !css) return;

      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe: HTMLIFrameElement) => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (
            doc &&
            (doc.body?.id === 'tinymce' ||
              doc.querySelector('#tinymce') ||
              doc.body?.classList.contains('mce-content-body'))
          ) {
            let styleEl = doc.getElementById('theme-studio-tinymce-styles') as HTMLStyleElement | null;
            if (!styleEl) {
              styleEl = doc.createElement('style');
              styleEl.id = 'theme-studio-tinymce-styles';
              doc.head.appendChild(styleEl);
            }
            if (styleEl.textContent !== css) {
              styleEl.textContent = css;
            }
          }
        } catch (_err) {
          // Cross-origin boundaries (if any exist) are safely ignored
        }
      });
    }

    async function updateStyles(): Promise<void> {
      try {
        const res: { editorCss: string; viewerCss: string } | null = await context.postMessage({
          type: 'getAllStyles',
        });
        if (!res) return;

        const { editorCss, viewerCss } = res;

        // 1. Apply to Markdown Editor (CodeMirror 6 / 5) & Outer TinyMCE Chrome
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

        // 2. Apply to Rich Text Editor (TinyMCE iframe document)
        if (viewerCss) {
          cachedViewerCss = viewerCss;
          injectIntoTinyMCE(viewerCss);
        }
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

        // Detect when Joplin swaps the DOM view between Markdown and Rich Text editor
        if (typeof document !== 'undefined' && document.body) {
          const observer = new MutationObserver(() => {
            if (cachedViewerCss) {
              injectIntoTinyMCE(cachedViewerCss);
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }
      },
    };
  },
};
