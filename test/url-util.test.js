import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULTS, parseHash, toHash } from "../js/url.js";
import { esc, fmt, ft, hashStr, km, slug } from "../js/util.js";

const REGIONS = new Set(["Utah", "N. Rockies"]);

test("hash: defaults give a bare view", () => {
  assert.equal(toHash(DEFAULTS), "#now");
  assert.deepEqual(parseHash("", REGIONS), DEFAULTS);
});

test("hash: round trip with filters", () => {
  for (const s of [
    { view: "weekend", window: "next3", region: "N. Rockies", pass: "ikon" },
    { view: "now", window: "next7", region: "All", pass: "epic" },
    { view: "check", window: "next3", region: "Utah", pass: "All" }
  ]) assert.deepEqual(parseHash(toHash(s), REGIONS), s);
});

test("hash: the window only matters on the now view", () => {
  assert.equal(toHash({ ...DEFAULTS, view: "weekend", window: "next7" }), "#weekend");
});

test("hash: junk falls back to defaults", () => {
  assert.deepEqual(parseHash("#nope?win=x&region=Mars&pass=gold", REGIONS), DEFAULTS);
});

test("fmt and ft", () => {
  assert.equal(fmt(0), "0");
  assert.equal(fmt(0.04), "0");
  assert.equal(fmt(0.05), "0.1");
  assert.equal(fmt(9.94), "9.9");
  assert.equal(fmt(12.4), "12");
  assert.equal(ft(1000), "3,281");
});

test("km: Salt Lake City to Denver is about 600 km", () => {
  const d = km(40.7608, -111.891, 39.7392, -104.9903);
  assert.ok(d > 590 && d < 610, String(d));
  assert.equal(km(1, 2, 1, 2), 0);
});

test("slug", () => {
  assert.equal(slug("Mt. Washington"), "mt-washington");
  assert.equal(slug("Le Massif"), "le-massif");
  assert.equal(slug("Mont Trémblant!"), "mont-tremblant");
});

test("esc", () => {
  assert.equal(esc(`<img src=x onerror="a('b')">&`), "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
  assert.equal(esc(null), "");
});

test("hashStr is stable and changes with input", () => {
  assert.equal(hashStr("abc"), hashStr("abc"));
  assert.notEqual(hashStr("abc"), hashStr("abd"));
});
