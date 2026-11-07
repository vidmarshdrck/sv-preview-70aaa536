(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("is-open", open);
      var label = toggle.querySelector(".sr-only");
      if (label) label.textContent = open ? "Close menu" : "Menu";
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

  var root = document.querySelector("[data-slider]");
  if (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll("[data-slide]"));
    if (slides.length) {
      var i = 0;
      var currentEl = root.querySelector("[data-current]");
      var text = root.querySelector(".slide-text");
      function show(n) {
        i = (n + slides.length) % slides.length;
        slides.forEach(function (s, k) { s.hidden = k !== i; });
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
    }
  }

  var cal = document.querySelector("[data-calendar]");
  var form = document.getElementById("meeting-request");
  if (!cal || !form) return;

  var label = document.getElementById("cal-label");
  var gridBody = cal.querySelector("[data-cal-grid]");
  var grid = cal.querySelector(".cal-grid");
  var prevBtn = cal.querySelector("[data-cal-prev]");
  var nextBtn = cal.querySelector("[data-cal-next]");
  var hiddenDate = document.getElementById("request-date");
  var dateDisplay = document.getElementById("request-date-display");
  var zoneSelect = document.getElementById("request-zone");
  var zoneOffset = document.getElementById("request-zone-offset");
  var timeInput = document.getElementById("request-time");
  var status = document.getElementById("request-status");
  var summary = document.getElementById("request-summary");
  var errors = document.getElementById("request-errors");
  var submit = document.getElementById("request-submit");

  var MONTHS_AHEAD = 18;
  var focusIso = "";
  var selectedIso = "";
  var viewYear = 0;
  var viewMonth = 0;

  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
  function parts(value) { return value.split("-").map(Number); }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function weekdayMon0(y, m, d) { return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; }
  function monthIndex(y, m) { return y * 12 + (m - 1); }
  function indexOf(value) {
    var p = parts(value);
    return monthIndex(p[0], p[1]);
  }
  function addDays(value, delta) {
    var p = parts(value);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    dt.setUTCDate(dt.getUTCDate() + delta);
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  function addMonths(value, count) {
    var p = parts(value);
    var y = p[0];
    var m = p[1] + count;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    return iso(y, m, Math.min(p[2], daysInMonth(y, m)));
  }
  function zoneParts(timeZone, date) {
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    var bag = { year: "0", month: "0", day: "0", hour: "0", minute: "0" };
    fmt.formatToParts(date).forEach(function (part) {
      if (part.type in bag) bag[part.type] = part.value;
    });
    var hour = parseInt(bag.hour, 10);
    if (hour === 24) hour = 0;
    return {
      year: parseInt(bag.year, 10),
      month: parseInt(bag.month, 10),
      day: parseInt(bag.day, 10),
      hour: hour,
      minute: parseInt(bag.minute, 10)
    };
  }
  function zoneName() {
    var value = zoneSelect && zoneSelect.value;
    if (validZone(value)) return value;
    return "UTC";
  }
  function validZone(value) {
    if (!value) return false;
    try {
      Intl.DateTimeFormat("en-GB", { timeZone: value }).format(new Date());
      return true;
    } catch (e) {
      return false;
    }
  }
  function todayIso() {
    var now = zoneParts(zoneName(), new Date());
    return iso(now.year, now.month, now.day);
  }
  function minMonth() { return indexOf(todayIso()); }
  function maxMonth() { return minMonth() + MONTHS_AHEAD; }
  function isPastDay(value) { return value < todayIso(); }
  function formatLong(value) {
    var p = parts(value);
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
    }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2])));
  }
  function formatMonth(y, m) {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long", year: "numeric", timeZone: "UTC"
    }).format(new Date(Date.UTC(y, m - 1, 1)));
  }
  function inRange(value) {
    var idx = indexOf(value);
    return idx >= minMonth() && idx <= maxMonth() && !isPastDay(value);
  }
  function updateOffset() {
    if (!zoneOffset) return;
    var zone = zoneName();
    var basis = selectedIso || todayIso();
    var p = parts(basis);
    var sample = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0));
    var name = "";
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(sample).forEach(function (part) {
        if (part.type === "timeZoneName") name = part.value;
      });
    } catch (e) { name = ""; }
    zoneOffset.textContent = name ? "Clock time in " + zone + " (" + name + ")." : "Clock time in " + zone + ".";
  }
  function fillZones() {
    var zones = [];
    try { zones = Intl.supportedValuesOf("timeZone").slice(); } catch (e) { zones = []; }
    if (!zones.length) zones = ["Africa/Lusaka", "UTC"];
    var local = "UTC";
    try { local = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { local = "UTC"; }
    if (zones.indexOf(local) === -1) zones.unshift(local);
    zones.sort();
    zoneSelect.textContent = "";
    zones.forEach(function (zone) {
      var opt = document.createElement("option");
      opt.value = zone;
      opt.textContent = zone;
      if (zone === local) opt.selected = true;
      zoneSelect.appendChild(opt);
    });
  }
  function render(moveFocus) {
    var today = todayIso();
    if (indexOf(iso(viewYear, viewMonth, 1)) < minMonth()) {
      var t = parts(today);
      viewYear = t[0];
      viewMonth = t[1];
    }
    if (indexOf(iso(viewYear, viewMonth, 1)) > maxMonth()) {
      var cap = addMonths(today, MONTHS_AHEAD);
      var c = parts(cap);
      viewYear = c[0];
      viewMonth = c[1];
    }
    label.textContent = formatMonth(viewYear, viewMonth);
    prevBtn.disabled = indexOf(iso(viewYear, viewMonth, 1)) <= minMonth();
    nextBtn.disabled = indexOf(iso(viewYear, viewMonth, 1)) >= maxMonth();
    prevBtn.setAttribute("aria-label", "Previous month");
    nextBtn.setAttribute("aria-label", "Next month");
    gridBody.textContent = "";
    var first = weekdayMon0(viewYear, viewMonth, 1);
    var count = daysInMonth(viewYear, viewMonth);
    var cells = [];
    var n;
    for (n = 0; n < first; n += 1) cells.push("");
    for (n = 1; n <= count; n += 1) cells.push(iso(viewYear, viewMonth, n));
    while (cells.length % 7) cells.push("");
    var focusBtn = null;
    for (var r = 0; r < cells.length; r += 7) {
      var tr = document.createElement("tr");
      for (var c = 0; c < 7; c += 1) {
        var td = document.createElement("td");
        var value = cells[r + c];
        if (value) {
          td.setAttribute("role", "gridcell");
          td.setAttribute("aria-selected", value === selectedIso ? "true" : "false");
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cal-day";
          btn.textContent = String(parts(value)[2]);
          btn.setAttribute("data-date", value);
          btn.setAttribute("aria-label", formatLong(value));
          var enabled = inRange(value);
          btn.disabled = !enabled;
          if (value === today) btn.setAttribute("aria-current", "date");
          btn.setAttribute("aria-pressed", value === selectedIso ? "true" : "false");
          btn.tabIndex = value === focusIso && enabled ? 0 : -1;
          if (value === focusIso && enabled) focusBtn = btn;
          td.appendChild(btn);
        }
        tr.appendChild(td);
      }
      gridBody.appendChild(tr);
    }
    if (!focusBtn) {
      var enabledBtns = gridBody.querySelectorAll(".cal-day:not([disabled])");
      if (enabledBtns.length) {
        focusBtn = enabledBtns[0];
        focusIso = focusBtn.getAttribute("data-date");
        focusBtn.tabIndex = 0;
      }
    }
    if (moveFocus && focusBtn) focusBtn.focus();
    dateDisplay.textContent = selectedIso ? formatLong(selectedIso) : "No date chosen";
    hiddenDate.value = selectedIso;
    updateOffset();
  }
  function selectDate(value) {
    if (!inRange(value)) return;
    selectedIso = value;
    focusIso = value;
    var p = parts(value);
    viewYear = p[0];
    viewMonth = p[1];
    render(false);
    clearResult();
  }
  function moveTo(target, dir) {
    var next = target;
    var guard = 0;
    while (guard < 500 && !inRange(next)) {
      var stepped = addDays(next, dir);
      if (stepped === next) return;
      if (indexOf(stepped) < minMonth() || indexOf(stepped) > maxMonth()) return;
      next = stepped;
      guard += 1;
    }
    if (!inRange(next)) return;
    focusIso = next;
    var p = parts(next);
    viewYear = p[0];
    viewMonth = p[1];
    render(true);
  }
  function move(delta) { moveTo(addDays(focusIso, delta), delta > 0 ? 1 : -1); }

  fillZones();
  focusIso = todayIso();
  var start = parts(focusIso);
  viewYear = start[0];
  viewMonth = start[1];
  render(false);

  prevBtn.addEventListener("click", function () {
    var p = parts(addMonths(iso(viewYear, viewMonth, 1), -1));
    viewYear = p[0];
    viewMonth = p[1];
    render(false);
  });
  nextBtn.addEventListener("click", function () {
    var p = parts(addMonths(iso(viewYear, viewMonth, 1), 1));
    viewYear = p[0];
    viewMonth = p[1];
    render(false);
  });
  gridBody.addEventListener("click", function (e) {
    var btn = e.target.closest(".cal-day");
    if (!btn || btn.disabled) return;
    selectDate(btn.getAttribute("data-date"));
  });
  grid.addEventListener("keydown", function (e) {
    if (!e.target.closest(".cal-day")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); move(7); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-7); }
    else if (e.key === "Home") { e.preventDefault(); moveTo(addDays(focusIso, -weekdayMon0.apply(null, parts(focusIso))), 1); }
    else if (e.key === "End") {
      e.preventDefault();
      var wd = weekdayMon0.apply(null, parts(focusIso));
      moveTo(addDays(focusIso, 6 - wd), -1);
    } else if (e.key === "PageDown") { e.preventDefault(); moveTo(addMonths(focusIso, e.shiftKey ? 12 : 1), 1); }
    else if (e.key === "PageUp") { e.preventDefault(); moveTo(addMonths(focusIso, e.shiftKey ? -12 : -1), 1); }
  });
  zoneSelect.addEventListener("change", function () {
    var today = todayIso();
    if (!focusIso || isPastDay(focusIso)) focusIso = today;
    if (selectedIso && isPastDay(selectedIso)) selectedIso = "";
    var p = parts(focusIso);
    viewYear = p[0];
    viewMonth = p[1];
    render(false);
    clearResult();
  });

  function fieldError(id, message) {
    var input = document.getElementById(id);
    var err = document.getElementById(id + "-error");
    if (err) {
      err.hidden = !message;
      err.textContent = message || "";
    }
    if (input && input.tagName !== "P") {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
    return message;
  }
  function clearErrors() {
    ["request-name", "request-email", "request-time", "request-zone", "request-purpose"].forEach(function (id) {
      fieldError(id, "");
    });
    var dateErr = document.getElementById("request-date-error");
    dateErr.hidden = true;
    dateErr.textContent = "";
    grid.removeAttribute("aria-invalid");
    errors.hidden = true;
    errors.textContent = "";
  }
  function clearResult() {
    status.hidden = true;
    summary.textContent = "";
  }
  function showErrors(list) {
    clearResult();
    errors.hidden = false;
    errors.textContent = "";
    var p = document.createElement("p");
    p.textContent = "Add the missing details. Nothing was sent.";
    errors.appendChild(p);
    var ul = document.createElement("ul");
    list.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + item.id;
      a.textContent = item.message;
      li.appendChild(a);
      ul.appendChild(li);
    });
    errors.appendChild(ul);
    errors.focus();
  }
  function isPastStamp(dateIso, timeValue, zone) {
    var now = zoneParts(zone, new Date());
    var nowKey = now.year * 10000 + now.month * 100 + now.day;
    var p = parts(dateIso);
    var key = p[0] * 10000 + p[1] * 100 + p[2];
    if (key < nowKey) return true;
    if (key > nowKey) return false;
    var hm = timeValue.split(":");
    return (+hm[0]) * 60 + (+hm[1]) <= now.hour * 60 + now.minute;
  }
  function validate() {
    clearErrors();
    var list = [];
    var name = document.getElementById("request-name").value.trim();
    var email = document.getElementById("request-email").value.trim();
    var time = timeInput.value;
    var zone = zoneSelect.value;
    var purpose = document.getElementById("request-purpose").value.trim();
    if (name.length < 2) list.push({ id: "request-name", message: fieldError("request-name", "Enter your name.") });
    else fieldError("request-name", "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) list.push({ id: "request-email", message: fieldError("request-email", "Enter an email address so a reply is possible.") });
    else fieldError("request-email", "");
    if (!selectedIso || isPastDay(selectedIso)) {
      var dateErr = document.getElementById("request-date-error");
      dateErr.hidden = false;
      dateErr.textContent = "Choose a date that has not already passed.";
      grid.setAttribute("aria-invalid", "true");
      list.push({ id: "cal-label", message: "Choose a date that has not already passed." });
    }
    if (!time) list.push({ id: "request-time", message: fieldError("request-time", "Choose a time.") });
    else if (selectedIso && validZone(zone) && isPastStamp(selectedIso, time, zone)) {
      list.push({ id: "request-time", message: fieldError("request-time", "Choose a time that has not already passed in that timezone.") });
    } else fieldError("request-time", "");
    if (!validZone(zone)) list.push({ id: "request-zone", message: fieldError("request-zone", "Choose a timezone.") });
    else fieldError("request-zone", "");
    if (purpose.length < 10) list.push({ id: "request-purpose", message: fieldError("request-purpose", "Say what the meeting is about.") });
    else fieldError("request-purpose", "");
    return { ok: list.length === 0, list: list, name: name, email: email, time: time, zone: zone, purpose: purpose };
  }
  function addSummary(term, value) {
    var wrap = document.createElement("div");
    var dt = document.createElement("dt");
    var dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    wrap.appendChild(dt);
    wrap.appendChild(dd);
    summary.appendChild(wrap);
  }
  function run() {
    var result = validate();
    if (!result.ok) {
      showErrors(result.list);
      return;
    }
    errors.hidden = true;
    summary.textContent = "";
    addSummary("Name", result.name);
    addSummary("Email", result.email);
    addSummary("Date", formatLong(selectedIso));
    addSummary("Time", result.time);
    addSummary("Timezone", result.zone);
    addSummary("Purpose", result.purpose);
    status.hidden = false;
    status.focus();
  }
  submit.addEventListener("click", run);
  form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && !e.target.closest(".cal")) {
      e.preventDefault();
      run();
    }
  });
  form.addEventListener("input", clearResult);
})();
