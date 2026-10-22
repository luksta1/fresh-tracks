/* Loading data: the resort list, Open-Meteo forecasts, and SNOTEL observations. */
import { AWDB, FORECAST_TTL, FUTURE, MAX_STATION_KM, METEO, MODELS, PAST, STATION_TTL, TIMEOUT, TODAY, US } from "./config.js";
import { snowGain } from "./score.js";
import { km } from "./util.js";

/* ---------- resorts ---------- */

// resorts.js rows plus OpenSkiMap facts (resort-meta.js), which override location and elevation.
export function buildResorts(rows, meta) {
  return rows.map(([name, st, region, lat, lon, base, summit, pass, passNote], id) => {
    const m = meta[name] || null;
    if (m) {
      ({ lat, lon } = m);
      if (m.base != null) ({ base, summit } = m);
    }
    return {
      id, name, st, region, lat, lon, base, summit, pass: pass || "none", passNote,
      meta: m,         // {lifts, mix: {green, blue, black, double} as % of trail length, runKm, url}
      qElev: Math.round(base + 0.7 * (summit - base)),   // forecast point, 70% of the way up
      midElev: base + 0.55 * (summit - base),            // for matching SNOTEL stations
      us: US.has(st),
      days: null,      // [{date, snow (in), snowAlt (in or null), tmax, tmin, wind}]
      station: null,   // nearest SNOTEL station
      obs: null        // {gain, depth} from SNOTEL
    };
  });
}

/* ---------- local cache ---------- */

export function cacheGet(key, ttl) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    if (v && Date.now() - v.t < ttl) return v;
  } catch (e) { /* storage unavailable or corrupt */ }
  return null;
}

// Keys look like "ft:<kind>:<version…>". Writing one drops the other versions of the same kind,
// so editing resorts.js doesn't leave old forecasts behind.
export function cacheSet(key, data) {
  try {
    const family = key.split(":").slice(0, 2).join(":") + ":";
    for (const k of Object.keys(localStorage)) if (k !== key && k.startsWith(family)) localStorage.removeItem(k);
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
  } catch (e) { /* storage unavailable or full */ }
}

async function getJSON(url, service) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`${service} returned ${res.status}`);
  return res.json();
}

/* ---------- Open-Meteo ---------- */

// With several models, Open-Meteo suffixes each variable: snowfall_sum_best_match, etc.
// Snowfall is in cm; ECMWF occasionally reports tiny negatives, so floor at 0.
export function parseDaily(daily) {
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

export function forecastUrl(part) {
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
  return `${METEO}?${params}`;
}

// Fills r.days for every resort. Returns when the data was fetched (cache time or now).
export async function loadForecasts(resorts, version, force) {
  const key = `ft:forecast:v2:${version}`;
  if (!force) {
    const c = cacheGet(key, FORECAST_TTL);
    if (c && c.data.length === resorts.length) {
      c.data.forEach((days, i) => { resorts[i].days = days; });
      return c.t;
    }
  }
  const CHUNK = 30;   // locations per request
  const parts = [];
  for (let i = 0; i < resorts.length; i += CHUNK) parts.push(resorts.slice(i, i + CHUNK));
  await Promise.all(parts.map(async part => {
    const json = await getJSON(forecastUrl(part), "Open-Meteo");
    (Array.isArray(json) ? json : [json]).forEach((loc, j) => { part[j].days = parseDaily(loc.daily); });
  }));
  cacheSet(key, resorts.map(r => r.days));
  return Date.now();
}

/* ---------- SNOTEL (US snow depth), straight from the AWDB REST API ---------- */

const snotel = (endpoint, params) => getJSON(`${AWDB}/${endpoint}?${new URLSearchParams(params)}`, "SNOTEL");

export async function loadStations() {
  const c = cacheGet("ft:stations:v2", STATION_TTL);
  if (c) return c.data;
  // The triplet wildcard is what limits this to SNOTEL; a networkCodes param is ignored.
  const raw = await snotel("stations", { stationTriplets: "*:*:SNTL", activeOnly: "true" });
  const list = raw
    .filter(s => s.latitude != null && s.longitude != null && s.elevation != null)
    .map(s => ({ id: s.stationTriplet, name: s.name, lat: s.latitude, lon: s.longitude, elev: s.elevation * 0.3048 }));
  cacheSet("ft:stations:v2", list);
  return list;
}

// Nearest station by distance, with a penalty for elevation mismatch (1 km ~ 40 m).
export function matchStations(resorts, stations) {
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

// AWDB /data records to {triplet: {date: depth}}.
export function depthByStation(records) {
  const out = {};
  for (const rec of records) {
    const el = (rec.data || []).find(d => d.stationElement?.elementCode === "SNWD");
    const byDate = {};
    for (const v of el?.values || []) if (v.value != null) byDate[v.date] = v.value;
    out[rec.stationTriplet] = byDate;
  }
  return out;
}

// Fills r.obs with the measured gain over the model's past 3 days (readings d-3 .. today).
export async function loadObservations(resorts) {
  const ids = [...new Set(resorts.filter(r => r.station).map(r => r.station.id))];
  if (!ids.length) return;
  const ref = resorts.find(r => r.days).days;
  const batches = [];
  for (let i = 0; i < ids.length; i += 40) batches.push(ids.slice(i, i + 40));
  const results = await Promise.all(batches.map(b => snotel("data", {
    stationTriplets: b.join(","),
    elements: "SNWD",
    duration: "DAILY",
    beginDate: ref[TODAY - 4].date,
    endDate: ref[TODAY].date
  })));
  const depth = depthByStation(results.flat());
  for (const r of resorts) {
    if (!r.station) continue;
    const dates = [TODAY - 3, TODAY - 2, TODAY - 1, TODAY].map(i => r.days[i].date);
    r.obs = snowGain(depth[r.station.id] || {}, dates);
  }
}
