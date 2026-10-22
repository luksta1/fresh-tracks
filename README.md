# Fresh Tracks

A personal powder tracker for ~70 North American ski resorts. No build step.

- **Right now**: ranked list and map by powder score (past 3 days, next 3 days, next 7 days)
- **This weekend**: top 3 picks for Fri/Sat/Sun with a plain-English reason
- **Model check**: modeled snowfall vs. measured SNOTEL snow depth gains (US only)

## Run locally

    npx netlify-cli dev        # serves the site and the SNOTEL proxy function

Or just open `index.html` (or `npx serve .`). SNOTEL then calls the public API directly,
which works only if that API allows cross-origin requests; the proxy is the reliable path.

## Deploy

    npx netlify-cli deploy --prod

Or push this folder to GitHub and connect the repo in Netlify. Publish directory is `.`,
no build command. Deploy via Git or the CLI so the `netlify/functions` folder is included.

## Customize

- `resorts.js`: add or remove resorts (name, state, region, lat, lon, base m, summit m, pass). Pass is `ikon`, `epic`, `epic-limited` (with a note like "7 days"), or `none`. Tags match the 2026/27 pass lists; recheck each fall.
- `app.js`, `dayScore()`: tune the powder score weights.
- `app.js`, `weekendIdx()` and the weights in `renderWeekend()`: change how the weekend is scored.

## Data

- Forecasts: Open-Meteo (free for non-commercial use, no key).
- Snow depth: USDA NRCS SNOTEL via the AWDB REST API. Measured "new snow" is the sum of
  daily depth gains of 1" or more, so it undercounts when snow settles between readings.
