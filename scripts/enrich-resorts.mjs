#!/usr/bin/env node
/*
  Pulls resort facts from OpenSkiMap (https://openskimap.org, data © OpenStreetMap contributors, ODbL)
  and writes resort-meta.js: accurate location, base and summit elevation, lift count and run mix
  for every resort in resorts.js. The app works without the file; run this again each fall.

    node scripts/enrich-resorts.mjs                  # downloads ski_areas.geojson (~20 MB)
    node scripts/enrich-resorts.mjs path/to/ski_areas.geojson
*/
import fs from "node:fs";
import path from "node:path";
import { RESORTS } from "../resorts.js";
import { km } from "../js/util.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SOURCE = "https://tiles.openskimap.org/geojson/ski_areas.geojson";
const SEARCH_KM = 60;   // how far from the hand-entered point to look for a match

// Resorts where the nearest name match is the wrong area, or one resort spans several areas.
const OVERRIDES = {
  "Sun Valley": ["Sun Valley - Bald Mountain"],
  "Palisades Tahoe": ["Palisades Tahoe Olympic Valley", "Palisades Tahoe Alpine Meadows"]
};

// Lift types that don't count toward "lifts" the way resorts advertise them.
const SKIP_LIFTS = new Set(["magic_carpet"]);

// OpenSkiMap difficulty -> trail sign. North American OSM tagging uses easy/intermediate/advanced/expert.
const SIGN = { novice: "green", easy: "green", intermediate: "blue", advanced: "black", expert: "double", freeride: "double", extreme: "double" };

const STOP = new Set(["ski", "area", "resort", "mountain", "mt", "mount", "the", "at", "and", "station", "de", "le", "la"]);
const tokens = s => new Set(String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .split(/[^a-z0-9]+/).filter(t => t && !STOP.has(t)));
const overlaps = (a, b) => [...tokens(a)].some(t => tokens(b).has(t));

async function loadAreas(file) {
  let text;
  if (file) {
    text = fs.readFileSync(file, "utf8");
  } else {
    console.error(`Downloading ${SOURCE}…`);
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`OpenSkiMap returned ${res.status}`);
    text = await res.text();
  }
  return JSON.parse(text).features
    .map(f => f.properties)
    .filter(p => p.type === "skiArea" && (p.activities || []).includes("downhill") && p.viewportHint?.center);
}

const liftCount = p => Object.entries(p.statistics?.lifts?.byType || {})
  .filter(([type]) => !SKIP_LIFTS.has(type)).reduce((a, [, s]) => a + s.count, 0);

function pick(areas, [name, , , lat, lon]) {
  if (OVERRIDES[name]) {
    const found = OVERRIDES[name].map(n => areas.find(p => p.name === n));
    if (found.some(p => !p)) throw new Error(`Override for ${name} names an area that isn't in the data`);
    return found;
  }
  // Nearest area that shares a name word and has lifts; anything without a shared word pays a 50 km penalty.
  const best = areas
    .map(p => ({ p, d: km(lat, lon, p.viewportHint.center[1], p.viewportHint.center[0]) }))
    .filter(x => x.d < SEARCH_KM && liftCount(x.p) > 0)
    .map(x => ({ ...x, cost: x.d + (overlaps(name, x.p.name) ? 0 : 50) }))
    .sort((a, b) => a.cost - b.cost)[0];
  return best ? [best.p] : [];
}

// Run counts depend on how mappers split trails into segments, so the mix is by length instead.
// Base and summit come from lifts: runs can trail down access roads or up to hike-to peaks.
function summarize(parts) {
  const main = parts[0];
  const len = { green: 0, blue: 0, black: 0, double: 0 };
  let runKm = 0, lo = Infinity, hi = -Infinity;
  for (const p of parts) {
    for (const [diff, s] of Object.entries(p.statistics?.runs?.byActivity?.downhill?.byDifficulty || {})) {
      if (SIGN[diff]) len[SIGN[diff]] += s.lengthInKm || 0;
      runKm += s.lengthInKm || 0;
    }
    for (const [type, s] of Object.entries(p.statistics?.lifts?.byType || {})) {
      if (SKIP_LIFTS.has(type)) continue;
      if (s.minElevation != null) lo = Math.min(lo, s.minElevation);
      if (s.maxElevation != null) hi = Math.max(hi, s.maxElevation);
    }
  }
  const rated = len.green + len.blue + len.black + len.double;
  const mix = rated ? Object.fromEntries(Object.entries(len).map(([k, v]) => [k, Math.round(100 * v / rated)])) : null;
  const [lon, lat] = main.viewportHint.center;
  return {
    osm: parts.map(p => p.id),
    name: parts.map(p => p.name).join(" + "),
    lat: +lat.toFixed(4),
    lon: +lon.toFixed(4),
    base: Number.isFinite(lo) ? Math.round(lo) : null,
    summit: Number.isFinite(hi) ? Math.round(hi) : null,
    lifts: parts.reduce((a, p) => a + liftCount(p), 0),
    mix,
    runKm: Math.round(runKm),
    url: (main.websites || [])[0] || null
  };
}

const areas = await loadAreas(process.argv[2]);
const resorts = RESORTS;
const meta = {};
const report = [];
for (const r of resorts) {
  const [name, , , lat, lon, base, summit] = r;
  const parts = pick(areas, r);
  if (!parts.length) { report.push(`  NO MATCH  ${name}`); continue; }
  const m = summarize(parts);
  // Elevations need lifts mapped; without them keep the hand-entered numbers.
  if (m.base == null || m.summit == null || m.summit - m.base < 100) { m.base = null; m.summit = null; }
  meta[name] = m;
  const moved = km(lat, lon, m.lat, m.lon);
  const flag = moved > 10 || (m.base != null && (Math.abs(m.base - base) > 200 || Math.abs(m.summit - summit) > 200)) ? " <- check" : "";
  report.push(`  ${name.padEnd(20)} ${m.name.slice(0, 40).padEnd(42)} moved ${moved.toFixed(1).padStart(5)} km  ` +
    `elev ${base}-${summit} -> ${m.base ?? "keep"}-${m.summit ?? "keep"}  ${m.lifts} lifts${flag}`);
}

const out = `/* Generated by scripts/enrich-resorts.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.
   Resort data from OpenSkiMap (openskimap.org), © OpenStreetMap contributors, ODbL.
   Keyed by resort name in resorts.js. lat/lon/base/summit override the hand-entered values. */
export const RESORT_META = ${JSON.stringify(meta, null, 1).replace(/\n\s+(?=[\]}"0-9-])/g, " ")};
`;
fs.writeFileSync(path.join(ROOT, "resort-meta.js"), out);
console.log(report.join("\n"));
console.log(`\nWrote resort-meta.js: ${Object.keys(meta).length} of ${resorts.length} resorts matched.`);
