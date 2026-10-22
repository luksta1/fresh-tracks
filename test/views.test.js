import assert from "node:assert/strict";
import { test } from "node:test";
import { checkHtml, controlsHtml, heroHtml, mountainHtml, nowListHtml, passPill, popupHtml, weekendHtml } from "../js/views.js";

const resort = (over = {}) => ({
  id: 0, name: "Big Sky", st: "MT", region: "N. Rockies", pass: "ikon", base: 2077, summit: 3402,
  meta: { lifts: 37, runKm: 238, mix: { green: 27, blue: 38, black: 29, double: 6 } },
  days: Array.from({ length: 15 }, (_, i) => ({ date: `2026-10-${String(15 + i).padStart(2, "0")}`, snow: 2, snowAlt: 2, tmax: 30, tmin: 20, wind: 10 })),
  obs: null, station: null, ...over
});
const st = (over = {}) => ({ snow: 9.2, snowAlt: 6.3, score: 60, avgT: 26, wind: 22, ...over });

test("passPill", () => {
  assert.equal(passPill({ pass: "none" }), "");
  assert.match(passPill({ pass: "ikon" }), /pass-ikon">Ikon</);
  assert.match(passPill({ pass: "epic-limited", passNote: "7 days" }), />Epic · 7 days</);
  assert.match(passPill({ pass: "epic-limited" }), />Epic</, "no 'undefined' without a note");
});

test("mountainHtml: facts, mix and an accessible label", () => {
  const html = mountainHtml(resort());
  assert.match(html, /37 lifts · 4,347 ft vert · 238 km of runs/);
  assert.match(html, /aria-label="Trail mix by length: 27% green, 38% blue, 29% black, 6% double black"/);
  assert.match(mountainHtml(resort(), "span"), /^<span class="mountain">[\s\S]*<\/span>$/, "span variant for inside buttons");
  assert.equal(mountainHtml(resort({ meta: null })), "");
});

test("heroHtml: ECMWF check for forecasts, SNOTEL for past days", () => {
  const top = { r: resort(), s: st() };
  const next = heroHtml(top, "next3", 67);
  assert.match(next, /Deepest · Next 3 days · 67 resorts/);
  assert.match(next, /ECMWF says<\/span><b class="ok">6\.3″<small>agree/);
  const past = heroHtml({ r: resort({ obs: { gain: 3, depth: 10 } }), s: st() }, "past3", 67);
  assert.match(past, /SNOTEL measured<\/span><b class="">3\.0″/);
  assert.match(heroHtml({ r: resort(), s: st({ score: 1 }) }, "next3", 5), /class="hero quiet"[\s\S]*Nothing deep yet/);
  assert.equal(heroHtml(undefined, "next3", 0), "");
});

test("nowListHtml: ranks, badges, empty state", () => {
  const rows = [{ r: resort(), s: st() }, { r: resort({ id: 1, name: "Alta" }), s: st({ snow: 1, snowAlt: 1, score: 10 }) }];
  const html = nowListHtml(rows, "next3", 1);
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.match(html, /class="rank">01</);
  assert.match(html, /class="row active" data-id="1"/);
  assert.match(html, /Models agree/);
  assert.match(nowListHtml([], "next3", null), /No resorts match/);
});

test("weekendHtml: three cards then the rest, or a quiet note", () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ r: resort({ id: i, name: `R${i}` }), s: st({ score: 50 - i }) }));
  const { picks, rest } = weekendHtml(rows, [9, 10, 11], null);
  assert.equal((picks.match(/<button type="button" class="card[ "]/g) || []).length, 3);
  assert.match(picks, /class="card top"/);
  assert.match(rest, /Also in the running/);
  assert.match(rest, /class="rank">04</);
  for (const button of picks.match(/<button[\s\S]*?<\/button>/g)) assert.ok(!/<div/.test(button), "no divs inside card buttons");
  const quiet = weekendHtml(rows.map(x => ({ ...x, s: st({ score: 1 }) })), [9, 10, 11], null);
  assert.match(quiet.picks, /Nothing worth chasing/);
  assert.match(quiet.rest, /All resorts[\s\S]*class="rank">01</);
});

test("checkHtml: escapes station names from the SNOTEL API", () => {
  const r = resort({ station: { name: `<b onmouseover="x">Peak`, dist: 3, elev: 2500 }, obs: { gain: 2, depth: 20 } });
  const html = checkHtml([{ r, model: 4, obs: 2, v: { t: "Model high", c: "hi" } }]);
  assert.ok(!html.includes("<b onmouseover"));
  assert.match(html, /&lt;b onmouseover=&quot;x&quot;&gt;Peak/);
  assert.match(html, /model is running high by about 2\.0″/);
});

test("controlsHtml: window buttons only on the now view", () => {
  const regions = ["Utah"];
  assert.match(controlsHtml({ view: "now", window: "next7", region: "All", pass: "All" }, regions), /data-win="next7" aria-pressed="true"/);
  assert.ok(!controlsHtml({ view: "weekend", window: "next3", region: "Utah", pass: "ikon" }, regions).includes("data-win"));
  assert.match(controlsHtml({ view: "weekend", window: "next3", region: "Utah", pass: "ikon" }, regions), /value="Utah" selected/);
  assert.equal(controlsHtml({ view: "check" }, regions), "");
});

test("popupHtml", () => {
  assert.match(popupHtml(resort(), st(), false), /MT · summit 11,161 ft · 37 lifts/);
  assert.match(popupHtml(resort({ obs: { gain: 2 } }), st(), true), /SNOTEL measured \+2\.0″/);
  assert.equal(popupHtml(resort(), undefined, false), `<div class="pop"><b>Big Sky</b></div>`);
});
