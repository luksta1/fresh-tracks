/* Small helpers with no DOM access. Also imported by the scripts in scripts/. */

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Snow amounts: "0" under a twentieth, one decimal under 10, whole numbers above.
export const fmt = n => (n < 0.05 ? "0" : n < 10 ? n.toFixed(1) : String(Math.round(n)));

// Meters to a formatted number of feet.
export const ft = m => Math.round(m * 3.28084).toLocaleString("en-US");

// Great-circle distance in km.
export function km(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

// Short stable hash, used to version caches.
export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// File-name slug for a resort's trails file.
export const slug = name => name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Escape text that comes from outside this repo (station names, OpenStreetMap run names).
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);
