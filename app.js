/* Fresh Tracks: powder tracker. No build step, no framework. */
(() => {
  "use strict";

  /* ============================================================
     Config
     ============================================================ */
  const METEO = "https://api.open-meteo.com/v1/forecast";
  const AWDB = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";   // sends CORS headers, no proxy needed
  // "main" drives every score. "alt" is a second opinion for the confidence badge.
  // best_match picks the best regional model (GFS/HRRR in the US, GEM in Canada).
  const MODELS = { main: "best_match", alt: "ecmwf_ifs025" };
  const PAST = 7;          // days of history requested
  const FUTURE = 8;        // days of forecast requested (today included)
  const TODAY = PAST;      // index of "today" in each resort's days array
  const FORECAST_TTL = 30 * 60 * 1000;
  const STATION_TTL = 7 * 24 * 3600 * 1000;
  const MAX_STATION_KM = 40;
  const TIMEOUT = 20000;   // ms per request, so a stalled API shows an error instead of spinning
  const US = new Set(["CO", "UT", "WY", "MT", "ID", "NM", "AZ", "CA", "NV", "OR", "WA", "AK", "VT", "NH", "ME", "NY"]);

  // Score tiers use ski-trail signage: circle, square, diamond, double diamond.
  // On the dark theme black diamonds read as white, and "Send it" takes the accent.
  const TIERS = [
    { min: 75, name: "Send it", shape: "diamond", n: 2, color: "#c6ff3d" },
    { min: 50, name: "Deep", shape: "diamond", n: 1, color: "#eef3f7" },
    { min: 25, name: "Good", shape: "square", n: 1, color: "#3b8bff" },
    { min: 5, name: "Light", shape: "circle", n: 1, color: "#2fd07a" },
    { min: 0, name: "Quiet", shape: "circle", n: 1, color: "#5b6878", hollow: true }
  ];

  const WINDOWS = {
    past3: { label: "Past 3 days", idx: [TODAY - 3, TODAY - 2, TODAY - 1] },
    next3: { label: "Next 3 days", idx: [TODAY, TODAY + 1, TODAY + 2] },
    next7: { label: "Next 7 days", idx: [0, 1, 2, 3, 4, 5, 6].map(i => TODAY + i) }
  };

  /* ============================================================
     Helpers
     ============================================================ */
  const $ = s => document.querySelector(s);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const fmt = n => (n < 0.05 ? "0" : n < 10 ? n.toFixed(1) : String(Math.round(n)));
  const ft = m => Math.round(m * 3.28084).toLocaleString();
  const tierOf = score => TIERS.find(t => score >= t.min);

  const cacheGet = (key, ttl) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      if (v && Date.now() - v.t < ttl) return v;
    } catch (e) { /* storage unavailable or corrupt */ }
    return null;
  };
  const cacheSet = (key, data) => {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* ignore */ }
  };

  // Short hash of the resort list, so editing resorts.js invalidates the forecast cache.
  const hashStr = s => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };
  const DATA_VERSION = hashStr(JSON.stringify(window.RESORTS));

  function km(lat1, lon1, lat2, lon2) {
    const rad = Math.PI / 180;
    const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
  }

  /* ============================================================
     State
     ============================================================ */
  const resorts = window.RESORTS.map(([name, st, region, lat, lon, base, summit, pass, passNote], id) => ({
    id, name, st, region, lat, lon, base, summit, pass: pass || "none", passNote,
    qElev: Math.round(base + 0.7 * (summit - base)),
    midElev: base + 0.55 * (summit - base),
    us: US.has(st),
    days: null,      // [{date, snow (in), snowAlt (in or null), tmax, tmin, wind}]
    station: null,   // nearest SNOTEL station
    obs: null        // {gain, depth} from SNOTEL
  }));

  const state = {
    view: "now",
    window: "next3",
    region: "All",
    pass: "All",         // All | epic | ikon | none
    ready: false,
    error: null,
    snotel: "pending",   // pending | ok | unavailable
    updated: null,
    stats: new Map(),    // resort id -> stats for whatever the current view scores
    active: null
  };

  /* ============================================================
     Powder score
     ============================================================ */
  function dayScore(d) {
    if (!d) return 0;
    const s = clamp(d.snow / 12);                       // 12" in a day maxes out snowfall
    const cold = clamp((34 - (d.tmax + d.tmin) / 2) / 14); // 34F -> 0, 20F or colder -> 1
    const calm = 1 - clamp((d.wind - 15) / 25);          // 15 mph -> 1, 40 mph -> 0
    const q = Math.sqrt(s);                              // cold and calm only matter if it snows
    return 100 * (0.65 * s + 0.25 * cold * q + 0.10 * calm * q);
  }

  // Diminishing returns across days: 1 - product of (1 - score).
  const combine = scores => 100 * (1 - scores.reduce((p, x) => p * (1 - clamp(x / 100)), 1));

  function stats(r, idxs, weights) {
    const w = weights || idxs.map(() => 1);
    const ds = idxs.map(i => r.days[i]);
    const snow = ds.reduce((a, d) => a + d.snow, 0);
    const score = combine(ds.map((d, k) => dayScore(d) * w[k]));
    const avg = d => (d.tmax + d.tmin) / 2;
    const avgT = snow > 0.1
      ? ds.reduce((a, d) => a + avg(d) * d.snow, 0) / snow   // temperature on the snowy days
      : ds.reduce((a, d) => a + avg(d), 0) / ds.length;
    const wind = Math.max(...ds.map(d => d.wind));
    const snowAlt = ds.every(d => d.snowAlt != null) ? ds.reduce((a, d) => a + d.snowAlt, 0) : null;
    return { snow, snowAlt, score, avgT, wind, ds };
  }

  // Compare the two models' snow totals. Only worth showing when either expects real snow.
  function confidence(st) {
    if (st.snowAlt == null) return null;
    const hi = Math.max(st.snow, st.snowAlt), lo = Math.min(st.snow, st.snowAlt);
    if (hi < 2) return null;
    const r = lo / hi;
    if (r >= 0.6) return { t: "Models agree", c: "ok" };
    if (r >= 0.3) return { t: "Models differ", c: "mid" };
    return { t: "Models split", c: "split" };
  }

  function confBadge(st) {
    const c = confidence(st);
    if (!c) return "";
    return `<span class="conf conf-${c.c}" title="Main model ${fmt(st.snow)}″, ECMWF ${fmt(st.snowAlt)}″">${c.t}<span class="conf-alt">ECMWF ${fmt(st.snowAlt)}″</span></span>`;
  }

  function blurb(st) {
    if (st.snow < 0.5) return "Not much snow in the forecast here.";
    const bits = [`${fmt(st.snow)}″ of new snow`];
    if (st.avgT <= 22) bits.push("cold enough for light, dry snow");
    else if (st.avgT <= 30) bits.push("temperatures that should ski well");
    else bits.push("warm temperatures, so expect heavier, wetter snow");
    if (st.wind >= 35) bits.push("and strong wind that may close upper lifts");
    else if (st.wind <= 15) bits.push("and light wind");
    return bits.join(", ") + ".";
  }

  /* ============================================================
     Data: Open-Meteo forecasts
     ============================================================ */
  // With several models, Open-Meteo suffixes each variable: snowfall_sum_best_match, etc.
  // Snowfall is in cm; ECMWF occasionally reports tiny negatives, so floor at 0.
  function parseDaily(daily) {
    const col = (v, m) => daily[`${v}_${MODELS[m]}`] || [];
    const snow = col("snowfall_sum", "main"), alt = col("snowfall_sum", "alt");
    const tmax = col("temperature_2m_max", "main"), tmin = col("temperature_2m_min", "main");
    const wind = col("wind_speed_10m_max", "main");
    return daily.time.map((date, i) => ({
      date,
      snow: Math.max(0, snow[i] || 0) / 2.54,
      snowAlt: alt[i] == null ? null : Math.max(0, alt[i]) / 2.54,
      tmax: tmax[i] ?? 32,
      tmin: tmin[i] ?? 32,
      wind: wind[i] ?? 0
    }));
  }

  async function loadForecasts(force) {
    const key = `ft:forecast:v2:${DATA_VERSION}`;
    if (!force) {
      const c = cacheGet(key, FORECAST_TTL);
      if (c && c.data.length === resorts.length) {
        c.data.forEach((days, i) => { resorts[i].days = days; });
        return c.t;
      }
    }
    const CHUNK = 30;
    for (let i = 0; i < resorts.length; i += CHUNK) {
      const part = resorts.slice(i, i + CHUNK);
      const params = new URLSearchParams({
        latitude: part.map(r => r.lat).join(","),
        longitude: part.map(r => r.lon).join(","),
        elevation: part.map(r => r.qElev).join(","),
        daily: "snowfall_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
        models: `${MODELS.main},${MODELS.alt}`,
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        timezone: "auto",
        past_days: PAST,
        forecast_days: FUTURE
      });
      const res = await fetch(`${METEO}?${params}`, { signal: AbortSignal.timeout(TIMEOUT) });
      if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : [json];
      list.forEach((loc, j) => { part[j].days = parseDaily(loc.daily); });
    }
    cacheSet(key, resorts.map(r => r.days));
    return Date.now();
  }

  /* ============================================================
     Data: SNOTEL (US snow depth), straight from the AWDB REST API
     ============================================================ */
  async function snotelFetch(endpoint, params) {
    const res = await fetch(`${AWDB}/${endpoint}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) throw new Error(`SNOTEL returned ${res.status}`);
    return res.json();
  }

  async function loadStations() {
    const c = cacheGet("ft:stations:v2", STATION_TTL);
    if (c) return c.data;
    // The triplet wildcard is what limits this to SNOTEL; a networkCodes param is ignored.
    const raw = await snotelFetch("stations", { stationTriplets: "*:*:SNTL", activeOnly: "true" });
    const list = raw
      .filter(s => s.latitude != null && s.longitude != null && s.elevation != null)
      .map(s => ({ id: s.stationTriplet, name: s.name, lat: s.latitude, lon: s.longitude, elev: s.elevation * 0.3048 }));
    cacheSet("ft:stations:v2", list);
    return list;
  }

  // Nearest station by distance, with a penalty for elevation mismatch (1 km ~ 40 m).
  function matchStations(stations) {
    for (const r of resorts) {
      r.station = null;
      if (!r.us) continue;
      let best = null;
      for (const s of stations) {
        const d = km(r.lat, r.lon, s.lat, s.lon);
        if (d > MAX_STATION_KM) continue;
        const cost = d + Math.abs(s.elev - r.midElev) / 40;
        if (!best || cost < best.cost) best = { ...s, dist: d, cost };
      }
      r.station = best;
    }
  }

  async function loadObservations() {
    const ids = [...new Set(resorts.filter(r => r.station).map(r => r.station.id))];
    if (!ids.length) return;
    const ref = resorts.find(r => r.days).days;
    const beginDate = ref[TODAY - 4].date;
    const endDate = ref[TODAY].date;
    const depth = {};
    for (let i = 0; i < ids.length; i += 40) {
      const raw = await snotelFetch("data", {
        stationTriplets: ids.slice(i, i + 40).join(","),
        elements: "SNWD",
        duration: "DAILY",
        beginDate,
        endDate
      });
      for (const rec of raw) {
        const el = (rec.data || []).find(d => d.stationElement && d.stationElement.elementCode === "SNWD");
        const map = {};
        ((el && el.values) || []).forEach(v => { if (v.value != null) map[v.date] = v.value; });
        depth[rec.stationTriplet] = map;
      }
    }
    for (const r of resorts) {
      if (!r.station) continue;
      const map = depth[r.station.id] || {};
      // Readings d-3 .. d. Each day-to-day gain covers one of the model's past 3 days.
      const dates = [TODAY - 3, TODAY - 2, TODAY - 1, TODAY].map(i => r.days[i].date);
      let gain = 0, pairs = 0;
      for (let i = 1; i < dates.length; i++) {
        const a = map[dates[i - 1]], b = map[dates[i]];
        if (a == null || b == null) continue;
        pairs++;
        if (b - a >= 1) gain += b - a;   // ignore settling and sensor noise
      }
      const latest = [...dates].reverse().map(d => map[d]).find(v => v != null);
      r.obs = pairs ? { gain, depth: latest ?? null } : (latest != null ? { gain: null, depth: latest } : null);
    }
  }

  async function loadAll(force) {
    state.ready = false;
    state.error = null;
    state.snotel = "pending";
    setStatus("Loading…", true);
    render();
    try {
      state.updated = await loadForecasts(force);
    } catch (e) {
      state.error = e.name === "TimeoutError" ? "the forecast service timed out" : e.message;
      setStatus("Forecast failed", false);
      render();
      return;
    }
    state.ready = true;
    buildMarkers();
    render();
    if (filtered()) fitRegion(visibleResorts().map(r => r.id));
    setStatus(null, false);
    try {
      matchStations(await loadStations());
      await loadObservations();
      state.snotel = "ok";
    } catch (e) {
      console.warn("SNOTEL unavailable:", e);
      state.snotel = "unavailable";
    }
    setStatus(null, false);
    render();
  }

  function setStatus(text, busy) {
    $("#refresh").disabled = busy;
    if (text) { $("#status").textContent = text; return; }
    const t = new Date(state.updated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const n = resorts.filter(r => r.obs).length;
    const snotel = state.snotel === "ok" ? `${n} SNOTEL` : state.snotel === "pending" ? "SNOTEL loading" : "SNOTEL offline";
    $("#status").textContent = `Updated ${t} · ${snotel}`;
  }

  /* ============================================================
     Map
     ============================================================ */
  // If the Leaflet CDN fails, drop the map and keep the list working.
  const map = window.L ? L.map("map", { zoomControl: true }).setView([46, -108], 4) : null;
  if (map) {
    // Standard OSM tiles (no key). styles.css inverts and dims them into a night map.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 12
    }).addTo(map);
  } else {
    $("#mapwrap").hidden = true;
  }
  const layer = map && L.layerGroup().addTo(map);
  const markers = new Map();

  function markerIcon(score, snow, active) {
    const t = tierOf(score);
    const s = Math.round(12 + Math.min(snow, 18) * 0.8);
    const cls = `mk mk-${t.shape}${t.n === 2 ? " mk-double" : ""}${t.hollow ? " mk-hollow" : ""}`;
    return L.divIcon({
      className: "mk-wrap" + (active ? " active" : ""),
      html: `<i class="${cls}" style="--c:${t.color};--s:${s}px"></i>`,
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2]
    });
  }

  function popupHtml(r) {
    const s = state.stats.get(r.id);
    if (!s) return `<div class="pop"><b>${r.name}</b></div>`;
    const t = tierOf(s.score);
    const obs = state.view === "now" && state.window === "past3" && r.obs && r.obs.gain != null
      ? `<div class="obs">SNOTEL measured +${fmt(r.obs.gain)}″</div>` : "";
    return `<div class="pop"><b>${r.name}</b><span>${r.st} · summit ${ft(r.summit)} ft</span>
      <div class="pop-amt">${fmt(s.snow)}${INCH}<em>${t.name}</em></div>${obs}</div>`;
  }

  function buildMarkers() {
    if (!map) return;
    layer.clearLayers();
    markers.clear();
    for (const r of resorts) {
      const m = L.marker([r.lat, r.lon], { icon: markerIcon(0, 0), riseOnHover: true, keyboard: true, title: r.name });
      m.bindPopup(() => popupHtml(r), { closeButton: false, offset: [0, -4] });
      m.on("click", () => setActive(r.id, { fly: false }));
      markers.set(r.id, m);
    }
  }

  function updateMarkers(visibleIds) {
    if (!map) return;
    layer.clearLayers();
    for (const id of visibleIds) {
      const s = state.stats.get(id);
      const m = markers.get(id);
      if (!s || !m) continue;
      m.setIcon(markerIcon(s.score, s.snow, id === state.active));
      m.setZIndexOffset(Math.round(s.score * 10));
      layer.addLayer(m);
    }
  }

  function fitRegion(ids) {
    if (!map) return;
    const pts = ids.map(id => [resorts[id].lat, resorts[id].lon]);
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 7 });
  }

  function setActive(id, { fly }) {
    state.active = id;
    document.querySelectorAll("[data-id]").forEach(el =>
      el.classList.toggle("active", Number(el.dataset.id) === id));
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el && !fly) el.scrollIntoView({ block: "nearest" });
    if (!map) return;
    const r = resorts[id];
    const m = markers.get(id);
    if (fly) map.flyTo([r.lat, r.lon], Math.max(map.getZoom(), 7), { duration: 0.6 });
    if (m) { m.openPopup(); }
    const s = state.stats.get(id);
    if (s) markers.forEach((mk, mid) => {
      const st = state.stats.get(mid);
      if (st && layer.hasLayer(mk)) mk.setIcon(markerIcon(st.score, st.snow, mid === id));
    });
  }

  /* ============================================================
     Rendering
     ============================================================ */
  const INCH = `<span class="inch">″</span>`;
  const amt = n => `<span class="amt">${fmt(n)}${INCH}</span>`;

  function glyph(t, size = 14, color = t.color) {
    const one = `<i class="mk mk-${t.shape}${t.hollow ? " mk-hollow" : ""}" style="--c:${color};--s:${size}px"></i>`;
    return `<span class="glyph">${t.n === 2 ? one + one : one}</span>`;
  }

  // Tier pill: the tier's own color as the fill, with a dark glyph on it.
  const tierPill = t =>
    `<span class="tier${t.hollow ? " hollow" : ""}" style="--c:${t.color}">${glyph(t, 10, t.hollow ? t.color : "#0e1622")}${t.name}</span>`;

  // Contour lines behind the hero. Decoration only.
  const TOPO = `<svg class="topo" aria-hidden="true" viewBox="0 0 800 500" preserveAspectRatio="none">${
    [0, 1, 2, 3, 4, 5, 6].map(k => {
      const y = 420 - k * 40;
      return `<path d="M-20 ${y} C120 ${y - 40} 200 ${y - 120} 320 ${y - 100} S540 ${y} 680 ${y - 60} S820 ${y - 160} 840 ${y - 150}"/>`;
    }).join("")
  }</svg>`;

  $("#legend").innerHTML = TIERS.slice().reverse().map(t =>
    `<span style="color:${t.hollow ? "" : t.color}">${glyph(t, 10)}${t.name}</span>`).join("");

  const PASS_FILTERS = [["All", "Any pass"], ["epic", "Epic"], ["ikon", "Ikon"], ["none", "No pass"]];

  function passMatches(r) {
    if (state.pass === "All") return true;
    if (state.pass === "epic") return r.pass === "epic" || r.pass === "epic-limited";
    return r.pass === state.pass;
  }

  function visibleResorts() {
    return resorts.filter(r => r.days && (state.region === "All" || r.region === state.region) && passMatches(r));
  }

  function passPill(r) {
    if (r.pass === "none") return "";
    const epic = r.pass !== "ikon";
    const label = r.pass === "epic-limited" ? `Epic · ${r.passNote}` : epic ? "Epic" : "Ikon";
    return `<span class="pass ${epic ? "pass-epic" : "pass-ikon"}">${label}</span>`;
  }

  function renderControls() {
    const regions = ["All", ...new Set(resorts.map(r => r.region))];
    const select = `<label class="sel"><span class="sr">Region</span><select id="region">${
      regions.map(x => `<option value="${x}"${x === state.region ? " selected" : ""}>${x === "All" ? "All regions" : x}</option>`).join("")
    }</select></label>`;
    const passSelect = `<label class="sel"><span class="sr">Pass</span><select id="pass">${
      PASS_FILTERS.map(([v, l]) => `<option value="${v}"${v === state.pass ? " selected" : ""}>${l}</option>`).join("")
    }</select></label>`;
    const share = `<button type="button" class="ghost share" id="share">Copy link</button>`;
    let html = "";
    if (state.view === "now") {
      html = `<div class="seg" role="group" aria-label="Time window">${
        Object.entries(WINDOWS).map(([k, w]) =>
          `<button type="button" data-win="${k}" aria-pressed="${k === state.window}">${w.label}</button>`).join("")
      }</div>` + select + passSelect + share;
    } else if (state.view === "weekend") {
      html = select + passSelect + share;
    }
    $("#controls").innerHTML = html;
  }

  function rowHtml(r, s, rank, extra = "") {
    const t = tierOf(s.score);
    const meta = `${r.st} · ${t.name} · avg ${Math.round(s.avgT)}°F · wind ${Math.round(s.wind)} mph`;
    return `<li><button type="button" class="row${r.id === state.active ? " active" : ""}" data-id="${r.id}">
      <span class="rank">${String(rank).padStart(2, "0")}</span>
      ${glyph(t, 16)}
      <span class="who">
        <span class="who-top"><span class="name">${r.name}</span>${passPill(r)}</span>
        <span class="meta"><span>${meta}</span>${extra}</span>
        <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="--w:${Math.round(s.score)}%"></span></span>
      </span>
      ${amt(s.snow)}
    </button></li>`;
  }

  const stat = (label, value, cls = "") => `<div><span>${label}</span><b class="${cls}">${value}</b></div>`;

  // The deepest resort in the window, big. Past days compare to SNOTEL; forecasts to ECMWF.
  function heroHtml(top, w, count) {
    if (!top) return "";
    const { r, s } = top;
    const t = tierOf(s.score);
    const quiet = s.score < 5;
    let check;
    if (state.window === "past3") {
      check = r.obs && r.obs.gain != null ? stat("SNOTEL measured", `${fmt(r.obs.gain)}″`) : stat("SNOTEL measured", "n/a");
    } else if (s.snowAlt == null) {
      check = stat("ECMWF says", "n/a");
    } else {
      const c = confidence(s);
      check = stat("ECMWF says", `${fmt(s.snowAlt)}″${c ? `<small>${c.t.replace("Models ", "")}</small>` : ""}`, c ? c.c : "");
    }
    return `<section class="hero${quiet ? " quiet" : ""}">${TOPO}
      <div class="kicker">${quiet ? "Nothing deep yet" : "Deepest"} · ${w.label} · ${count} resorts</div>
      <div class="hero-main">
        <div class="big">${fmt(s.snow)}${INCH}</div>
        <div>
          <h2>${r.name}</h2>
          <div class="hero-tags">${tierPill(t)}${passPill(r)}<span class="st">${r.st}</span></div>
        </div>
      </div>
      <div class="stats">
        ${stat("Avg temp", `${Math.round(s.avgT)}°F`)}
        ${stat("Wind to", `${Math.round(s.wind)} mph`)}
        ${check}
      </div>
    </section>`;
  }

  function renderNow() {
    const w = WINDOWS[state.window];
    const rows = visibleResorts()
      .map(r => ({ r, s: stats(r, w.idx) }))
      .sort((a, b) => b.s.score - a.s.score || b.s.snow - a.s.snow);
    state.stats = new Map(rows.map(x => [x.r.id, x.s]));
    $("#hero").innerHTML = heroHtml(rows[0], w, rows.length);
    // Past days get the SNOTEL measurement; forecast windows get the second-model check.
    const html = rows.map(({ r, s }, i) => {
      const chip = state.window !== "past3" ? confBadge(s)
        : r.obs && r.obs.gain != null
          ? `<span class="chip" title="Snow depth gain at ${r.station.name}">SNOTEL +${fmt(r.obs.gain)}″</span>` : "";
      return rowHtml(r, s, i + 1, chip);
    }).join("");
    $("#content").innerHTML = rows.length ? `<ol class="list">${html}</ol>`
      : `<p class="note">No resorts match these filters. Try a different region or pass.</p>`;
    return rows.map(x => x.r.id);
  }

  function weekendIdx() {
    const days = resorts[0].days;
    const wd = i => new Date(days[i].date + "T12:00:00").getDay();
    let sat;
    if (wd(TODAY) === 0) sat = days.findIndex((d, i) => i > TODAY && wd(i) === 6);   // Sunday: look ahead
    else sat = days.findIndex((d, i) => i >= TODAY && wd(i) === 6);
    return { fri: sat - 1, sat, sun: sat + 1 };
  }

  function renderWeekend() {
    const idx = weekendIdx();
    const ids = [idx.fri, idx.sat, idx.sun];
    const days = resorts[0].days;
    const date = i => new Date(days[i].date + "T12:00:00");
    const dow = i => date(i).toLocaleDateString([], { weekday: "short" });
    const rows = visibleResorts()
      .map(r => ({ r, s: stats(r, ids, [0.7, 1, 0.9]) }))   // Friday snow is fresh on Saturday; Sunday is leftovers
      .sort((a, b) => b.s.score - a.s.score || b.s.snow - a.s.snow);
    state.stats = new Map(rows.map(x => [x.r.id, x.s]));

    const top = rows.slice(0, 3);
    const quiet = !top.length || top[0].s.score < 5;

    $("#hero").innerHTML = `<section class="wk-head">
      <div class="kicker">Where to ride</div>
      <h2>${dow(idx.sat)} ${date(idx.sat).getDate()}<span class="slash"> / </span>${dow(idx.sun)} ${date(idx.sun).getDate()}</h2>
      <p>Friday’s snow counts as fresh on Saturday. Sunday is leftovers.</p>
    </section>`;

    const cards = quiet ? "" : top.map(({ r, s }, k) => {
      const t = tierOf(s.score);
      const cells = ids.map(i => {
        const d = r.days[i];
        return `<span class="day"><span>${dow(i)}</span><b>${fmt(d.snow)}″</b><small>${Math.round(d.tmin)}–${Math.round(d.tmax)}°F</small></span>`;
      }).join("");
      return `<button type="button" class="card${k === 0 ? " top" : ""}${r.id === state.active ? " active" : ""}" data-id="${r.id}">
        <span class="ghost-rank" aria-hidden="true">${k + 1}</span>
        <span class="card-tags">${tierPill(t)}${passPill(r)}<span class="st">${r.st}</span></span>
        <span class="card-mid"><span class="card-name">${r.name}</span>${amt(s.snow)}</span>
        <span class="days">${cells}</span>
        <span class="blurb">${blurb(s)}</span>${confBadge(s)}
      </button>`;
    }).join("");

    const offset = quiet ? 1 : 4;
    const rest = (quiet ? rows : rows.slice(3)).map(({ r, s }, i) => rowHtml(r, s, i + offset, confBadge(s))).join("");
    $("#picks").innerHTML = quiet ? `<p class="note">Nothing worth chasing this weekend. Check back when storms start rolling in.</p>`
      : `<div class="cards">${cards}</div>`;
    $("#content").innerHTML = `
      ${rest ? `<h3 class="rest-title">${quiet ? "All resorts" : "Also in the running"}</h3><ol class="list">${rest}</ol>` : ""}`;
    return rows.map(x => x.r.id);
  }

  function verdict(obs, model) {
    const diff = model - obs;
    if (Math.abs(diff) <= Math.max(1.5, obs * 0.3)) return { t: "Close", c: "ok" };
    return diff > 0 ? { t: "Model high", c: "hi" } : { t: "Model low", c: "lo" };
  }

  function renderCheck() {
    const note = (text, err) => `<p class="note${err ? " err" : ""}">${text}</p>`;
    if (state.snotel === "pending") { $("#content").innerHTML = note("Loading SNOTEL observations…"); return []; }
    if (state.snotel === "unavailable") {
      $("#content").innerHTML = note("Couldn’t reach the SNOTEL service. It has occasional outages; press Refresh to retry.", true);
      return [];
    }
    const rows = resorts
      .filter(r => r.days && r.station && r.obs && r.obs.gain != null)
      .map(r => {
        const model = r.days.slice(TODAY - 3, TODAY).reduce((a, d) => a + d.snow, 0);
        return { r, model, obs: r.obs.gain, v: verdict(r.obs.gain, model) };
      })
      .sort((a, b) => Math.max(b.obs, b.model) - Math.max(a.obs, a.model));

    if (!rows.length) {
      $("#content").innerHTML = note("No SNOTEL readings matched resorts yet. Outside winter, most stations report no new snow.");
      return [];
    }
    const meanObs = rows.reduce((a, x) => a + x.obs, 0) / rows.length;
    const meanModel = rows.reduce((a, x) => a + x.model, 0) / rows.length;
    const bias = meanModel - meanObs;
    const sum = Math.abs(bias) < 0.5 || (meanObs + meanModel) < 1
      ? "The model and the stations agree on average."
      : bias > 0 ? `The model is running high by about ${fmt(bias)}″ per resort.` : `The model is running low by about ${fmt(-bias)}″ per resort.`;

    $("#content").innerHTML = `<div class="check">
      <div class="kicker">Model check · past 3 days</div>
      <p class="summary">${rows.length} resorts averaged ${fmt(meanModel)}″ in the model and ${fmt(meanObs)}″ at the nearest SNOTEL station. ${sum} Treat forecast totals accordingly.</p>
      <div class="tablewrap"><table>
        <thead><tr><th>Resort</th><th>Station</th><th class="num">Measured</th><th class="num">Model</th><th>Verdict</th><th class="num">Base depth</th></tr></thead>
        <tbody>${rows.map(({ r, model, obs, v }) => `<tr>
          <td><b>${r.name}</b> <small>${r.st}</small></td>
          <td>${r.station.name} <small>${Math.round(r.station.dist)} km · ${ft(r.station.elev)} ft</small></td>
          <td class="num">${fmt(obs)}″</td><td class="num">${fmt(model)}″</td>
          <td><span class="v ${v.c}">${v.t}</span></td>
          <td class="num">${r.obs.depth != null ? Math.round(r.obs.depth) + "″" : "n/a"}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>`;
    return [];
  }

  function render() {
    writeHash();
    document.querySelectorAll(".tabs button").forEach(b => {
      if (b.dataset.view === state.view) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    $("#app").dataset.view = state.view;
    renderControls();
    $("#hero").innerHTML = "";
    $("#picks").innerHTML = "";

    if (state.error) {
      $("#content").innerHTML = `<p class="note err">Couldn’t load forecasts: ${state.error}. Check your connection and press Refresh.</p>`;
      return;
    }
    if (!state.ready) { $("#content").innerHTML = `<p class="note">Loading forecasts for ${resorts.length} resorts…</p>`; return; }

    let ids = [];
    if (state.view === "now") ids = renderNow();
    else if (state.view === "weekend") ids = renderWeekend();
    else ids = renderCheck();

    if (state.view !== "check" && map) {
      updateMarkers(ids);
      setTimeout(() => map.invalidateSize(), 0);
    }
  }

  /* ============================================================
     Events
     ============================================================ */
  /* URL hash carries the view and any non-default filters, so a link reproduces the screen:
     #weekend?region=Utah&pass=ikon or #now?win=next7 */
  const VIEWS = ["now", "weekend", "check"];
  const REGIONS = new Set(resorts.map(r => r.region));

  function readHash() {
    const [view, qs] = location.hash.slice(1).split("?");
    const p = new URLSearchParams(qs || "");
    state.view = VIEWS.includes(view) ? view : "now";
    state.window = WINDOWS[p.get("win")] ? p.get("win") : "next3";
    state.region = REGIONS.has(p.get("region")) ? p.get("region") : "All";
    state.pass = PASS_FILTERS.some(([v]) => v === p.get("pass")) ? p.get("pass") : "All";
  }

  function writeHash() {
    const p = new URLSearchParams();
    if (state.view === "now" && state.window !== "next3") p.set("win", state.window);
    if (state.region !== "All") p.set("region", state.region);
    if (state.pass !== "All") p.set("pass", state.pass);
    const qs = p.toString();
    const hash = `#${state.view}${qs ? "?" + qs : ""}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  const filtered = () => state.region !== "All" || state.pass !== "All";

  function setView(view) {
    state.view = view;
    state.active = null;
    render();
  }

  window.addEventListener("hashchange", () => {
    readHash();
    render();
    if (state.ready) fitRegion(visibleResorts().map(r => r.id));
  });

  document.querySelector(".tabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-view]");
    if (b) setView(b.dataset.view);
  });

  $("#controls").addEventListener("click", async e => {
    if (e.target.id === "share") {
      const b = e.target;
      try {
        await navigator.clipboard.writeText(location.href);
        b.textContent = "Link copied";
        b.classList.add("copied");
      } catch (err) {
        b.textContent = "Copy from the address bar";
      }
      setTimeout(() => { if (b.isConnected) { b.textContent = "Copy link"; b.classList.remove("copied"); } }, 1800);
      return;
    }
    const b = e.target.closest("button[data-win]");
    if (!b) return;
    state.window = b.dataset.win;
    render();
  });

  $("#controls").addEventListener("change", e => {
    if (e.target.id === "region") state.region = e.target.value;
    else if (e.target.id === "pass") state.pass = e.target.value;
    else return;
    render();
    fitRegion(visibleResorts().map(r => r.id));
  });

  $("#content").addEventListener("click", e => {
    const el = e.target.closest("[data-id]");
    if (el) setActive(Number(el.dataset.id), { fly: true });
  });

  $("#refresh").addEventListener("click", () => loadAll(true));

  /* ============================================================
     Go
     ============================================================ */
  readHash();
  loadAll(false);
})();
