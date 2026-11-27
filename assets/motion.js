/* Carbon AI Labs motion layer. Plain JS, no libraries.
   - .rv / .rv-fade / .grow-x / .art: revealed once when scrolled into view
   - [data-wave]: hexagon grid with a slow wave rippling through it drawn on a canvas (colours from data-ink / data-acc)
   - [data-art="fan|orbit|globe"]: small line drawing that draws itself
   - [data-type]: the text types itself out with a blinking cursor (screen readers get the full text)
   - [data-marquee]: text strip that scrolls slowly
   Reduced motion: nothing hides, nothing moves. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  // data-motion-off: the head script gave up waiting for this file (very slow load), so keep the page still
  if (!reduce && 'IntersectionObserver' in window && !root.hasAttribute('data-motion-off')) root.classList.add('motion');
  window.__motionReady = true; // the head script hid content early; tell it motion.js is running

  var SVGNS = 'http://www.w3.org/2000/svg';
  var ART = {
    fan: function () {
      var s = '';
      for (var i = 0; i < 9; i++) {
        var y = 12 + i * 12;
        s += '<path class="d' + (i % 2 ? ' soft' : '') + '" id="f' + i + '" pathLength="1" style="--k:' + i + '" d="M14 ' + y + ' C 84 ' + y + ', 104 60, 142 60"/>';
      }
      s += '<path class="d" pathLength="1" style="--k:10" d="M156 60 L206 60"/>';
      s += '<circle class="node" cx="149" cy="60" r="6"/><circle class="acc" cx="210" cy="60" r="3.5"/>';
      [1, 4, 7].forEach(function (i, n) {
        s += '<circle class="acc" r="2.2"><animateMotion dur="2.6s" begin="' + (n * 0.85) + 's" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".4 0 .2 1"><mpath href="#f' + i + '"/></animateMotion></circle>';
      });
      return s;
    },
    orbit: function () {
      var s = '<circle class="d" pathLength="1" cx="120" cy="60" r="44"/>';
      s += '<circle class="d soft" pathLength="1" style="--k:4" cx="120" cy="60" r="26"/>';
      [[120, 16], [164, 60], [120, 104], [76, 60]].forEach(function (p) {
        s += '<circle class="node" cx="' + p[0] + '" cy="' + p[1] + '" r="4.5"/>';
      });
      s += '<g><circle class="acc" cx="120" cy="16" r="3.2"/><animateTransform attributeName="transform" type="rotate" from="0 120 60" to="360 120 60" dur="7s" repeatCount="indefinite"/></g>';
      return s;
    },
    globe: function () {
      var s = '<circle class="d" pathLength="1" cx="120" cy="60" r="46"/>';
      s += '<ellipse class="d" pathLength="1" style="--k:3" cx="120" cy="60" rx="20" ry="46"/>';
      s += '<ellipse class="d soft" pathLength="1" style="--k:5" cx="120" cy="60" rx="46" ry="46"><animate attributeName="rx" values="46;4;46" dur="7s" repeatCount="indefinite"/></ellipse>';
      s += '<path class="d soft" pathLength="1" style="--k:6" d="M78 44 Q120 52 162 44"/>';
      s += '<path class="d soft" pathLength="1" style="--k:7" d="M78 76 Q120 68 162 76"/>';
      s += '<path class="d" pathLength="1" style="--k:8" d="M74 60 L166 60"/>';
      s += '<circle class="node" cx="140" cy="38" r="4.5"/><circle class="acc" cx="102" cy="72" r="3.2"/>';
      return s;
    }
  };

  function buildArt(el) {
    var kind = el.getAttribute('data-art');
    if (!ART[kind]) return;
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 120');
    svg.setAttribute('class', 'art');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    // ids must be unique per page
    var uid = 'a' + Math.random().toString(36).slice(2, 7);
    svg.innerHTML = ART[kind]().replace(/id="f/g, 'id="' + uid + 'f').replace(/href="#f/g, 'href="#' + uid + 'f');
    el.appendChild(svg);
    if (reduce && svg.pauseAnimations) { try { svg.pauseAnimations(); } catch (e) {} }
    return svg;
  }

  function typeOut(el) {
    var full = el.textContent.replace(/\s+/g, ' ').trim();
    if (reduce) return;
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    while (el.firstChild) visual.appendChild(el.firstChild);
    // wrap every character in a hidden span: the heading is laid out at its FINAL line breaks
    // from the start, so typing never makes a word jump down to the next line
    var chars = [], walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT, null), texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(function (t) {
      var frag = document.createDocumentFragment();
      t.nodeValue.replace(/\s+/g, ' ').split('').forEach(function (c) {
        var s = document.createElement('span'); s.className = 'tc'; s.textContent = c; frag.appendChild(s); chars.push(s);
      });
      t.parentNode.replaceChild(frag, t);
    });
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = full;
    el.appendChild(sr);
    el.appendChild(visual);
    el.classList.add('typed');
    // the blinking cursor is drawn by the newest character (.cur::after), never as its own box,
    // so it can not open a line break in the middle of a word
    if (chars.length) chars[0].className = 'tc pre';
    el._start = function () {
      var speed = Math.max(18, Math.min(42, 1600 / full.length)), i = 0, prev = chars[0];
      (function step() {
        if (i >= chars.length) { setTimeout(function () { if (prev) prev.className = 'tc on'; }, 2600); return; }
        var c = chars[i++];
        if (prev && prev !== c) prev.className = 'tc on';
        c.className = 'tc on cur';
        prev = c;
        setTimeout(step, c.textContent === ' ' ? speed * 0.6 : speed);
      })();
    };
  }

  function marquee(el) {
    var text = el.textContent;
    el.textContent = '';
    el.classList.add('marquee');
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    var track = document.createElement('span');
    track.className = 'track';
    track.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 8; i++) {
      var s = document.createElement('span');
      s.textContent = text;
      track.appendChild(s);
    }
    el.appendChild(sr);
    el.appendChild(track);
  }

  function wave(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var ink = canvas.getAttribute('data-ink') || '242,240,234';
    var acc = canvas.getAttribute('data-acc') || '245,197,24';
    var strength = parseFloat(canvas.getAttribute('data-alpha') || '0.34');
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), running = false, raf = 0, last = 0, t0 = performance.now();
    function size() {
      var r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // hexagon grid (the brand ring) with a slow wave rippling through it
    function hexPath(cx, cy, r) {
      ctx.beginPath();
      for (var k = 0; k < 6; k++) {
        var a = Math.PI / 180 * (60 * k - 90);
        var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var small = w < 600, R = small ? 26 : 30, hw = Math.sqrt(3) * R, vh = 1.5 * R;
      // wave source drifts slowly around the upper right
      // on phones the hero is tall and narrow: keep the source inside the first screen, nearer the middle
      var ox = small ? w * (0.62 + 0.18 * Math.sin(t * 0.00008)) : w * (0.78 + 0.08 * Math.sin(t * 0.00008));
      var oy = small ? Math.min(h, 700) * (0.38 + 0.1 * Math.cos(t * 0.00007)) : h * (0.3 + 0.12 * Math.cos(t * 0.00007));
      var diag = small ? 640 : Math.sqrt(w * w + h * h);
      ctx.lineWidth = 1;
      for (var row = -1, cy = -vh; cy < h + vh; row++, cy += vh) {
        for (var cx = (row % 2 ? hw / 2 : 0) - hw; cx < w + hw; cx += hw) {
          var dx = cx - ox, dy = cy - oy, d = Math.sqrt(dx * dx + dy * dy);
          var wv = Math.sin(d * 0.016 - t * 0.0013);          // -1..1 ripple
          var fall = Math.max(0, 1 - d / (diag * 0.85));        // fades away from the source
          var lift = Math.max(0, wv);
          var r = R * (0.9 + 0.08 * wv);
          hexPath(cx, cy - lift * 4, r);
          ctx.strokeStyle = 'rgba(' + ink + ',' + (strength * fall * (0.22 + 0.78 * lift)).toFixed(3) + ')';
          ctx.stroke();
          if (wv > 0.82 && fall > 0.25) {
            ctx.strokeStyle = 'rgba(' + acc + ',' + (strength * 1.6 * fall * (wv - 0.82) / 0.18).toFixed(3) + ')';
            ctx.stroke();
          }
        }
      }
    }
    function loop(now) {
      if (!running) return;
      if (now - last > 33) { draw(now - t0); last = now; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    size(); draw(9000);
    // only redraw on a real size change: phone browsers fire resize while the address bar slides,
    // which used to clear the canvas mid-scroll and made the hexagons jump
    var lastW = 0, lastH = 0;
    function onResize() {
      var rct = canvas.getBoundingClientRect();
      if (Math.abs(rct.width - lastW) < 2 && Math.abs(rct.height - lastH) < 80) return;
      lastW = rct.width; lastH = rct.height;
      size(); draw(performance.now() - t0);
    }
    lastW = w; lastH = h;
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvas);
    else window.addEventListener('resize', onResize);
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }).observe(canvas);
      document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    }
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-art]'), function (el) {
      var svg = buildArt(el);
      if (svg) svg.classList.add('rv-art');
    });
    if (root.classList.contains('motion')) Array.prototype.forEach.call(document.querySelectorAll('[data-type]'), typeOut);
    Array.prototype.forEach.call(document.querySelectorAll('[data-marquee]'), function (el) { if (!reduce) marquee(el); });
    Array.prototype.forEach.call(document.querySelectorAll('canvas[data-wave]'), wave);

    // stagger: children of [data-stagger] get --i in order
    Array.prototype.forEach.call(document.querySelectorAll('[data-stagger]'), function (g) {
      var kids = g.querySelectorAll('.rv, .rv-fade');
      Array.prototype.forEach.call(kids, function (k, i) { if (!k.style.getPropertyValue('--i')) k.style.setProperty('--i', i); });
    });

    if (!root.classList.contains('motion')) return;
    var targets = document.querySelectorAll('.rv, .rv-fade, .grow-x, .art, [data-type]');
    var lateSet = false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        // hero load sequence is timed from navigation (as in the reference): take off the time the page
        // needed to get here, at most 450ms, so a slow phone still sees the whole sequence
        if (!lateSet && e.target.closest('.hero')) { lateSet = true; root.style.setProperty('--late', Math.min(450, Math.round(performance.now())) + 'ms'); }
        e.target.classList.add('in');
        // in the hero, wait for the panel holding the line to finish arriving (RedSun load sequence)
        if (e.target._start) { var s = e.target._start; e.target._start = null; setTimeout(s, e.target.closest('.hero') ? 1500 : 350); }
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
