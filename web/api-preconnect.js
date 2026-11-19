// Opens the API connection while the page is still loading. Must match cloudConfig.projectUrl (tested).
(function () {
  var link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://iyapppmeieqhflnzslao.supabase.co';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}());
