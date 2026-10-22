import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FUTURE, MODELS, PAST, TODAY } from "../js/config.js";
import { buildResorts, cacheGet, cacheSet, depthByStation, forecastUrl, matchStations, parseDaily } from "../js/data.js";
import { snowGain } from "../js/score.js";

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

test("parseDaily: real Open-Meteo response (two locations, two models)", () => {
  const json = fixture("open-meteo.json");
  assert.ok(Array.isArray(json) && json.length === 2, "multi-location requests return an array");
  for (const loc of json) {
    const days = parseDaily(loc.daily);
    assert.equal(days.length, PAST + FUTURE);
    assert.match(days[TODAY].date, /^\d{4}-\d{2}-\d{2}$/);
    for (const d of days) {
      assert.ok(d.snow >= 0 && Number.isFinite(d.snow));
      assert.ok(d.snowAlt === null || d.snowAlt >= 0);
      assert.ok(d.tmax >= d.tmin, `${d.date}: max ${d.tmax} below min ${d.tmin}`);
      assert.ok(d.wind >= 0);
    }
    const cm = loc.daily[`snowfall_sum_${MODELS.main}`];
    assert.equal(days[TODAY].snow, Math.max(0, cm[TODAY] || 0) / 2.54, "cm to inches");
  }
});

test("parseDaily: floors negative snow and fills gaps", () => {
  const daily = {
    time: ["a", "b"],
    [`snowfall_sum_${MODELS.main}`]: [2.54, null],
    [`snowfall_sum_${MODELS.alt}`]: [-0.07, null],
    [`temperature_2m_max_${MODELS.main}`]: [30, null],
    [`temperature_2m_min_${MODELS.main}`]: [10, null],
    [`wind_speed_10m_max_${MODELS.main}`]: [5, null]
  };
  const [a, b] = parseDaily(daily);
  assert.deepEqual(a, { date: "a", snow: 1, snowAlt: 0, tmax: 30, tmin: 10, wind: 5 });
  assert.deepEqual(b, { date: "b", snow: 0, snowAlt: null, tmax: 32, tmin: 32, wind: 0 });
});

test("depthByStation + snowGain: real AWDB response", () => {
  const records = fixture("awdb-data.json");
  const depth = depthByStation(records);
  assert.deepEqual(Object.keys(depth).sort(), records.map(r => r.stationTriplet).sort());
  for (const [id, byDate] of Object.entries(depth)) {
    const dates = Object.keys(byDate).sort();
    assert.ok(dates.length >= 2, `${id} has readings`);
    const g = snowGain(byDate, dates);
    assert.ok(g && g.gain >= 0 && g.depth >= 0);
  }
});

test("forecastUrl: one request for many points, both models", () => {
  const url = new URL(forecastUrl([{ lat: 1, lon: 2, qElev: 3000 }, { lat: 4, lon: 5, qElev: 2000 }]));
  assert.equal(url.searchParams.get("latitude"), "1,4");
  assert.equal(url.searchParams.get("elevation"), "3000,2000");
  assert.equal(url.searchParams.get("models"), `${MODELS.main},${MODELS.alt}`);
  assert.equal(url.searchParams.get("past_days"), String(PAST));
});

test("buildResorts: OpenSkiMap meta overrides location and elevation", () => {
  const rows = [
    ["A", "UT", "Utah", 40, -111, 2000, 3000, "ikon"],
    ["B", "BC", "BC", 50, -120, 1000, 2000],
    ["C", "CO", "Colorado", 39, -106, 2500, 3500, "epic"]
  ];
  const meta = { A: { lat: 40.1, lon: -111.1, base: 2100, summit: 3100 }, C: { lat: 39.2, lon: -106.2, base: null, summit: null } };
  const [a, b, c] = buildResorts(rows, meta);
  assert.deepEqual([a.lat, a.lon, a.base, a.summit], [40.1, -111.1, 2100, 3100]);
  assert.equal(a.qElev, 2800, "forecast point 70% up");
  assert.equal(a.us, true);
  assert.deepEqual([b.pass, b.us, b.meta], ["none", false, null]);
  assert.deepEqual([c.lat, c.base, c.summit], [39.2, 2500, 3500], "no mapped lifts: keep hand elevations");
});

test("matchStations: nearest with an elevation penalty, US only, within 40 km", () => {
  const [r, ca] = buildResorts([["A", "UT", "Utah", 40, -111, 2000, 3000], ["B", "BC", "BC", 40, -111, 2000, 3000]], {});
  const stations = [
    { id: "near-low", lat: 40.01, lon: -111, elev: 1000 },   // ~1 km away, 1,550 m too low
    { id: "far-right", lat: 40.1, lon: -111, elev: 2550 },   // ~11 km away, right elevation
    { id: "too-far", lat: 41, lon: -111, elev: 2550 }
  ];
  matchStations([r, ca], stations);
  assert.equal(r.station.id, "far-right");
  assert.ok(r.station.dist > 10 && r.station.dist < 12);
  assert.equal(ca.station, null, "Canada has no SNOTEL");
  matchStations([r], [stations[2]]);
  assert.equal(r.station, null);
});

test("cache: versions of the same kind replace each other", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: k => store.delete(k)
  };
  // Object.keys(localStorage) in the browser lists stored keys; mimic that.
  const proxy = new Proxy(globalThis.localStorage, { ownKeys: () => [...store.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
  globalThis.localStorage = proxy;
  try {
    cacheSet("ft:forecast:v1:old", [1]);
    cacheSet("ft:stations:v2", [2]);
    cacheSet("ft:forecast:v2:new", [3]);
    assert.deepEqual([...store.keys()].sort(), ["ft:forecast:v2:new", "ft:stations:v2"]);
    assert.deepEqual(cacheGet("ft:forecast:v2:new", 60000).data, [3]);
    assert.equal(cacheGet("ft:forecast:v2:new", -1), null, "expired");
    assert.equal(cacheGet("missing", 60000), null);
  } finally {
    delete globalThis.localStorage;
  }
});
