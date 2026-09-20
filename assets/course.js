(function () {
  var C = window.JEV || {};
  var PREVIEW = window.JEV_PREVIEW || null;
  var PARTS = ["The ten steps", "Five production patterns", "Field manual"];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ======================= data layer ======================= */
  var sb = null;
  if (!PREVIEW && C.supabaseUrl && C.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  var api = PREVIEW ? {
    session: function () { return Promise.resolve(null); },
    sendCode: function () { return Promise.resolve(); },
    verify: function (e, code) { return /^\d{6}$/.test(code) ? Promise.resolve({ email: e }) : Promise.reject(new Error("code")); },
    hasAccess: function () { return Promise.resolve(true); },
    index: function () { return Promise.resolve(PREVIEW.lessons.map(function (l) { var c = Object.assign({}, l); c.soon = !l.html; delete c.html; return c; })); },
    lesson: function (slug) { var l = PREVIEW.lessons.filter(function (x) { return x.slug === slug; })[0]; return Promise.resolve(l ? l.html : ""); },
    signOut: function () { return Promise.resolve(); }
  } : {
    session: function () { return sb.auth.getSession().then(function (r) { var s = r.data && r.data.session; return s ? { email: s.user.email } : null; }); },
    sendCode: function (email) { return sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } }).then(function (r) { if (r.error) throw r.error; }); },
    verify: function (email, code) { return sb.auth.verifyOtp({ email: email, token: code, type: "email" }).then(function (r) { if (r.error) throw r.error; return { email: r.data.user.email }; }); },
    hasAccess: function () { return sb.rpc("has_access").then(function (r) { if (r.error) throw r.error; return !!r.data; }); },
    index: function () {
      return sb.from("lessons").select("slug,part,position,n,title,summary,minutes,builds,ready").order("part").order("position")
        .then(function (r) { if (r.error) throw r.error; return r.data.map(function (l) { l.soon = !l.ready; return l; }); });
    },
    lesson: function (slug) { return sb.from("lessons").select("html").eq("slug", slug).single().then(function (r) { if (r.error) throw r.error; return r.data.html; }); },
    signOut: function () { return sb.auth.signOut(); }
  };

  /* ======================= screens ======================= */
  function show(id) { $$(".screen").forEach(function (s) { s.classList.toggle("on", s.id === id); }); window.scrollTo(0, 0); }
  var me = null, lessons = [], done = {};

  /* ---------- auth ---------- */
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var stepEmail = $("#f-email"), stepCode = $("#f-code"), stepNo = $("#nox");
  function authStep(which) {
    [stepEmail, stepCode, stepNo].forEach(function (el) { el.classList.toggle("hide", el !== which); });
    var f = $("input", which); if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function status(el, msg, err) { el.textContent = msg || ""; el.classList.toggle("err", !!err); }

  var pending = "", timer = null;
  function cooldown() {
    var b = $("#resend"), n = 45; b.disabled = true; clearInterval(timer);
    b.textContent = "Send again in " + n + "s";
    timer = setInterval(function () { n--; if (n <= 0) { clearInterval(timer); b.disabled = false; b.textContent = "Send the code again"; } else b.textContent = "Send again in " + n + "s"; }, 1000);
  }
  function send(email) {
    var st = $("#st-email"), btn = $("#send");
    btn.setAttribute("aria-disabled", "true"); status(st, "Sending the code...");
    return api.sendCode(email).then(function () {
      pending = email; $("#sent-to").textContent = email; status(st, "");
      authStep(stepCode); clearOtp(); cooldown();
    }).catch(function (e) {
      status(st, /rate|seconds/i.test(e && e.message || "") ? "Too many codes requested. Wait a minute and try again." : "Couldn't send the code. Check the email and try again.", true);
    }).then(function () { btn.removeAttribute("aria-disabled"); });
  }
  $("#f-email").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("#email").value.trim().toLowerCase();
    if (!emailRe.test(v)) { status($("#st-email"), "Enter the email you paid with.", true); return; }
    if (!sb && !PREVIEW) { status($("#st-email"), "Login isn't connected yet. Add the Supabase keys to config.js.", true); return; }
    send(v);
  });

  var boxes = $$(".otp input");
  function clearOtp() { boxes.forEach(function (b) { b.value = ""; }); status($("#st-code"), ""); }
  function code() { return boxes.map(function (b) { return b.value; }).join(""); }
  boxes.forEach(function (b, i) {
    b.addEventListener("input", function () {
      var d = b.value.replace(/\D/g, "");
      if (d.length > 1) { d.split("").slice(0, 6 - i).forEach(function (ch, k) { boxes[i + k].value = ch; }); var j = Math.min(5, i + d.length); boxes[j].focus(); }
      else { b.value = d; if (d && i < 5) boxes[i + 1].focus(); }
      if (code().length === 6) verify();
    });
    b.addEventListener("keydown", function (e) { if (e.key === "Backspace" && !b.value && i > 0) boxes[i - 1].focus(); });
    b.addEventListener("paste", function (e) {
      var t = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
      if (t.length) { e.preventDefault(); t.split("").forEach(function (ch, k) { if (boxes[k]) boxes[k].value = ch; }); boxes[Math.min(5, t.length)].focus(); if (t.length === 6) verify(); }
    });
  });
  var verifying = false;
  function verify() {
    if (verifying) return; verifying = true;
    status($("#st-code"), "Checking the code...");
    api.verify(pending, code()).then(function (u) { me = u; return enter(); })
      .catch(function () { status($("#st-code"), "That code didn't work. It may be mistyped or expired, so check it or send a new one.", true); boxes[5].focus(); })
      .then(function () { verifying = false; });
  }
  $("#f-code").addEventListener("submit", function (e) { e.preventDefault(); if (code().length === 6) verify(); else status($("#st-code"), "Enter all six digits.", true); });
  $("#resend").addEventListener("click", function () { if (pending) send(pending); });
  $("#back").addEventListener("click", function () { authStep(stepEmail); });
  $("#no-out").addEventListener("click", signOut);

  function signOut() { api.signOut().then(function () { me = null; location.hash = ""; show("auth"); authStep(stepEmail); }); }
  $("#out").addEventListener("click", signOut);

  /* ---------- access + load ---------- */
  function enter() {
    return api.hasAccess().then(function (ok) {
      if (!ok) { $("#no-email").textContent = me.email; show("auth"); authStep(stepNo); return; }
      $("#who").textContent = me.email;
      try { done = JSON.parse(localStorage.getItem("jev-done:" + me.email) || "{}"); } catch (e) { done = {}; }
      return api.index().then(function (list) { lessons = list; tree(); show("app"); route(); });
    });
  }

  /* ======================= reader ======================= */
  function kicker(l) {
    if (l.part === 1) return "step " + l.n + " / 10";
    if (l.part === 2) return "pattern " + l.n.replace("P", "") + " / 5";
    return "field manual " + l.n;
  }
  function tree() {
    var h = "";
    PARTS.forEach(function (p, i) {
      var items = lessons.filter(function (l) { return l.part === i + 1; });
      if (!items.length) return;
      var d = items.filter(function (l) { return done[l.slug]; }).length;
      h += "<h4>" + p + "<small>" + d + "/" + items.length + "</small></h4>";
      items.forEach(function (l) {
        h += '<a href="#/' + l.slug + '" data-slug="' + l.slug + '" class="' + (l.soon ? "lock" : "") + '"><span class="n">' + l.n + "</span><span>" + l.title + '</span><span class="ok">' + (l.soon ? "soon" : done[l.slug] ? "[x]" : "") + "</span></a>";
      });
    });
    $("#tree").innerHTML = h;
    var ready = lessons.filter(function (l) { return !l.soon; }), n = ready.filter(function (l) { return done[l.slug]; }).length;
    $("#m-fill").style.width = (ready.length ? n / ready.length * 100 : 0) + "%";
    $("#m-txt").textContent = n + " of " + ready.length + " done";
    mark();
  }
  function mark() { var s = cur && cur.slug; $$("#tree a").forEach(function (a) { a.classList.toggle("cur", a.dataset.slug === s); }); }

  var cur = null, spy = null;
  function route() {
    var slug = decodeURIComponent((location.hash.match(/^#\/(.+)$/) || [])[1] || "");
    var ready = lessons.filter(function (l) { return !l.soon; });
    var l = ready.filter(function (x) { return x.slug === slug; })[0];
    if (!l) { l = ready.filter(function (x) { return !done[x.slug]; })[0] || ready[0]; if (l) { history.replaceState(null, "", "#/" + l.slug); } }
    if (!l) { $("#doc").innerHTML = '<div class="empty"><h1 class="mega">Chapters are on the way</h1></div>'; return; }
    open(l);
  }
  window.addEventListener("hashchange", function () { if ($("#app").classList.contains("on")) route(); });

  function open(l) {
    cur = l; mark(); document.body.classList.remove("menu-open");
    document.title = l.title + " - Jev Engineering";
    $("#k-part").textContent = PARTS[l.part - 1];
    $("#k-n").textContent = kicker(l);
    $("#k-min").textContent = "about " + (l.minutes || 10) + " min";
    $("#h-title").textContent = l.title;
    $("#h-sum").textContent = l.summary || "";
    var b = $("#h-build"); if (l.builds) { b.classList.remove("hide"); $("#h-build-v").textContent = l.builds; } else b.classList.add("hide");
    var prose = $("#prose"); prose.innerHTML = '<p style="font-weight:700">Loading the chapter...</p>'; $("#toc").innerHTML = "";
    window.scrollTo(0, 0);
    api.lesson(l.slug).then(function (html) {
      if (cur !== l) return;
      prose.innerHTML = html;
      enhance(prose); pager(l);
    }).catch(function () { prose.innerHTML = '<p><b>This chapter didn\'t load.</b> Check your connection and reload the page.</p>'; });
  }

  function enhance(root) {
    $$(".cw .cp", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = $("pre", btn.closest(".cw")).innerText.replace(/^\$ /gm, "");
        var old = btn.textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { btn.textContent = "copied"; btn.classList.add("ok"); setTimeout(function () { btn.textContent = old; btn.classList.remove("ok"); }, 1400); }).catch(function () {});
      });
    });
    $$("table", root).forEach(function (t) { if (!t.parentNode.classList.contains("tw")) { var w = document.createElement("div"); w.className = "tw"; t.parentNode.insertBefore(w, t); w.appendChild(t); } });
    var hs = $$("h2", root), toc = $("#toc");
    toc.innerHTML = hs.length ? "<b>In this chapter</b>" + hs.map(function (h, i) { h.id = h.id || "s" + (i + 1); return '<a href="#' + h.id + '" data-id="' + h.id + '">' + h.textContent + "</a>"; }).join("") : "";
    $$("a", toc).forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); document.getElementById(a.dataset.id).scrollIntoView({ behavior: "smooth" }); }); });
    if (spy) spy.disconnect();
    if ("IntersectionObserver" in window && hs.length) {
      spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) $$("a", toc).forEach(function (a) { a.classList.toggle("on", a.dataset.id === e.target.id); }); });
      }, { rootMargin: "-80px 0px -70% 0px" });
      hs.forEach(function (h) { spy.observe(h); });
    }
  }

  function pager(l) {
    var ready = lessons.filter(function (x) { return !x.soon; }), i = ready.indexOf(l);
    var p = ready[i - 1], n = ready[i + 1];
    var h = p ? '<a href="#/' + p.slug + '"><small>previous</small><b>' + p.n + " " + p.title + "</b></a>" : '<a class="ghost"></a>';
    h += '<button class="btn done' + (done[l.slug] ? " is" : "") + '" id="done">' + (done[l.slug] ? "Done" : "Mark as done") + "</button>";
    h += n ? '<a class="nx" href="#/' + n.slug + '"><small>next</small><b>' + n.n + " " + n.title + "</b></a>" : '<a class="ghost"></a>';
    $("#pager").innerHTML = h;
    $("#done").addEventListener("click", function () {
      done[l.slug] = !done[l.slug]; if (!done[l.slug]) delete done[l.slug];
      try { localStorage.setItem("jev-done:" + me.email, JSON.stringify(done)); } catch (e) {}
      tree(); pager(l);
      if (done[l.slug] && n) setTimeout(function () { location.hash = "#/" + n.slug; }, 350);
    });
  }

  $("#menu").addEventListener("click", function () { document.body.classList.toggle("menu-open"); });
  document.addEventListener("keydown", function (e) {
    if (!$("#app").classList.contains("on") || e.target.closest("input")) return;
    if (e.key === "ArrowRight" && $(".pager .nx")) location.hash = $(".pager .nx").getAttribute("href");
    if (e.key === "ArrowLeft" && $(".pager a:first-child:not(.ghost)")) location.hash = $(".pager a:first-child").getAttribute("href");
  });

  /* ======================= boot ======================= */
  if (PREVIEW) $("#preview-note").classList.remove("hide");
  (sb || PREVIEW ? api.session() : Promise.resolve(null)).then(function (s) {
    if (s) { me = s; return enter(); }
    show("auth"); authStep(stepEmail);
  }).catch(function () { show("auth"); authStep(stepEmail); });
})();
