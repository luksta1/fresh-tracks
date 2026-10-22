/* HTML for each view. Pure functions: data in, markup out. Strings from outside this repo go
   through esc(); resort names and regions come from resorts.js. */
import { PASS_FILTERS, RUN_COLORS, RUNS, TIERS, TODAY, WINDOWS } from "./config.js";
import { blurb, confidence, tierOf } from "./score.js";
import { esc, fmt, ft } from "./util.js";

export const INCH = `<span class="inch">″</span>`;
const amt = n => `<span class="amt">${fmt(n)}${INCH}</span>`;
const dateOf = d => new Date(d.date + "T12:00:00");
const dow = d => dateOf(d).toLocaleDateString("en-US", { weekday: "short" });

/* ---------- small parts ---------- */

export function glyph(t, size = 14, color = t.color) {
  const one = `<i class="mk mk-${t.shape}${t.hollow ? " mk-hollow" : ""}" style="--c:${color};--s:${size}px"></i>`;
  return `<span class="glyph">${t.n === 2 ? one + one : one}</span>`;
}

// Tier pill: the tier's own color as the fill, with a dark glyph on it.
export const tierPill = t =>
  `<span class="tier${t.hollow ? " hollow" : ""}" style="--c:${t.color}">${glyph(t, 10, t.hollow ? t.color : "#0e1622")}${t.name}</span>`;

export function passPill(r) {
  if (r.pass === "none") return "";
  const epic = r.pass !== "ikon";
  const label = r.pass === "epic-limited" && r.passNote ? `Epic · ${r.passNote}` : epic ? "Epic" : "Ikon";
  return `<span class="pass ${epic ? "pass-epic" : "pass-ikon"}">${label}</span>`;
}

export function confBadge(st) {
  const c = confidence(st);
  if (!c) return "";
  return `<span class="conf conf-${c.c}" title="Main model ${fmt(st.snow)}″, ECMWF ${fmt(st.snowAlt)}″">${c.t}<span class="conf-alt">ECMWF ${fmt(st.snowAlt)}″</span></span>`;
}

const snotelChip = r => r.obs?.gain != null
  ? `<span class="chip" title="Snow depth gain at ${esc(r.station.name)}">SNOTEL +${fmt(r.obs.gain)}″</span>` : "";

// The mountain itself: lifts, vertical, trail length, and the green/blue/black mix by length.
// `tag` is "span" inside buttons (weekend cards), where a div isn't allowed.
const MIX = [["green", "circle"], ["blue", "square"], ["black", "diamond"], ["double", "diamond"]];
export function mountainHtml(r, tag = "div") {
  const m = r.meta;
  if (!m) return "";
  const facts = [`${m.lifts} lifts`, `${ft(r.summit - r.base)} ft vert`, m.runKm ? `${m.runKm} km of runs` : ""].filter(Boolean);
  const mix = m.mix ? `<span class="mix" role="img" aria-label="Trail mix by length: ${
      MIX.map(([k]) => `${m.mix[k]}% ${k === "double" ? "double black" : k}`).join(", ")}">
      <span class="mix-bar" aria-hidden="true">${MIX.map(([k]) => m.mix[k] ? `<i class="mix-${k}" style="flex:${m.mix[k]}"></i>` : "").join("")}</span>
      <span class="mix-keys" aria-hidden="true">${MIX.filter(([k]) => m.mix[k]).map(([k, shape]) =>
        `<span>${glyph({ shape, n: k === "double" ? 2 : 1, color: `var(--mix-${k})` }, 8)}${m.mix[k]}%</span>`).join("")}</span>
    </span>` : "";
  return `<${tag} class="mountain"><span class="facts">${facts.join(" · ")}</span>${mix}</${tag}>`;
}

// Contour lines behind the hero. Decoration only.
const TOPO = `<svg class="topo" aria-hidden="true" viewBox="0 0 800 500" preserveAspectRatio="none">${
  [0, 1, 2, 3, 4, 5, 6].map(k => {
    const y = 420 - k * 40;
    return `<path d="M-20 ${y} C120 ${y - 40} 200 ${y - 120} 320 ${y - 100} S540 ${y} 680 ${y - 60} S820 ${y - 160} 840 ${y - 150}"/>`;
  }).join("")
}</svg>`;

// Two keys, because markers and runs share colors: zoomed out, markers by powder score; zoomed in
// (trails drawn), runs by difficulty. CSS shows the one that matches the map.
export const legendHtml = () =>
  `<div class="legend-far"><b>Powder score</b>${TIERS.slice().reverse().map(t =>
    `<span style="color:${t.hollow ? "" : t.color}">${glyph(t, 10)}${t.name}</span>`).join("")}<span class="hint">Zoom in for trails</span></div>` +
  `<div class="legend-near"><b>Trail difficulty</b>${RUNS.map(r =>
    `<span style="color:${RUN_COLORS[r.sign]}">${glyph({ ...r, color: RUN_COLORS[r.sign] }, 10)}${r.name}</span>`).join("")}<span><i class="lift-key"></i>Lift</span></div>`;

// Hover text for a run or lift. Names come from OpenStreetMap, and Leaflet tooltips render HTML.
export function trailTip(kind, sign, name) {
  if (kind === "lift") return name ? `${esc(name)} · Lift` : "Lift";
  const level = RUNS.find(r => r.sign === sign)?.name || "Unrated";
  return name ? `${esc(name)} · ${level}` : `${level} run`;
}

export const note = (text, err) => `<p class="note${err ? " err" : ""}">${text}</p>`;

// Placeholder blocks for the first load, shaped like the hero and the ranked list.
export function skeletonHtml(view, count) {
  const row = `<li class="skel-row"><i></i><i></i><span><i></i><i></i></span><i></i></li>`;
  return {
    hero: view === "check" ? "" : `<div class="skel-hero" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`,
    content: `<p class="sr">Loading forecasts for ${count} resorts…</p><ol class="list skel" aria-hidden="true">${row.repeat(8)}</ol>`
  };
}

/* ---------- controls ---------- */

export function controlsHtml(state, regions) {
  if (state.view === "check") return "";
  const select = `<label class="sel"><span class="sr">Region</span><select id="region">${
    ["All", ...regions].map(x => `<option value="${x}"${x === state.region ? " selected" : ""}>${x === "All" ? "All regions" : x}</option>`).join("")
  }</select></label>`;
  const pass = `<label class="sel"><span class="sr">Pass</span><select id="pass">${
    PASS_FILTERS.map(([v, l]) => `<option value="${v}"${v === state.pass ? " selected" : ""}>${l}</option>`).join("")
  }</select></label>`;
  const share = `<button type="button" class="ghost share" id="share">Copy link</button>`;
  const windows = state.view !== "now" ? "" : `<div class="seg" role="group" aria-label="Time window">${
    Object.entries(WINDOWS).map(([k, w]) =>
      `<button type="button" data-win="${k}" aria-pressed="${k === state.window}">${w.label}</button>`).join("")
  }</div>`;
  return windows + select + pass + share;
}

/* ---------- ranked list ---------- */

// A ranked row. The active row also shows its day-by-day strip; `hot` is the days being scored.
export function rowHtml(r, s, rank, active, extra = "", hot = []) {
  const t = tierOf(s.score);
  const meta = `${r.st} · ${t.name} · avg ${Math.round(s.avgT)}°F · wind ${Math.round(s.wind)} mph`;
  return `<li><button type="button" class="row${active ? " active" : ""}" data-id="${r.id}" aria-expanded="${active}">
    <span class="rank">${String(rank).padStart(2, "0")}</span>
    ${glyph(t, 16)}
    <span class="who">
      <span class="who-top"><span class="name">${r.name}</span>${passPill(r)}</span>
      <span class="meta"><span>${meta}</span>${extra}</span>
      <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="--w:${Math.round(s.score)}%"></span></span>
    </span>
    ${amt(s.snow)}
  </button>${active ? dayStripHtml(r, hot) : ""}</li>`;
}

// Day-by-day snowfall: the past 3 days, today and the next 6. Bars share one scale per resort;
// the dashed outline behind each is ECMWF's amount. `hot` days (the ones the view scores) are lit.
export function dayStripHtml(r, hot = []) {
  const idx = Array.from({ length: 10 }, (_, k) => TODAY - 3 + k);
  const days = idx.map(i => r.days[i]);
  const top = Math.max(4, ...days.flatMap(d => [d.snow, d.snowAlt ?? 0]));
  const h = v => `${Math.round(100 * v / top)}%`;
  const cells = idx.map((i, k) => {
    const d = days[k];
    const cls = [i < TODAY && "past", hot.includes(i) && "hot"].filter(Boolean).join(" ");
    const alt = d.snowAlt == null ? "" : `<i class="alt" style="height:${h(d.snowAlt)}"></i>`;
    return `<li${cls ? ` class="${cls}"` : ""}>
      <span class="d-amt">${fmt(d.snow)}″</span>
      <span class="d-bars" aria-hidden="true">${alt}<i class="main" style="height:${h(d.snow)}"></i></span>
      <span class="d-day">${i === TODAY ? "Today" : dow(d)}</span>
      <span class="d-temp">${Math.round(d.tmin)}–${Math.round(d.tmax)}°</span>${
      d.snowAlt == null ? "" : `<span class="sr">ECMWF ${fmt(d.snowAlt)}″</span>`}
    </li>`;
  }).join("");
  return `<div class="detail">
    <ol class="strip" aria-label="Snowfall by day at ${r.name}">${cells}</ol>
    <p class="strip-key"><span><i class="k-main"></i>Main model</span><span><i class="k-alt"></i>ECMWF</span><span class="k-past">Dashed: past days</span></p>
  </div>`;
}

/* ---------- right now ---------- */

const stat = (label, value, cls = "") => `<div><span>${label}</span><b class="${cls}">${value}</b></div>`;

// The deepest resort in the window, big. Past days compare to SNOTEL; forecasts to ECMWF.
export function heroHtml(top, windowKey, count) {
  if (!top) return "";
  const { r, s } = top;
  const w = WINDOWS[windowKey];
  const t = tierOf(s.score);
  const quiet = s.score < 5;
  let check;
  if (windowKey === "past3") {
    check = stat("SNOTEL measured", r.obs?.gain != null ? `${fmt(r.obs.gain)}″` : "n/a");
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
    ${mountainHtml(r)}
    <div class="stats">
      ${stat("Avg temp", `${Math.round(s.avgT)}°F`)}
      ${stat("Wind to", `${Math.round(s.wind)} mph`)}
      ${check}
    </div>
  </section>`;
}

// rows: [{r, s}] sorted best first.
export function nowListHtml(rows, windowKey, activeId) {
  if (!rows.length) return note("No resorts match these filters. Try a different region or pass.");
  // Past days get the SNOTEL measurement; forecast windows get the second-model check.
  return `<ol class="list">${rows.map(({ r, s }, i) =>
    rowHtml(r, s, i + 1, r.id === activeId, windowKey === "past3" ? snotelChip(r) : confBadge(s), WINDOWS[windowKey].idx)).join("")}</ol>`;
}

/* ---------- this weekend ---------- */

export function weekendHeadHtml(days, idx) {
  const sat = days[idx.sat], sun = days[idx.sun];
  return `<section class="wk-head">
    <div class="kicker">Where to ride</div>
    <h2><span class="nw">${dow(sat)} ${dateOf(sat).getDate()}</span><span class="slash"> / </span><span class="nw">${dow(sun)} ${dateOf(sun).getDate()}</span></h2>
    <p>Friday’s snow counts as fresh on Saturday. Sunday is leftovers.</p>
  </section>`;
}

// Top three as cards, the rest as a list. Returns {picks, rest} markup.
export function weekendHtml(rows, dayIdx, activeId) {
  const quiet = !rows.length || rows[0].s.score < 5;
  const cards = rows.slice(0, 3).map(({ r, s }, k) => {
    const t = tierOf(s.score);
    const cells = dayIdx.map(i => {
      const d = r.days[i];
      return `<span class="day"><span>${dow(d)}</span><b>${fmt(d.snow)}″</b><small>${Math.round(d.tmin)}–${Math.round(d.tmax)}°F</small></span>`;
    }).join("");
    return `<button type="button" class="card${k === 0 ? " top" : ""}${r.id === activeId ? " active" : ""}" data-id="${r.id}">
      <span class="ghost-rank" aria-hidden="true">${k + 1}</span>
      <span class="card-tags">${tierPill(t)}${passPill(r)}<span class="st">${r.st}</span></span>
      <span class="card-mid"><span class="card-name">${r.name}</span>${amt(s.snow)}</span>
      <span class="days">${cells}</span>
      <span class="blurb">${blurb(s)}</span>${confBadge(s)}
      ${mountainHtml(r, "span")}
    </button>`;
  }).join("");
  const restRows = quiet ? rows : rows.slice(3);
  const offset = quiet ? 1 : 4;
  const rest = restRows.map(({ r, s }, i) => rowHtml(r, s, i + offset, r.id === activeId, confBadge(s), dayIdx)).join("");
  return {
    picks: quiet ? note("Nothing worth chasing this weekend. Check back when storms start rolling in.") : `<div class="cards">${cards}</div>`,
    rest: rest ? `<h3 class="rest-title">${quiet ? "All resorts" : "Also in the running"}</h3><ol class="list">${rest}</ol>` : ""
  };
}

/* ---------- model check ---------- */

// rows: [{r, model, obs, v}] from main.js.
export function checkHtml(rows) {
  const meanObs = rows.reduce((a, x) => a + x.obs, 0) / rows.length;
  const meanModel = rows.reduce((a, x) => a + x.model, 0) / rows.length;
  const bias = meanModel - meanObs;
  const sum = Math.abs(bias) < 0.5 || (meanObs + meanModel) < 1
    ? "The model and the stations agree on average."
    : bias > 0 ? `The model is running high by about ${fmt(bias)}″ per resort.` : `The model is running low by about ${fmt(-bias)}″ per resort.`;
  return `<div class="check">
    <div class="kicker">Model check · past 3 days</div>
    <p class="summary">${rows.length} resorts averaged ${fmt(meanModel)}″ in the model and ${fmt(meanObs)}″ at the nearest SNOTEL station. ${sum} Treat forecast totals accordingly.</p>
    <div class="tablewrap"><table>
      <thead><tr><th>Resort</th><th>Station</th><th class="num">Measured</th><th class="num">Model</th><th>Verdict</th><th class="num">Base depth</th></tr></thead>
      <tbody>${rows.map(({ r, model, obs, v }) => `<tr>
        <td><b>${r.name}</b> <small>${r.st}</small></td>
        <td>${esc(r.station.name)} <small>${Math.round(r.station.dist)} km · ${ft(r.station.elev)} ft</small></td>
        <td class="num">${fmt(obs)}″</td><td class="num">${fmt(model)}″</td>
        <td><span class="v ${v.c}">${v.t}</span></td>
        <td class="num">${r.obs.depth != null ? Math.round(r.obs.depth) + "″" : "n/a"}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

/* ---------- map popup ---------- */

export function popupHtml(r, s, showObs) {
  if (!s) return `<div class="pop"><b>${r.name}</b></div>`;
  const obs = showObs && r.obs?.gain != null ? `<div class="obs">SNOTEL measured +${fmt(r.obs.gain)}″</div>` : "";
  return `<div class="pop"><b>${r.name}</b><span>${r.st} · summit ${ft(r.summit)} ft${r.meta ? ` · ${r.meta.lifts} lifts` : ""}</span>
    <div class="pop-amt">${fmt(s.snow)}${INCH}<em>${tierOf(s.score).name}</em></div>${obs}${apresHtml(r)}</div>`;
}

// Google Maps search for a bar by name, resort and state. It always resolves, unlike a guessed
// website URL; the "where" labels are wayfinding phrases that would muddy the search.
export const mapsLink = (name, r) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${r.name}, ${r.st}`)}`;

// Après picks from apres.js, which people edit by hand, so everything is escaped.
function apresHtml(r) {
  if (!r.apres?.length) return `<div class="pop-apres"><div class="pop-label">Après</div><p class="pop-none">No picks yet. Add some in apres.js.</p></div>`;
  return `<div class="pop-apres"><div class="pop-label">Après</div><ol>${r.apres.slice(0, 3).map(([name, where, note]) => {
    const detail = [where, note].filter(Boolean).map(esc).join(" · ");
    return `<li>
      <a href="${mapsLink(name, r)}" target="_blank" rel="noopener">${esc(name)}</a>${detail ? `
      <small>${detail}</small>` : ""}
    </li>`;
  }).join("")}</ol></div>`;
}
