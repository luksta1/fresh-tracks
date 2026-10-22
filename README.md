# Fresh Tracks

A personal powder tracker for ~70 North American ski resorts. No build step, no server code.

- **Right now**: ranked list and map by powder score (past 3 days, next 3 days, next 7 days)
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

    python3 -m http.server 8000      # or: npx serve .

Then open http://localhost:8000. Both APIs allow cross-origin requests, so no proxy is needed.

## Deploy

Any static host works. On Netlify, `netlify.toml` sets the publish directory to `.`:

    npx netlify-cli deploy --prod

## Customize

- `resorts.js`: add or remove resorts (name, state, region, lat, lon, base m, summit m, pass). Pass is `ikon`, `epic`, `epic-limited` (with a note like "7 days"), or `none`. Tags match the 2026/27 pass lists; recheck each fall. Editing this file invalidates the forecast cache automatically.
- `app.js`, `MODELS`: the main forecast model and the second opinion (any Open-Meteo model ids).
- `app.js`, `dayScore()`: tune the powder score weights.
- `app.js`, `confidence()`: tune when models count as agreeing.
- `app.js`, `weekendIdx()` and the weights in `renderWeekend()`: change how the weekend is scored.

## Data

- Forecasts: Open-Meteo (free for non-commercial use, no key). `best_match` drives scores;
  `ecmwf_ifs025` is the second opinion. Snowfall is the model grid cell's value; the
  `elevation` parameter mainly corrects temperature.
- Snow depth: USDA NRCS SNOTEL via the AWDB REST API, stations filtered with the
  `*:*:SNTL` triplet wildcard. Measured "new snow" is the sum of daily depth gains of 1" or
  more, so it undercounts when snow settles between readings.
