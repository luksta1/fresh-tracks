# Fresh Tracks

A personal powder tracker for 67 North American ski resorts. Static site: no build step, no
server code, no dependencies.

- **Right now**: ranked list and map by powder score (past 3 days, next 3 days, next 7 days).
  Click a resort to open its day-by-day snowfall for the past 3 days, today and the next 6.
- **This weekend**: top 3 picks for Fri/Sat/Sun with a plain-English reason
- **Model check**: modeled snowfall vs. measured SNOTEL snow depth gains (US only)

Forecast rows carry a confidence badge comparing the main model with ECMWF. The URL hash
holds the view and filters (`#weekend?region=Utah&pass=ikon`), so "Copy link" shares
exactly what you're looking at.

## Look

"Storm Night": navy ground, one hi-vis accent (`--accent` in `styles.css`), Big Shoulders
Display for names and totals, JetBrains Mono for data, trail-sign glyphs for score tiers.
The map is standard OSM tiles inverted and dimmed with a CSS filter (`.leaflet-tile-pane`),
so there's no tile key to manage.

## Run locally

    npm run serve        # python3 -m http.server 8000, or any static server

Then open http://localhost:8000. The app is ES modules, so it needs a server; opening
`index.html` from disk won't work. Both APIs allow cross-origin requests, so no proxy is needed.

## Test

    npm test             # node --test, Node 20+, no installs

Covers scoring, the weekend and SNOTEL math, URL hashes, the HTML views (including escaping of
outside text), parsing against saved real API responses in `test/fixtures/`, and the committed
data: every resort well-formed, matched in `resort-meta.js`, and with a trails file near it.

## Layout

| File | What it does |
| --- | --- |
| `index.html` | Page shell; loads Leaflet from a CDN, then `js/main.js` |
| `styles.css` | The whole look |
| `resorts.js` | Hand-edited resort list |
| `apres.js` | Hand-edited après picks |
| `resort-meta.js`, `trails/` | Generated from OpenSkiMap by `scripts/` |
| `js/main.js` | State, rendering, events, startup |
| `js/data.js` | Resort setup, Open-Meteo and SNOTEL loading, local cache |
| `js/score.js` | Powder score, tiers, model confidence, weekend days, SNOTEL gains (pure) |
| `js/views.js` | HTML for each view (pure) |
| `js/map.js` | Leaflet map, markers, popups, trails |
| `js/url.js` | Shareable URL hash |
| `js/config.js`, `js/util.js` | Constants; small helpers shared with `scripts/` |

## Deploy

Any static host works. On Netlify, `netlify.toml` sets the publish directory to `.`:

    npx netlify-cli deploy --prod

## Customize

- `resorts.js`: add or remove resorts (name, state, region, lat, lon, base m, summit m, pass). Pass is `ikon`, `epic`, `epic-limited` (with a note like "7 days"), or `none`. Tags match the 2026/27 pass lists; recheck each fall. Editing this file invalidates the forecast cache automatically.
- `apres.js`: up to three après picks per resort, shown in its map popup with a Google Maps link.
  Hand-edited: `[name, where?, note?]`. Every resort has picks; check them each season, since bars
  close and change hands. `npm test` catches typos in resort names and resorts left without picks.
- `resort-meta.js`: generated, don't edit. After changing `resorts.js` (and once a season), run
  `npm run enrich` to refresh it. It prints each match so you can spot a wrong one;
  fix those with `OVERRIDES` at the top of the script.
- `trails/`: generated, don't edit. One file per resort with its runs and lifts, drawn on the map
  from zoom 11 in (picking a resort flies there). Rebuild after refreshing `resort-meta.js`:
  `npm run trails` (streams OpenSkiMap's runs and lifts files, about 10 seconds). Then `npm test`.
- `js/config.js`, `MODELS`: the main forecast model and the second opinion (any Open-Meteo model ids).
- `js/config.js`, `WEEKEND_WEIGHTS`, and `js/score.js`, `weekendIdx()`: how the weekend is scored.
- `js/score.js`, `dayScore()`: the powder score weights. `confidence()`: when models count as agreeing.

## Data

- Forecasts: Open-Meteo (free for non-commercial use, no key). `best_match` drives scores;
  `ecmwf_ifs025` is the second opinion. Snowfall is the model grid cell's value; the
  `elevation` parameter mainly corrects temperature.
- Resorts: OpenSkiMap (openskimap.org), © OpenStreetMap contributors, ODbL. Supplies location,
  lift-served base and summit, lift count, trail length, and the green/blue/black mix by trail
  length (run counts depend on how mappers split trails, so they aren't shown), and the run and
  lift lines in `trails/`, simplified to about 4 m. These values
  override the hand-entered ones in `resorts.js`.
- Snow depth: USDA NRCS SNOTEL via the AWDB REST API, stations filtered with the
  `*:*:SNTL` triplet wildcard. Measured "new snow" is the sum of daily depth gains of 1" or
  more, so it undercounts when snow settles between readings.
