/* Powder scoring and the judgments built on it. Pure functions. */
import { TIERS, TODAY } from "./config.js";
import { clamp, fmt } from "./util.js";

export const tierOf = score => TIERS.find(t => score >= t.min);

export function dayScore(d) {
  if (!d) return 0;
  const s = clamp(d.snow / 12);                         // 12" in a day maxes out snowfall
  const cold = clamp((34 - (d.tmax + d.tmin) / 2) / 14); // 34F -> 0, 20F or colder -> 1
  const calm = 1 - clamp((d.wind - 15) / 25);            // 15 mph -> 1, 40 mph -> 0
  const q = Math.sqrt(s);                                // cold and calm only matter if it snows
  return 100 * (0.65 * s + 0.25 * cold * q + 0.10 * calm * q);
}

// Diminishing returns across days: 1 - product of (1 - score).
export const combine = scores => 100 * (1 - scores.reduce((p, x) => p * (1 - clamp(x / 100)), 1));

// Totals and score for a resort over some day indices, optionally weighting each day's score.
export function stats(days, idxs, weights = idxs.map(() => 1)) {
  const ds = idxs.map(i => days[i]);
  const snow = ds.reduce((a, d) => a + d.snow, 0);
  const score = combine(ds.map((d, k) => dayScore(d) * weights[k]));
  const avg = d => (d.tmax + d.tmin) / 2;
  const avgT = snow > 0.1
    ? ds.reduce((a, d) => a + avg(d) * d.snow, 0) / snow   // temperature on the snowy days
    : ds.reduce((a, d) => a + avg(d), 0) / ds.length;
  const wind = Math.max(...ds.map(d => d.wind));
  const snowAlt = ds.every(d => d.snowAlt != null) ? ds.reduce((a, d) => a + d.snowAlt, 0) : null;
  return { snow, snowAlt, score, avgT, wind };
}

// Compare the two models' snow totals. Only worth showing when either expects real snow.
export function confidence(st) {
  if (st.snowAlt == null) return null;
  const hi = Math.max(st.snow, st.snowAlt), lo = Math.min(st.snow, st.snowAlt);
  if (hi < 2) return null;
  const r = lo / hi;
  if (r >= 0.6) return { t: "Models agree", c: "ok" };
  if (r >= 0.3) return { t: "Models differ", c: "mid" };
  return { t: "Models split", c: "split" };
}

export function blurb(st) {
  if (st.snow < 0.5) return "Not much snow in the forecast here.";
  const bits = [`${fmt(st.snow)}″ of new snow`];
  if (st.avgT <= 22) bits.push("cold enough for light, dry snow");
  else if (st.avgT <= 30) bits.push("temperatures that should ski well");
  else bits.push("warm temperatures, so expect heavier, wetter snow");
  if (st.wind >= 35) bits.push("and strong wind that may close upper lifts");
  else if (st.wind <= 15) bits.push("and light wind");
  return bits.join(", ") + ".";
}

// Modeled snow vs. SNOTEL-measured depth gain over the same days.
export function verdict(obs, model) {
  const diff = model - obs;
  if (Math.abs(diff) <= Math.max(1.5, obs * 0.3)) return { t: "Close", c: "ok" };
  return diff > 0 ? { t: "Model high", c: "hi" } : { t: "Model low", c: "lo" };
}

// Indices of the coming Fri/Sat/Sun in a days array (the current weekend through Saturday;
// on Sunday, next weekend).
export function weekendIdx(days, today = TODAY) {
  const wd = i => new Date(days[i].date + "T12:00:00").getDay();
  const sat = days.findIndex((d, i) => (wd(today) === 0 ? i > today : i >= today) && wd(i) === 6);
  return { fri: sat - 1, sat, sun: sat + 1 };
}

// SNOTEL depth readings ({date: inches}) to new snow over consecutive dates. Only day-over-day
// gains of 1" or more count, which ignores settling and sensor noise.
export function snowGain(depthByDate, dates) {
  let gain = 0, pairs = 0;
  for (let i = 1; i < dates.length; i++) {
    const a = depthByDate[dates[i - 1]], b = depthByDate[dates[i]];
    if (a == null || b == null) continue;
    pairs++;
    if (b - a >= 1) gain += b - a;
  }
  const latest = [...dates].reverse().map(d => depthByDate[d]).find(v => v != null) ?? null;
  if (pairs) return { gain, depth: latest };
  return latest != null ? { gain: null, depth: latest } : null;
}

export function passMatches(filter, r) {
  if (filter === "All") return true;
  if (filter === "epic") return r.pass === "epic" || r.pass === "epic-limited";
  return r.pass === filter;
}
