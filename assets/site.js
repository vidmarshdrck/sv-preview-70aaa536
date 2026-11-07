(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("is-open", open);
      toggle.querySelector(".sr-only").textContent = open ? "Close menu" : "Menu";
    }
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  var links = Array.prototype.slice.call(document.querySelectorAll(".site-nav a"));
  var sections = links.map(function (a) {
    var id = (a.getAttribute("href") || "").slice(1);
    return document.getElementById(id);
  }).filter(Boolean);
  function setCurrent(id) {
    links.forEach(function (a) {
      var on = (a.getAttribute("href") || "") === "#" + id;
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }
  function syncNav() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var about = document.getElementById("about");
    var aboutTop = about ? about.getBoundingClientRect().top + y : Infinity;
    if (y < aboutTop) {
      setCurrent("home");
      return;
    }
    var id = "about";
    sections.forEach(function (section) {
      if (!section || section.id === "home") return;
      var top = section.getBoundingClientRect().top + y;
      if (top <= y + 8) id = section.id;
    });
    setCurrent(id);
  }
  syncNav();
  window.addEventListener("scroll", syncNav, { passive: true });
  window.addEventListener("resize", syncNav);

  var root = document.querySelector("[data-slider]");
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll("[data-slide]"));
  if (!slides.length) return;
  var i = 0;
  var currentEl = root.querySelector("[data-current]");
  var text = root.querySelector(".slide-text");
  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      var on = k === i;
      s.hidden = !on;
    });
    if (currentEl) currentEl.textContent = String(i + 1).padStart(2, "0");
    if (!text) return;
    text.textContent = "";
    var title = slides[i].getAttribute("data-title") || "";
    var blurb = slides[i].getAttribute("data-blurb") || "";
    if (title) {
      var h = document.createElement("p");
      h.className = "slide-title";
      h.textContent = title;
      text.appendChild(h);
    }
    if (blurb) {
      var p = document.createElement("p");
      p.className = "slide-blurb";
      p.textContent = blurb;
      text.appendChild(p);
    }
  }
  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-dir]");
    if (!b) return;
    show(i + Number(b.getAttribute("data-dir")));
  });
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1); }
  });
})();
