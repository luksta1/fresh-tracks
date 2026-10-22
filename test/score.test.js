import assert from "node:assert/strict";
import { test } from "node:test";
import { TODAY } from "../js/config.js";
import { blurb, combine, confidence, dayScore, passMatches, snowGain, stats, tierOf, verdict, weekendIdx } from "../js/score.js";

const day = (snow, t = 20, wind = 10, snowAlt = snow) => ({ date: "2026-01-01", snow, snowAlt, tmax: t, tmin: t, wind });

test("dayScore: no snow scores 0, a cold calm foot scores 100", () => {
  assert.equal(dayScore(day(0)), 0);
  assert.equal(dayScore(undefined), 0);
  assert.equal(Math.round(dayScore(day(12, 20, 10))), 100);
  assert.equal(Math.round(dayScore(day(30, 0, 0))), 100, "snowfall caps at 12 in");
});

test("dayScore: warmth and wind cost points only when it snows", () => {
  const cold = dayScore(day(6, 20, 10));
  assert.ok(dayScore(day(6, 34, 10)) < cold, "warm snow scores lower");
  assert.ok(dayScore(day(6, 20, 40)) < cold, "windy snow scores lower");
  assert.equal(dayScore(day(0, 0, 0)), 0, "cold and calm alone score nothing");
});

test("combine: diminishing returns, never above 100", () => {
  assert.equal(combine([]), 0);
  assert.equal(combine([50]), 50);
  assert.equal(combine([50, 50]), 75);
  assert.equal(combine([100, 100]), 100);
  assert.ok(combine([30, 30]) < 60);
});

test("tierOf: thresholds", () => {
  assert.equal(tierOf(0).name, "Quiet");
  assert.equal(tierOf(4.9).name, "Quiet");
  assert.equal(tierOf(5).name, "Light");
  assert.equal(tierOf(25).name, "Good");
  assert.equal(tierOf(50).name, "Deep");
  assert.equal(tierOf(75).name, "Send it");
  assert.equal(tierOf(100).name, "Send it");
});

test("stats: totals, snow-weighted temperature, max wind, alt model", () => {
  const days = [day(4, 20, 10, 2), day(0, 40, 30, 0), day(2, 26, 15, 1)];
  const s = stats(days, [0, 1, 2]);
  assert.equal(s.snow, 6);
  assert.equal(s.snowAlt, 3);
  assert.equal(s.wind, 30);
  assert.equal(s.avgT, (20 * 4 + 26 * 2) / 6, "temperature is weighted by snow, so the dry warm day doesn't count");
  assert.equal(stats([day(0, 40), day(0, 20)], [0, 1]).avgT, 30, "without snow it's a plain average");
  assert.equal(stats([day(1, 20, 10, null)], [0]).snowAlt, null, "a missing alt day makes the alt total unknown");
});

test("stats: weights scale each day's score", () => {
  const days = [day(6), day(6)];
  assert.ok(stats(days, [0, 1], [0.5, 0.5]).score < stats(days, [0, 1]).score);
});

test("confidence: quiet below 2 in, then agree / differ / split", () => {
  assert.equal(confidence({ snow: 1.5, snowAlt: 0 }), null);
  assert.equal(confidence({ snow: 5, snowAlt: null }), null);
  assert.equal(confidence({ snow: 10, snowAlt: 7 }).c, "ok");
  assert.equal(confidence({ snow: 10, snowAlt: 4 }).c, "mid");
  assert.equal(confidence({ snow: 10, snowAlt: 1 }).c, "split");
  assert.equal(confidence({ snow: 1, snowAlt: 10 }).c, "split", "symmetric");
});

test("blurb: describes snow, temperature and wind", () => {
  assert.equal(blurb({ snow: 0.2, avgT: 20, wind: 10 }), "Not much snow in the forecast here.");
  assert.match(blurb({ snow: 8, avgT: 18, wind: 10 }), /^8\.0″ of new snow, cold enough for light, dry snow, and light wind\.$/);
  assert.match(blurb({ snow: 8, avgT: 33, wind: 40 }), /heavier, wetter snow, and strong wind/);
});

test("verdict: close within 1.5 in or 30%", () => {
  assert.equal(verdict(0, 1).c, "ok");
  assert.equal(verdict(10, 12.9).c, "ok");
  assert.equal(verdict(2, 6).c, "hi");
  assert.equal(verdict(6, 2).c, "lo");
});

test("weekendIdx: Fri/Sat/Sun for every day of the week", () => {
  // 15 days around each "today" from Mon 2026-10-19 through Sun 2026-10-25.
  for (let offset = 0; offset < 7; offset++) {
    const start = new Date(Date.UTC(2026, 9, 19 + offset - TODAY));
    const days = Array.from({ length: 15 }, (_, i) => ({ date: new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10) }));
    const { fri, sat, sun } = weekendIdx(days);
    const wd = i => new Date(days[i].date + "T12:00:00").getDay();
    assert.deepEqual([wd(fri), wd(sat), wd(sun)], [5, 6, 0], `today ${days[TODAY].date}`);
    assert.ok(sun < days.length, "Sunday is inside the forecast");
    if (wd(TODAY) === 0) assert.ok(sat > TODAY, "on Sunday, the next weekend");
    else assert.ok(sat >= TODAY && sat - TODAY < 7, "otherwise this weekend");
  }
});

test("snowGain: counts gains of 1 in or more, ignores settling and gaps", () => {
  const dates = ["d0", "d1", "d2", "d3"];
  assert.deepEqual(snowGain({ d0: 10, d1: 14, d2: 13, d3: 18 }, dates), { gain: 9, depth: 18 });
  assert.deepEqual(snowGain({ d0: 10, d1: 10.5, d2: 11, d3: 11 }, dates), { gain: 0, depth: 11 }, "half-inch noise ignored");
  assert.deepEqual(snowGain({ d0: 10, d2: 12 }, dates), { gain: null, depth: 12 }, "no consecutive pair");
  assert.equal(snowGain({}, dates), null);
});

test("passMatches: Epic includes limited partners", () => {
  const r = pass => ({ pass });
  assert.ok(passMatches("All", r("none")));
  assert.ok(passMatches("epic", r("epic-limited")));
  assert.ok(!passMatches("epic", r("ikon")));
  assert.ok(passMatches("none", r("none")));
});
