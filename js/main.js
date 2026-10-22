/* Fresh Tracks: state, rendering and events. No build step, no framework. */
import { RESORTS } from "../resorts.js";
import { RESORT_META } from "../resort-meta.js";
import { TODAY, WEEKEND_WEIGHTS, WINDOWS } from "./config.js";
import { buildResorts, loadForecasts, loadObservations, loadStations, matchStations } from "./data.js";
import { createMap } from "./map.js";
import { passMatches, stats, verdict, weekendIdx } from "./score.js";
import { DEFAULTS, parseHash, toHash } from "./url.js";
import { hashStr } from "./util.js";
import * as V from "./views.js";

const $ = s => document.querySelector(s);

const resorts = buildResorts(RESORTS, RESORT_META);
const REGIONS = [...new Set(resorts.map(r => r.region))];
// Editing resorts.js or regenerating resort-meta.js invalidates the forecast cache.
const DATA_VERSION = hashStr(JSON.stringify([RESORTS, RESORT_META]));

const state = {
  ...DEFAULTS,         // view, window, region, pass (mirrored in the URL hash)
  ready: false,
  error: null,
  snotel: "pending",   // pending | ok | unavailable
  updated: null,
  stats: new Map(),    // resort id -> stats for whatever the current view scores
  hot: [],             // day indices the current view scores, lit in the day-by-day strip
  active: null
};

const map = createMap($("#map"), {
  resorts,
  popup: r => V.popupHtml(r, state.stats.get(r.id), state.view === "now" && state.window === "past3"),
  onPick: id => select(id, false)
});
if (!map) $("#mapwrap").hidden = true;
$("#legend").innerHTML = V.legendHtml();

/* ---------- rendering ---------- */

const visible = () => resorts.filter(r => r.days && (state.region === "All" || r.region === state.region) && passMatches(state.pass, r));
const filtered = () => state.region !== DEFAULTS.region || state.pass !== DEFAULTS.pass;
const ranked = (idx, weights) => visible()
  .map(r => ({ r, s: stats(r.days, idx, weights) }))
  .sort((a, b) => b.s.score - a.s.score || b.s.snow - a.s.snow);

function renderNow() {
  state.hot = WINDOWS[state.window].idx;
  const rows = ranked(state.hot);
  state.stats = new Map(rows.map(x => [x.r.id, x.s]));
  $("#hero").innerHTML = V.heroHtml(rows[0], state.window, rows.length);
  $("#content").innerHTML = V.nowListHtml(rows, state.window, state.active);
  return rows.map(x => x.r.id);
}

function renderWeekend() {
  const days = resorts[0].days;
  const idx = weekendIdx(days);
  const dayIdx = [idx.fri, idx.sat, idx.sun];
  state.hot = dayIdx;
  const rows = ranked(dayIdx, WEEKEND_WEIGHTS);
  state.stats = new Map(rows.map(x => [x.r.id, x.s]));
  const { picks, rest } = V.weekendHtml(rows, dayIdx, state.active);
  $("#hero").innerHTML = V.weekendHeadHtml(days, idx);
  $("#picks").innerHTML = picks;
  $("#content").innerHTML = rest;
  return rows.map(x => x.r.id);
}

function renderCheck() {
  if (state.snotel === "pending") return void ($("#content").innerHTML = V.note("Loading SNOTEL observations…"));
  if (state.snotel === "unavailable") {
    return void ($("#content").innerHTML = V.note("Couldn’t reach the SNOTEL service. It has occasional outages; press Refresh to retry.", true));
  }
  const rows = resorts
    .filter(r => r.days && r.station && r.obs?.gain != null)
    .map(r => {
      const model = r.days.slice(TODAY - 3, TODAY).reduce((a, d) => a + d.snow, 0);
      return { r, model, obs: r.obs.gain, v: verdict(r.obs.gain, model) };
    })
    .sort((a, b) => Math.max(b.obs, b.model) - Math.max(a.obs, a.model));
  $("#content").innerHTML = rows.length ? V.checkHtml(rows)
    : V.note("No SNOTEL readings matched resorts yet. Outside winter, most stations report no new snow.");
}

let lastView = null;
function render() {
  const hash = toHash(state);
  if (location.hash !== hash) history.replaceState(null, "", hash);
  document.querySelectorAll(".tabs button").forEach(b => {
    if (b.dataset.view === state.view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#app").dataset.view = state.view;

  // Rebuilding the controls would drop keyboard focus from a select; put it back.
  const focused = document.activeElement?.closest("#controls") ? document.activeElement.id : null;
  $("#controls").innerHTML = V.controlsHtml(state, REGIONS);
  if (focused) document.getElementById(focused)?.focus();

  $("#hero").innerHTML = "";
  $("#picks").innerHTML = "";
  if (state.error) {
    $("#content").innerHTML = V.note(`Couldn’t load forecasts: ${state.error}. Check your connection and press Refresh.`, true);
    return;
  }
  if (!state.ready) return void ($("#content").innerHTML = V.note(`Loading forecasts for ${resorts.length} resorts…`));

  if (state.view === "check") renderCheck();
  else map?.setMarkers(state.view === "now" ? renderNow() : renderWeekend(), state.stats, state.active);
  stripToToday();

  // The map changes size between views (sticky column, weekend strip, hidden on check).
  if (state.view !== lastView) setTimeout(() => map?.resize(), 0);
  lastView = state.view;
}

// On a phone the strip scrolls sideways; start it at today rather than three days back.
function stripToToday() {
  const strip = document.querySelector(".strip");
  const today = strip?.children[3];
  if (today && strip.scrollWidth > strip.clientWidth) {
    strip.scrollLeft = today.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
  }
}

// Pick a resort: highlight it, open its row's day-by-day strip, and show it on the map.
// Clicking the open row again closes the strip.
function select(id, fly) {
  const row = document.querySelector(`.row[data-id="${id}"]`);
  const closing = fly && state.active === id && row?.getAttribute("aria-expanded") === "true";
  state.active = closing ? null : id;
  document.querySelectorAll("[data-id]").forEach(el => el.classList.toggle("active", Number(el.dataset.id) === state.active));
  document.querySelector(".detail")?.remove();
  document.querySelectorAll(".row[aria-expanded=true]").forEach(el => el.setAttribute("aria-expanded", "false"));
  map?.setActive(state.active);
  if (closing) return;
  if (row) {
    row.setAttribute("aria-expanded", "true");
    row.parentElement.insertAdjacentHTML("beforeend", V.dayStripHtml(resorts[id], state.hot));
    stripToToday();
    if (!fly) row.parentElement.scrollIntoView({ block: "nearest" });
  }
  map?.focus(id, fly);
}

function setStatus(text, busy) {
  $("#refresh").disabled = busy;
  if (text) return void ($("#status").textContent = text);
  const t = new Date(state.updated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const n = resorts.filter(r => r.obs).length;
  const snotel = state.snotel === "ok" ? `${n} SNOTEL` : state.snotel === "pending" ? "SNOTEL loading" : "SNOTEL offline";
  $("#status").textContent = `Updated ${t} · ${snotel}`;
}

/* ---------- loading ---------- */

async function loadAll(force) {
  Object.assign(state, { ready: false, error: null, snotel: "pending" });
  setStatus("Loading…", true);
  render();
  try {
    state.updated = await loadForecasts(resorts, DATA_VERSION, force);
  } catch (e) {
    state.error = e.name === "TimeoutError" ? "the forecast service timed out" : e.message;
    setStatus("Forecast failed", false);
    render();
    return;
  }
  state.ready = true;
  render();
  if (filtered()) map?.fit(visible().map(r => r.id));
  setStatus(null, false);
  try {
    matchStations(resorts, await loadStations());
    await loadObservations(resorts);
    state.snotel = "ok";
  } catch (e) {
    console.warn("SNOTEL unavailable:", e);
    state.snotel = "unavailable";
  }
  setStatus(null, false);
  render();
}

/* ---------- events ---------- */

window.addEventListener("hashchange", () => {
  Object.assign(state, parseHash(location.hash, new Set(REGIONS)));
  render();
  if (state.ready) map?.fit(visible().map(r => r.id));
});

$(".tabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-view]");
  if (!b) return;
  state.view = b.dataset.view;
  state.active = null;
  render();
});

$("#controls").addEventListener("click", async e => {
  const share = e.target.closest("#share");
  if (share) {
    try {
      await navigator.clipboard.writeText(location.href);
      share.textContent = "Link copied";
      share.classList.add("copied");
    } catch (err) {
      share.textContent = "Copy from the address bar";
    }
    setTimeout(() => { if (share.isConnected) { share.textContent = "Copy link"; share.classList.remove("copied"); } }, 1800);
    return;
  }
  const win = e.target.closest("button[data-win]");
  if (!win) return;
  state.window = win.dataset.win;
  render();
});

$("#controls").addEventListener("change", e => {
  if (e.target.id === "region") state.region = e.target.value;
  else if (e.target.id === "pass") state.pass = e.target.value;
  else return;
  render();
  map?.fit(visible().map(r => r.id));
});

// Rows (#content) and weekend cards (#picks) both pick a resort.
$("#panel").addEventListener("click", e => {
  const el = e.target.closest("[data-id]");
  if (el) select(Number(el.dataset.id), true);
});

$("#refresh").addEventListener("click", () => loadAll(true));

/* ---------- go ---------- */

Object.assign(state, parseHash(location.hash, new Set(REGIONS)));
loadAll(false);
