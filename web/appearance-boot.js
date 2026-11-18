// Applies the saved appearance before first paint so pages never flash the
// default palette (sage) before navigation.js applies the learner's choice.
// Classic synchronous script loaded in <head>; mirrors validatePreferences()
// in src/domain/app-navigation.js for theme, palette and surfaceStyle only.
(function () {
  var root = document.documentElement;
  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('mlos-navigation-v1') || '{}') || {}; } catch (error) { prefs = {}; }
  root.dataset.appearance = prefs.theme === 'dark' ? 'dark' : 'light';
  root.dataset.palette = prefs.palette === 'lavender_precision' ? 'lavender_precision' : 'sage_precision';
  root.dataset.surfaceStyle = prefs.surfaceStyle === 'glass' ? 'glass' : 'standard';
}());
