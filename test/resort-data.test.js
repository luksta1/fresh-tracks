/* Sanity checks on the committed data: resorts.js, the generated resort-meta.js and trails/. */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { APRES } from "../apres.js";
import { RESORT_META } from "../resort-meta.js";
import { RESORTS } from "../resorts.js";
import { km, slug } from "../js/util.js";

const PASSES = new Set(["ikon", "epic", "epic-limited", "none", undefined]);
const trailsDir = new URL("../trails/", import.meta.url);

test("resorts.js: well-formed rows", () => {
  assert.ok(RESORTS.length > 50);
  const names = new Set();
  for (const [name, st, region, lat, lon, base, summit, pass, note] of RESORTS) {
    assert.ok(!names.has(name), `duplicate ${name}`);
    names.add(name);
    assert.match(st, /^[A-Z]{2}$/, name);
    assert.ok(region, name);
    assert.ok(lat > 30 && lat < 65 && lon > -160 && lon < -60, `${name} is in North America`);
    assert.ok(base < summit, `${name} base below summit`);
    assert.ok(PASSES.has(pass), `${name} pass "${pass}"`);
    if (pass === "epic-limited") assert.ok(note, `${name} needs a day-limit note`);
  }
});

test("resort-meta.js: every resort matched, and near its hand-entered spot", () => {
  for (const [name, , , lat, lon] of RESORTS) {
    const m = RESORT_META[name];
    assert.ok(m, `${name} has no OpenSkiMap match; rerun scripts/enrich-resorts.mjs`);
    assert.ok(m.lifts > 0, `${name} has lifts`);
    if (m.base != null) assert.ok(m.summit - m.base > 100, `${name} vertical`);
    // Sugarloaf was 43 km off before it was fixed; anything this far means a bad match.
    assert.ok(km(lat, lon, m.lat, m.lon) < 15, `${name} matched ${m.name}, ${km(lat, lon, m.lat, m.lon).toFixed(0)} km away`);
    if (m.mix) assert.ok(Math.abs(Object.values(m.mix).reduce((a, b) => a + b, 0) - 100) <= 2, `${name} mix sums to ~100`);
  }
  assert.deepEqual(Object.keys(RESORT_META).sort(), RESORTS.map(r => r[0]).sort(), "no stale entries");
});

test("trails/: one valid file per resort, nothing extra", () => {
  const expected = new Set(RESORTS.map(([name]) => `${slug(name)}.json`));
  assert.equal(expected.size, RESORTS.length, "slugs are unique");
  assert.deepEqual(readdirSync(trailsDir).sort(), [...expected].sort());
  for (const [name] of RESORTS) {
    const file = new URL(`${slug(name)}.json`, trailsDir);
    assert.ok(existsSync(file), name);
    const { runs, lifts } = JSON.parse(readFileSync(file));
    assert.ok(runs.length > 0 && lifts.length > 0, `${name} has runs and lifts`);
    const m = RESORT_META[name];
    for (const [sign, , pts] of runs) {
      assert.ok(["", "g", "b", "k", "d"].includes(sign));
      assert.ok(pts.length >= 2);
    }
    // Spot-check that the lines are actually at the resort.
    const [lat, lon] = runs[0][2][0];
    assert.ok(km(lat, lon, m.lat, m.lon) < 20, `${name} trails are near the resort`);
  }
});

test("apres.js: every resort has picks", () => {
  for (const [name] of RESORTS) assert.ok(APRES[name]?.length, `${name} has no après picks`);
});

test("apres.js: keyed by real resorts, up to three well-formed picks each", () => {
  const names = new Set(RESORTS.map(r => r[0]));
  for (const [resort, picks] of Object.entries(APRES)) {
    assert.ok(names.has(resort), `"${resort}" isn't a resort in resorts.js`);
    assert.ok(Array.isArray(picks) && picks.length >= 1 && picks.length <= 3, `${resort}: 1 to 3 picks`);
    for (const [name, where, note] of picks) {
      assert.ok(typeof name === "string" && name.trim(), `${resort}: pick needs a name`);
      assert.ok(where === undefined || (typeof where === "string" && where.trim()), `${resort} / ${name}: where is optional but can't be blank`);
      assert.ok(note === undefined || typeof note === "string");
    }
  }
});
