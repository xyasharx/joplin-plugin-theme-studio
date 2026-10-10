module.exports = {
  default: function (context: any) {
    let cachedCss = '';

    async function updateEditorStyles() {
      try {
        const css: string = await context.postMessage({ type: 'getEditorStyles' });
        if (css && css !== cachedCss && typeof document !== 'undefined') {
          cachedCss = css;
          let styleEl = document.getElementById('theme-studio-editor-styles') as HTMLStyleElement;
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'theme-studio-editor-styles';
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = css;
        }
      } catch (_err) {
        // Silently handle if disconnected
      }
    }

    return {
      plugin: async function (_codeMirror: any) {
        await updateEditorStyles();
        if (typeof window !== 'undefined') {
          window.addEventListener('focus', updateEditorStyles);
        }
      },
    };
  },
};
