// Visitor counts with Microsoft Clarity (clarity.microsoft.com). Paste the project ID from
// Clarity > Settings > Overview between the quotes. Left empty, nothing loads and nothing is counted.
// If you change what this collects, update "Website visitors" in privacy.html too.
var CLARITY_ID = "";

if (CLARITY_ID) {
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_ID);
}
