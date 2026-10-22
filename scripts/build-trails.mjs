#!/usr/bin/env node
/*
  Writes trails/<resort>.json: each resort's downhill runs and lifts from OpenSkiMap
  (data © OpenStreetMap contributors, ODbL), simplified for drawing on the map.
  Needs resort-meta.js (run enrich-resorts.mjs first). Streams the source files, which are large.

    node scripts/build-trails.mjs                          # downloads runs + lifts GeoJSON
    node scripts/build-trails.mjs runs.geojson lifts.geojson
*/
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import readline from "node:readline";
import { Readable } from "node:stream";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "trails");
const SOURCES = {
  runs: "https://tiles.openskimap.org/geojson/runs.geojson",
  lifts: "https://tiles.openskimap.org/geojson/lifts.geojson"
};
const TOLERANCE = 0.00004;   // degrees (~4 m): Douglas-Peucker simplification
const PRECISION = 1e5;       // 5 decimals (~1 m)

// Must match trailSlug() in app.js.
export const slug = name => name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// OpenSkiMap difficulty -> trail sign, as in enrich-resorts.mjs. Unrated runs are drawn faintly.
const SIGN = { novice: "g", easy: "g", intermediate: "b", advanced: "k", expert: "d", freeride: "d", extreme: "d" };

function loadMeta() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "resort-meta.js"), "utf8"), sandbox);
  return sandbox.window.RESORT_META;
}

async function lines(source) {
  let stream;
  if (fs.existsSync(source)) {
    stream = fs.createReadStream(source);
  } else {
    console.error(`Streaming ${source}…`);
    const res = await fetch(source);
    if (!res.ok) throw new Error(`OpenSkiMap returned ${res.status} for ${source}`);
    stream = Readable.fromWeb(res.body);
  }
  return readline.createInterface({ input: stream, crlfDelay: Infinity });
}

// Douglas-Peucker on [lon, lat] points, returning [lat, lon] rounded for Leaflet.
function simplify(points) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    let worst = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > TOLERANCE) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  const r = v => Math.round(v * PRECISION) / PRECISION;
  return points.filter((_, i) => keep[i]).map(([lon, lat]) => [r(lat), r(lon)]);
}

// Runs can be lines or areas (polygons); draw areas by their outer ring.
function paths(geometry) {
  switch (geometry?.type) {
    case "LineString": return [geometry.coordinates];
    case "MultiLineString": return geometry.coordinates;
    case "Polygon": return [geometry.coordinates[0]];
    case "MultiPolygon": return geometry.coordinates.map(p => p[0]);
    default: return [];
  }
}

const meta = loadMeta();
const owner = new Map();   // OpenSkiMap ski area id -> resort name
for (const [name, m] of Object.entries(meta)) for (const id of m.osm) owner.set(id, name);
const out = Object.fromEntries(Object.keys(meta).map(name => [name, { runs: [], lifts: [] }]));

async function collect(kind, source) {
  let seen = 0, kept = 0;
  for await (const line of await lines(source)) {
    if (!line.startsWith('{"type":"Feature"')) continue;
    seen++;
    const f = JSON.parse(line.replace(/,\s*$/, ""));
    const p = f.properties;
    if (p.status && p.status !== "operating") continue;
    const name = (p.skiAreas || []).map(a => owner.get(a.properties?.id)).find(Boolean);
    if (!name) continue;
    if (kind === "runs" && !(p.uses || []).includes("downhill")) continue;
    if (kind === "lifts" && p.liftType === "magic_carpet") continue;
    for (const pts of paths(f.geometry)) {
      if (pts.length < 2) continue;
      const simple = simplify(pts);
      if (kind === "runs") out[name].runs.push([SIGN[p.difficulty] || "", p.name || "", simple]);
      else out[name].lifts.push([p.name || "", p.liftType || "", simple]);
      kept++;
    }
  }
  console.error(`${kind}: kept ${kept} paths from ${seen} features`);
}

await collect("runs", process.argv[2] || SOURCES.runs);
await collect("lifts", process.argv[3] || SOURCES.lifts);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
let total = 0;
for (const [name, t] of Object.entries(out)) {
  const json = JSON.stringify(t);
  fs.writeFileSync(path.join(OUT, `${slug(name)}.json`), json);
  total += json.length;
  console.log(`  ${name.padEnd(20)} ${String(t.runs.length).padStart(4)} runs ${String(t.lifts.length).padStart(3)} lifts ${(json.length / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(`\nWrote ${Object.keys(out).length} files to trails/, ${(total / 1024 / 1024).toFixed(1)} MB total.`);
