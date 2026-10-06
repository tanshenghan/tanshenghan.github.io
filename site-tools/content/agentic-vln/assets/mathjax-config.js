// Typeset local LaTeX sources; retain native MathML if scripts cannot run.
window.MathJax = {
  tex: { displayMath: [['$$', '$$']] },
  svg: { fontCache: 'local' },
  options: { enableMenu: false },
  startup: {
    typeset: false,
    pageReady: function () {
      return MathJax.startup.defaultPageReady().then(function () {
        var sources = Array.from(document.querySelectorAll('.math-source'));
        return MathJax.typesetPromise(sources).then(function () {
          sources.forEach(function (source) {
            if (source.querySelector('svg') && !source.querySelector('[data-mml-node="merror"]')) {
              source.hidden = false;
              source.parentElement.querySelector('.math-fallback').style.display = 'none';
            }
          });
        });
      }).catch(function (error) {
        console.warn('MathJax rendering unavailable; keeping native MathML.', error);
      });
    }
  }
};
