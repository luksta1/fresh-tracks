import assert from "node:assert/strict";
import { test } from "node:test";
import { TODAY } from "../js/config.js";
import { checkHtml, controlsHtml, dayStripHtml, heroHtml, legendHtml, mountainHtml, nowListHtml, passPill, popupHtml, skeletonHtml, trailTip, weekendHtml } from "../js/views.js";

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
  assert.equal((html.match(/class="row[ "]/g) || []).length, 2);
  assert.match(html, /class="rank">01</);
  assert.match(html, /class="row active" data-id="1" aria-expanded="true"/);
  assert.match(html, /data-id="0" aria-expanded="false"/);
  assert.equal((html.match(/class="detail"/g) || []).length, 1, "only the active row opens its strip");
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
  assert.match(popupHtml(resort(), st(), false), /class="pop-amt">9\.2[\s\S]*class="tier" style="--c:#eef3f7">[\s\S]*Deep<\/span>/, "colored tier pill with its glyph");
  assert.match(popupHtml(resort({ obs: { gain: 2 } }), st(), true), /SNOTEL measured \+2\.0″/);
  assert.equal(popupHtml(resort(), undefined, false), `<div class="pop"><b>Big Sky</b></div>`);
});

test("dayStripHtml: past 3 days, today, next 6, one scale, scored days lit", () => {
  const days = Array.from({ length: 15 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 9, 15 + i)).toISOString().slice(0, 10),
    snow: i === TODAY + 1 ? 8 : 1, snowAlt: i === TODAY + 1 ? 2 : null, tmax: 30, tmin: 18, wind: 10
  }));
  const html = dayStripHtml(resort({ days }), [TODAY, TODAY + 1, TODAY + 2]);
  const cells = html.match(/<li[^>]*>[\s\S]*?<\/li>/g);
  assert.equal(cells.length, 10);
  assert.equal(cells.filter(c => c.startsWith('<li class="past')).length, 3);
  assert.equal(cells.filter(c => /^<li class="(past )?hot"/.test(c)).length, 3);
  assert.match(cells[3], /class="d-day">Today</);
  assert.match(cells[4], /8\.0″[\s\S]*height:100%[\s\S]*ECMWF 2\.0″/, "the biggest day sets the scale");
  assert.match(cells[4], /class="alt" style="height:25%"/);
  assert.match(cells[5], /height:13%/, "1 in on an 8 in scale");
  assert.ok(!cells[5].includes('class="alt"'), "no ECMWF bar when it's missing");
  assert.match(html, /18–30°/);
  assert.match(dayStripHtml(resort(), []), /height:50%/, "small days still use a 4 in floor so 2 in isn't a full bar");
});

test("skeletonHtml: placeholder hero and rows, hidden from screen readers but announced", () => {
  const sk = skeletonHtml("now", 67);
  assert.match(sk.hero, /class="skel-hero" aria-hidden="true"/);
  assert.equal((sk.content.match(/class="skel-row"/g) || []).length, 8);
  assert.match(sk.content, /<p class="sr">Loading forecasts for 67 resorts…<\/p>/);
  assert.equal(skeletonHtml("check", 67).hero, "");
});

test("legendHtml: separate keys for powder (markers) and difficulty (runs)", () => {
  const html = legendHtml();
  const far = html.match(/<div class="legend-far">[\s\S]*?<\/div>/)[0];
  const near = html.match(/<div class="legend-near">[\s\S]*?<\/div>/)[0];
  assert.match(far, /Powder score[\s\S]*Quiet[\s\S]*Send it[\s\S]*Zoom in for trails/);
  assert.ok(!/Easy|Intermediate|Lift/.test(far), "no difficulty terms in the powder key");
  assert.match(near, /Trail difficulty[\s\S]*Easy[\s\S]*Intermediate[\s\S]*Black diamond[\s\S]*Double black[\s\S]*Lift/);
  assert.ok(!/Deep|Send it|Quiet/.test(near), "no powder terms in the trail key");
});

test("trailTip: names with difficulty, escaped", () => {
  assert.equal(trailTip("run", "b", "Three Moons"), "Three Moons · Intermediate");
  assert.equal(trailTip("run", "d", ""), "Double black run");
  assert.equal(trailTip("run", "", "Cat track"), "Cat track · Unrated");
  assert.equal(trailTip("lift", "", "Swift Current"), "Swift Current · Lift");
  assert.equal(trailTip("lift", "", ""), "Lift");
  assert.equal(trailTip("run", "k", "<img onerror=x>"), "&lt;img onerror=x&gt; · Black diamond");
});

test("popupHtml: après picks with escaped names and Maps links", () => {
  const r = resort({ apres: [["Mangy Moose", "Teton Village", "3:30 or no table"], [`<b>Bad"Bar`, "Town"]] });
  const html = popupHtml(r, st(), false);
  assert.match(html, /class="pop-label">Après/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Mangy%20Moose%2C%20Big%20Sky%2C%20MT" target="_blank" rel="noopener">Mangy Moose<\/a>/, "search by name, resort and state, not the wayfinding label");
  assert.match(html, /Teton Village · 3:30 or no table/);
  assert.ok(!html.includes(`<b>Bad"Bar`), "names are escaped");
  assert.match(html, /&lt;b&gt;Bad&quot;Bar/);
  const many = resort({ apres: [["A", "x"], ["B", "x"], ["C", "x"], ["D", "x"]] });
  assert.equal((popupHtml(many, st(), false).match(/<li>/g) || []).length, 3, "three at most");
  assert.match(popupHtml(resort({ apres: [] }), st(), false), /No picks yet/);
  const bare = popupHtml(resort({ apres: [["Scissorbills Saloon"]] }), st(), false);
  assert.match(bare, /query=Scissorbills%20Saloon%2C%20Big%20Sky%2C%20MT"/);
  assert.ok(!/<small>/.test(bare.split('class="pop-apres"')[1]), "no empty detail line");
});
