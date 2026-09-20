(function () {
  var C = window.JEV || {};
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- bind config values into the page ---------- */
  document.querySelectorAll("[data-price]").forEach(function (el) { el.textContent = C.price; });
  document.querySelectorAll("[data-href]").forEach(function (el) {
    var v = C[el.getAttribute("data-href")];
    if (v) el.setAttribute("href", v);
  });
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- seeded random so every visit gets the same composition ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- halftone field: blobs rendered as a dot screen ---------- */
  function Halftone(host) {
    var cv = document.createElement("canvas");
    cv.className = "htc";
    cv.setAttribute("aria-hidden", "true");
    host.prepend(cv);
    var ctx = cv.getContext("2d");
    var step = +host.dataset.step || 8;
    var ink = host.dataset.ink || "#000";
    var count = +host.dataset.blobs || 6;
    var follow = host.hasAttribute("data-follow");
    var calm = (host.dataset.calm || "").split(",").map(Number);
    var r = rng(+host.dataset.seed || 7);
    var W = 0, H = 0, dpr = 1, running = false, last = 0, visible = true;
    var ptr = { x: -9999, y: -9999, s: 0 };

    var blobs = [];
    for (var i = 0; i < count; i++) {
      blobs.push({
        x: r(), y: r(),
        rad: 0.07 + r() * 0.1,
        amp: 0.55 + r() * 0.5,
        ph: r() * 6.28, sp: 0.00006 + r() * 0.00008,
        ax: 0.03 + r() * 0.05, ay: 0.03 + r() * 0.05
      });
    }
    var specks = [];
    for (var j = 0; j < 180; j++) specks.push({ x: r(), y: r(), s: 0.5 + r() * 1.3, ph: r() * 6.28 });

    function size() {
      var b = host.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = b.width; H = b.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = ink;
      ctx.beginPath();
      var m = Math.min(W, H) || 1;
      var pos = blobs.map(function (b) {
        return {
          x: (b.x + Math.sin(t * b.sp + b.ph) * b.ax) * W,
          y: (b.y + Math.cos(t * b.sp * 1.3 + b.ph) * b.ay) * H,
          k: 1 / Math.pow(b.rad * Math.sqrt(W * H) * 1.15, 2),
          a: b.amp
        };
      });
      if (follow && ptr.s > 0.01) pos.push({ x: ptr.x, y: ptr.y, k: 1 / Math.pow(m * 0.16, 2), a: 1.1 * ptr.s });
      var maxR = step * 0.56, row = 0;
      for (var y = 0; y < H + step; y += step * 0.87, row++) {
        var off = row % 2 ? step / 2 : 0;
        for (var x = off; x < W + step; x += step) {
          var v = 0;
          for (var i = 0; i < pos.length; i++) {
            var dx = x - pos[i].x, dy = y - pos[i].y;
            v += pos[i].a * Math.exp(-(dx * dx + dy * dy) * pos[i].k);
          }
          if (calm.length === 4) {
            var ox = Math.max(calm[0] * W - x, 0, x - calm[2] * W), oy = Math.max(calm[1] * H - y, 0, y - calm[3] * H);
            v *= 0.2 + 0.8 * Math.min(1, Math.sqrt(ox * ox + oy * oy) / 160);
          }
          v = v - 0.14;
          if (v <= 0) continue;
          var rr = Math.pow(Math.min(1, v), 0.85) * maxR;
          if (rr < 0.45) continue;
          ctx.moveTo(x + rr, y);
          ctx.arc(x, y, rr, 0, 6.2832);
        }
      }
      for (var s = 0; s < specks.length; s++) {
        var p = specks[s];
        var sx = p.x * W + Math.sin(t * 0.0002 + p.ph) * 6, sy = p.y * H;
        ctx.moveTo(sx + p.s, sy);
        ctx.arc(sx, sy, p.s, 0, 6.2832);
      }
      ctx.fill();
    }

    function loop(now) {
      if (!running) return;
      if (now - last > 33) { last = now; ptr.s *= 0.965; draw(now); }
      requestAnimationFrame(loop);
    }
    function start() { if (reduce) { draw(0); return; } if (!running) { running = true; requestAnimationFrame(loop); } }
    function stop() { running = false; }

    size(); draw(0);
    new ResizeObserver(function () { size(); draw(performance.now()); }).observe(host);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }).observe(host);
    } else start();
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : visible && start(); });
    if (follow && !reduce) {
      host.addEventListener("pointermove", function (e) {
        var b = host.getBoundingClientRect();
        ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.s = Math.min(1, ptr.s + 0.12);
      });
    }
  }
  document.querySelectorAll("[data-ht]").forEach(Halftone);

  /* ---------- copy to clipboard ---------- */
  window.jevCopy = function (text, btn) {
    function ok() {
      var old = btn.textContent;
      btn.textContent = "Copied"; btn.classList.add("ok");
      setTimeout(function () { btn.textContent = old; btn.classList.remove("ok"); }, 1600);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok);
    else {
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
      ta.select(); try { document.execCommand("copy"); ok(); } catch (e) {} ta.remove();
    }
  };
})();
