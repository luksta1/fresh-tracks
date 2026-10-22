/* The Leaflet map: tier markers, popups, and each resort's trails when zoomed in.
   Returns null when Leaflet didn't load, so callers use map?.method(). */
import { RUN_COLORS, TRAIL_ZOOM } from "./config.js";
import { tierOf } from "./score.js";
import { slug } from "./util.js";
import { trailTip } from "./views.js";

export function createMap(el, { resorts, popup, onPick }) {
  const L = window.L;
  if (!L) return null;

  const map = L.map(el, { zoomControl: true }).setView([46, -108], 4);
  // Standard OSM tiles (no key). styles.css inverts and dims them into a night map.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · resorts <a href="https://openskimap.org">OpenSkiMap</a>',
    maxZoom: 15
  }).addTo(map);

  /* ---------- markers ---------- */

  const layer = L.layerGroup().addTo(map);
  const markers = new Map();   // resort id -> marker
  let scores = new Map();      // resort id -> {score, snow} for the current view
  let active = null;

  function icon(id) {
    const s = scores.get(id) || { score: 0, snow: 0 };
    const t = tierOf(s.score);
    const size = Math.round(12 + Math.min(s.snow, 18) * 0.8);
    const cls = `mk mk-${t.shape}${t.n === 2 ? " mk-double" : ""}${t.hollow ? " mk-hollow" : ""}`;
    return L.divIcon({
      className: "mk-wrap" + (id === active ? " active" : ""),
      html: `<i class="${cls}" style="--c:${t.color};--s:${size}px"></i>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  for (const r of resorts) {
    const m = L.marker([r.lat, r.lon], { riseOnHover: true, keyboard: true, title: r.name });
    m.bindPopup(() => popup(r), { closeButton: false, offset: [0, -4] });
    m.on("click", () => onPick(r.id));
    markers.set(r.id, m);
  }

  // Show these resorts, sized and shaped by their stats ({score, snow} per id).
  function setMarkers(ids, stats, activeId) {
    scores = stats;
    active = activeId;
    layer.clearLayers();
    for (const id of ids) {
      const m = markers.get(id), s = stats.get(id);
      if (!m || !s) continue;
      m.setIcon(icon(id));
      m.setZIndexOffset(Math.round(s.score * 10));
      layer.addLayer(m);
    }
  }

  function setActive(id) {
    const prev = active;
    active = id;
    for (const mid of [prev, id]) if (mid != null && layer.hasLayer(markers.get(mid))) markers.get(mid).setIcon(icon(mid));
  }

  // Fly in close enough to see trails. The popup opens after the flight, because its
  // auto-pan would otherwise cancel the animation.
  function focus(id, fly) {
    const r = resorts[id], m = markers.get(id);
    if (!fly) { m.openPopup(); return; }
    map.flyTo([r.lat, r.lon], Math.max(map.getZoom(), TRAIL_ZOOM + 2), { duration: 0.8 });
    map.once("moveend", () => m.openPopup());
  }

  function fit(ids) {
    const pts = ids.map(id => [resorts[id].lat, resorts[id].lon]);
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 7 });
  }

  /* ---------- trails: trails/<slug>.json, fetched the first time the map is zoomed in near a resort ---------- */

  const trailLayer = L.layerGroup();
  const renderer = L.canvas({ padding: 0.5 });
  const trails = new Map();   // resort id -> "loading" | "missing" | layer group
  const tip = { sticky: true, className: "trail-tip" };

  async function loadTrails(r) {
    trails.set(r.id, "loading");
    try {
      const res = await fetch(`trails/${slug(r.name)}.json`);
      if (!res.ok) throw new Error(`trails for ${r.name}: ${res.status}`);
      const { runs, lifts } = await res.json();
      const group = L.layerGroup();
      for (const [sign, name, pts] of runs) {
        const line = L.polyline(pts, { renderer, color: RUN_COLORS[sign] ?? RUN_COLORS[""], weight: sign ? 2.5 : 1.5, opacity: sign ? 0.9 : 0.5 });
        line.bindTooltip(trailTip("run", sign, name), tip);
        group.addLayer(line);
      }
      for (const [name, , pts] of lifts) {
        const line = L.polyline(pts, { renderer, color: RUN_COLORS.k, weight: 1.5, opacity: 0.75, dashArray: "5 4" });
        line.bindTooltip(trailTip("lift", "", name), tip);
        group.addLayer(line);
      }
      trails.set(r.id, group);
      trailLayer.addLayer(group);
    } catch (e) {
      console.warn(e);
      trails.set(r.id, "missing");
    }
  }

  map.on("zoomend moveend", () => {
    const near = map.getZoom() >= TRAIL_ZOOM;
    el.parentElement.classList.toggle("trails-on", near);
    if (!near) { map.removeLayer(trailLayer); return; }
    trailLayer.addTo(map);
    const view = map.getBounds().pad(0.5);
    for (const r of resorts) if (!trails.has(r.id) && view.contains([r.lat, r.lon])) loadTrails(r);
  });

  return { setMarkers, setActive, focus, fit, resize: () => map.invalidateSize() };
}
