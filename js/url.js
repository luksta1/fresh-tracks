/* The URL hash carries the view and any non-default filters, so a link reproduces the screen:
   #weekend?region=Utah&pass=ikon or #now?win=next7 */
import { PASS_FILTERS, VIEWS, WINDOWS } from "./config.js";

export const DEFAULTS = { view: "now", window: "next3", region: "All", pass: "All" };

export function parseHash(hash, regions) {
  const [view, qs] = hash.replace(/^#/, "").split("?");
  const p = new URLSearchParams(qs || "");
  return {
    view: VIEWS.includes(view) ? view : DEFAULTS.view,
    window: WINDOWS[p.get("win")] ? p.get("win") : DEFAULTS.window,
    region: regions.has(p.get("region")) ? p.get("region") : DEFAULTS.region,
    pass: PASS_FILTERS.some(([v]) => v === p.get("pass")) ? p.get("pass") : DEFAULTS.pass
  };
}

export function toHash({ view, window, region, pass }) {
  const p = new URLSearchParams();
  if (view === "now" && window !== DEFAULTS.window) p.set("win", window);
  if (region !== DEFAULTS.region) p.set("region", region);
  if (pass !== DEFAULTS.pass) p.set("pass", pass);
  const qs = p.toString();
  return `#${view}${qs ? "?" + qs : ""}`;
}
