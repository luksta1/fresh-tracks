/* Constants shared across the app. */

export const METEO = "https://api.open-meteo.com/v1/forecast";
export const AWDB = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";   // sends CORS headers, no proxy needed
// "main" drives every score. "alt" is a second opinion for the confidence badge.
// best_match picks the best regional model (GFS/HRRR in the US, GEM in Canada).
export const MODELS = { main: "best_match", alt: "ecmwf_ifs025" };
export const PAST = 7;          // days of history requested
export const FUTURE = 8;        // days of forecast requested (today included)
export const TODAY = PAST;      // index of "today" in each resort's days array
export const FORECAST_TTL = 30 * 60 * 1000;
export const STATION_TTL = 7 * 24 * 3600 * 1000;
export const MAX_STATION_KM = 40;
export const TIMEOUT = 20000;   // ms per request, so a stalled API shows an error instead of spinning
export const US = new Set(["CO", "UT", "WY", "MT", "ID", "NM", "AZ", "CA", "NV", "OR", "WA", "AK", "VT", "NH", "ME", "NY"]);

// Score tiers use ski-trail signage: circle, square, diamond, double diamond.
// On the dark theme black diamonds read as white, and "Send it" takes the accent.
export const TIERS = [
  { min: 75, name: "Send it", shape: "diamond", n: 2, color: "#c6ff3d" },
  { min: 50, name: "Deep", shape: "diamond", n: 1, color: "#eef3f7" },
  { min: 25, name: "Good", shape: "square", n: 1, color: "#3b8bff" },
  { min: 5, name: "Light", shape: "circle", n: 1, color: "#2fd07a" },
  { min: 0, name: "Quiet", shape: "circle", n: 1, color: "#5b6878", hollow: true }
];

export const WINDOWS = {
  past3: { label: "Past 3 days", idx: [TODAY - 3, TODAY - 2, TODAY - 1] },
  next3: { label: "Next 3 days", idx: [TODAY, TODAY + 1, TODAY + 2] },
  next7: { label: "Next 7 days", idx: [0, 1, 2, 3, 4, 5, 6].map(i => TODAY + i) }
};
// Friday snow is fresh on Saturday; Sunday is leftovers.
export const WEEKEND_WEIGHTS = [0.7, 1, 0.9];

export const VIEWS = ["now", "weekend", "check"];
export const PASS_FILTERS = [["All", "Any pass"], ["epic", "Epic"], ["ikon", "Ikon"], ["none", "No pass"]];

// Trails draw from this zoom in; picking a resort flies a little closer than that.
export const TRAIL_ZOOM = 11;
// Run difficulty on the map. These reuse the trail-sign colors the powder tiers borrow, so the
// legend switches to this key whenever trails are drawn.
export const RUN_COLORS = { g: "#2fd07a", b: "#3b8bff", k: "#eef3f7", d: "#c6ff3d", "": "#5b6878" };
export const RUNS = [
  { sign: "g", name: "Easy", shape: "circle", n: 1 },
  { sign: "b", name: "Intermediate", shape: "square", n: 1 },
  { sign: "k", name: "Black diamond", shape: "diamond", n: 1 },
  { sign: "d", name: "Double black", shape: "diamond", n: 2 }
];
