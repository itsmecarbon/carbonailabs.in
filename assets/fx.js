/* Carbon AI Labs FX layer. Plain JS, no libraries. Pairs with fx.css and motion.js.
   Turns on when <html data-fx="labs|studio|desk">.
   - hero: eclipse horizon that rises and brightens as you scroll, light beams, pointer light
   - hero h1: words arrive out of a blur
   - [data-fx-tilt] (finder panel, product grids): starts tilted back, flattens as it scrolls in;
     the hero panel then grows 4% and lifts 40px as the hero scrolls away (desktop)
   - cards: spotlight and border glow that follow the pointer
   - main buttons: lean a few pixels toward the pointer
   - thin scroll progress bar, glass header that firms up after scrolling
   Reduced motion: the glow is drawn but nothing moves. */
(function () {
  var root = document.documentElement;
  if (!root.hasAttribute('data-fx')) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; e.setAttribute('aria-hidden', 'true'); return e; }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // split the hero heading into words, keeping inner spans (brand colours) and <br>
  function splitWords(h) {
    var n = 0, walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (t) {
      var parts = t.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        var s = document.createElement('span'); s.className = 'fx-w'; s.style.setProperty('--w', n++); s.textContent = p; frag.appendChild(s);
      });
      t.parentNode.replaceChild(frag, t);
    });
  }

  function init() {
    var bar = el('div', 'fx-progress'); document.body.appendChild(bar);
    var top = document.querySelector('.top');
    var hero = document.querySelector('.hero');
    var cursor = null;

    if (hero) {
      hero.classList.add('fx-stage');
      var layer = el('div', 'fx-layer');
      layer.appendChild(el('div', 'fx-beams', '<span></span><span></span><span></span>'));
      layer.appendChild(el('div', 'fx-sun', '<i class="glow"></i><i class="disc"></i><i class="rim"></i><i class="flare"></i>'));
      if (finePointer && !reduce) { cursor = el('div', 'fx-cursor'); layer.appendChild(cursor); }
      hero.insertBefore(layer, hero.querySelector('.wrap'));
      // Studio / Desk: anchor the sun to the glass panel so it rises behind it, as in the reference
      var panel = hero.querySelector('.finder'), sun = layer.querySelector('.fx-sun');
      function anchor() {
        if (!panel) return;
        var hr = hero.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        sun.style.setProperty('--sun-top', Math.round(pr.top - hr.top + 40) + 'px');
      }
      if (panel) { hero.classList.add('fx-anchored'); anchor(); window.addEventListener('resize', anchor); window.addEventListener('load', anchor); }
      var h1 = hero.querySelector('h1');
      if (h1 && root.classList.contains('motion')) splitWords(h1);

      // pause the hero loops when it is off screen
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
        es.forEach(function (e) { hero.classList.toggle('fx-paused', !e.isIntersecting); });
      }).observe(hero);

      if (cursor) {
        var tx = 0, ty = 0, cx = 0, cy = 0, moving = false;
        hero.addEventListener('pointermove', function (e) {
          var r = hero.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top;
          hero.classList.add('fx-hover');
          if (!moving) { moving = true; requestAnimationFrame(follow); }
        });
        hero.addEventListener('pointerleave', function () { hero.classList.remove('fx-hover'); });
        function follow() {
          cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
          cursor.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
          if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5) requestAnimationFrame(follow); else moving = false;
        }
      }
    }

    // panels that flatten on scroll
    var tilts = [];
    if (!reduce) each('[data-fx-tilt]', function (t) {
      if (t.parentElement) t.parentElement.style.perspective = '1400px';
      tilts.push(t);
    });

    // spotlight cards
    if (finePointer) each('.product, .promise, .edition, .service, .pack, .finder', function (c) {
      c.classList.add('fx-card');
      c.appendChild(el('span', 'fx-spot'));
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    // magnetic main buttons
    if (finePointer && !reduce) each('.btn, .studio-band .go, .top nav .pill', function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.translate = (dx * 6).toFixed(1) + 'px ' + (dy * 5).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });

    // one scroll loop for progress, header, eclipse and tilts
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset, vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
      bar.style.setProperty('--sp', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0);
      if (top) top.classList.toggle('fx-scrolled', y > 12);
      var hp = 0;
      if (hero && !reduce) {
        var hh = hero.offsetHeight || 1;
        hp = clamp(y / (hh * 0.8), 0, 1);
        hero.style.setProperty('--p', hp.toFixed(3));
      }
      var wide = window.innerWidth > 720;
      for (var i = 0; i < tilts.length; i++) {
        var t = tilts[i], r = t.getBoundingClientRect();
        var q = clamp((vh - r.top) / (vh * 0.75), 0, 1);  // 0 just below the fold, 1 well inside
        // the hero's app panel then comes toward you as the page scrolls (RedSun: +5% and ~57px up over the hero)
        var lift = wide && hero && hero.contains(t) ? hp : 0;
        var ease = 1 - Math.pow(1 - q, 3);
        t.style.rotate = q >= 1 ? '' : 'x ' + ((1 - ease) * 16).toFixed(2) + 'deg';
        var sc = (0.94 + 0.06 * ease) * (1 + 0.04 * lift);
        t.style.scale = Math.abs(sc - 1) < 0.0005 ? '' : sc.toFixed(4);
        t.style.translate = lift ? '0 ' + (-40 * lift).toFixed(1) + 'px' : '';
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
