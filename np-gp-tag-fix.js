/* NeonPlay R10 — gpTagDev undefined fix */
/* R20.7: Removidas tags HTML (<\/script><script>) que causavam SyntaxError */
/* NP-R10: Hide gpTagDev when developer is undefined */
window.addEventListener('load', function() {
  var el = document.getElementById('gpTagDev');
  if (el && (el.textContent.trim() === '🏢 undefined' || el.textContent.trim() === '🏢')) {
    el.style.display = 'none';
  }
  // Also observe for late bundle updates
  var mo = new MutationObserver(function() {
    var el2 = document.getElementById('gpTagDev');
    if (el2 && (el2.textContent.trim() === '🏢 undefined' || el2.textContent.trim() === '🏢')) {
      el2.style.display = 'none';
    } else if (el2 && el2.textContent.trim().length > 1) {
      el2.style.display = '';
    }
  });
  mo.observe(document.body, { subtree: true, characterData: true, childList: true });
  setTimeout(function() { mo.disconnect(); }, 10000);
});
