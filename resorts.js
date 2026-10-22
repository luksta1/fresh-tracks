/*
  Resort list. Edit freely: add, remove, or fix coordinates.
  Format: [name, state/province, region, latitude, longitude, base elevation (m), summit elevation (m), pass, note]
  pass is "ikon", "epic", "epic-limited" (partner with a day cap, shown in note), or "none".
  Pass tags checked against the 2026/27 Epic and Ikon resort lists in Oct 2026. Affiliations change
  from year to year, so recheck each fall. "ikon" does not capture per-resort day limits.
  Forecasts are pulled for a point about 70% of the way from base to summit.
  Coordinates and elevations are approximate; fine for 10 km weather grids.
*/
export const RESORTS = [
  // Colorado
  ["Aspen Snowmass", "CO", "Colorado", 39.2084, -106.9490, 2400, 3813, "ikon"],
  ["Vail", "CO", "Colorado", 39.6061, -106.3550, 2475, 3527, "epic"],
  ["Breckenridge", "CO", "Colorado", 39.4817, -106.0384, 2926, 3963, "epic"],
  ["Telluride", "CO", "Colorado", 37.9375, -107.8123, 2659, 3831, "epic-limited", "7 days"],
  ["Winter Park", "CO", "Colorado", 39.8868, -105.7625, 2743, 3676, "ikon"],
  ["Steamboat", "CO", "Colorado", 40.4572, -106.8045, 2103, 3221, "ikon"],
  ["Arapahoe Basin", "CO", "Colorado", 39.6426, -105.8719, 3286, 3978, "ikon"],
  ["Loveland", "CO", "Colorado", 39.6800, -105.8979, 3231, 3871, "none"],
  ["Copper Mountain", "CO", "Colorado", 39.5022, -106.1497, 2926, 3753, "ikon"],
  ["Crested Butte", "CO", "Colorado", 38.8997, -106.9650, 2775, 3707, "epic"],
  ["Wolf Creek", "CO", "Colorado", 37.4725, -106.7930, 3186, 3598, "none"],

  // Utah
  ["Alta", "UT", "Utah", 40.5884, -111.6386, 2600, 3216, "ikon"],
  ["Snowbird", "UT", "Utah", 40.5830, -111.6538, 2365, 3353, "ikon"],
  ["Brighton", "UT", "Utah", 40.5980, -111.5832, 2595, 3200, "ikon"],
  ["Solitude", "UT", "Utah", 40.6199, -111.5919, 2435, 3054, "ikon"],
  ["Park City", "UT", "Utah", 40.6514, -111.5080, 2073, 3049, "epic"],
  ["Deer Valley", "UT", "Utah", 40.6374, -111.4783, 2000, 2917, "ikon"],
  ["Powder Mountain", "UT", "Utah", 41.3790, -111.7800, 2200, 2750, "none"],
  ["Snowbasin", "UT", "Utah", 41.2160, -111.8570, 1950, 2940, "ikon"],

  // Northern Rockies (WY, MT, ID)
  ["Jackson Hole", "WY", "N. Rockies", 43.5875, -110.8279, 1924, 3185, "ikon"],
  ["Grand Targhee", "WY", "N. Rockies", 43.7904, -110.9581, 2200, 3009, "none"],
  ["Big Sky", "MT", "N. Rockies", 45.2850, -111.4010, 2072, 3403, "ikon"],
  ["Bridger Bowl", "MT", "N. Rockies", 45.8171, -110.8978, 1855, 2652, "none"],
  ["Whitefish", "MT", "N. Rockies", 48.4830, -114.3560, 1360, 2100, "none"],
  ["Sun Valley", "ID", "N. Rockies", 43.6970, -114.3510, 1750, 2788, "ikon"],
  ["Schweitzer", "ID", "N. Rockies", 48.3670, -116.6220, 1195, 1920, "ikon"],
  ["Brundage", "ID", "N. Rockies", 45.0050, -116.1560, 1700, 2320, "none"],
  ["Bogus Basin", "ID", "N. Rockies", 43.7640, -116.1020, 1750, 2290, "none"],

  // Southwest
  ["Taos", "NM", "Southwest", 36.5960, -105.4540, 2800, 3600, "ikon"],
  ["Arizona Snowbowl", "AZ", "Southwest", 35.3310, -111.7120, 2800, 3500, "none"],

  // Sierra and Tahoe
  ["Palisades Tahoe", "CA", "Sierra", 39.1970, -120.2350, 1890, 2740, "ikon"],
  ["Northstar", "CA", "Sierra", 39.2746, -120.1210, 1900, 2610, "epic"],
  ["Heavenly", "CA", "Sierra", 38.9353, -119.9400, 2000, 3060, "epic"],
  ["Kirkwood", "CA", "Sierra", 38.6850, -120.0650, 2377, 3036, "epic"],
  ["Sugar Bowl", "CA", "Sierra", 39.3040, -120.3340, 2100, 2500, "none"],
  ["Mt. Rose", "NV", "Sierra", 39.3140, -119.8860, 2590, 2950, "none"],
  ["Mammoth", "CA", "Sierra", 37.6308, -119.0326, 2424, 3369, "ikon"],

  // Pacific Northwest
  ["Mt. Bachelor", "OR", "Pacific NW", 43.9792, -121.6886, 1900, 2763, "ikon"],
  ["Mt. Hood Meadows", "OR", "Pacific NW", 45.3310, -121.6650, 1378, 2225, "none"],
  ["Crystal Mountain", "WA", "Pacific NW", 46.9350, -121.4740, 1341, 2137, "ikon"],
  ["Stevens Pass", "WA", "Pacific NW", 47.7448, -121.0890, 1240, 1780, "epic"],
  ["Mt. Baker", "WA", "Pacific NW", 48.8570, -121.6650, 1067, 1551, "none"],

  // Alaska
  ["Alyeska", "AK", "Alaska", 60.9697, -149.0990, 75, 1200, "ikon"],

  // Northeast
  ["Stowe", "VT", "Northeast", 44.5303, -72.7814, 390, 1340, "epic"],
  ["Jay Peak", "VT", "Northeast", 44.9269, -72.5051, 570, 1209, "none"],
  ["Killington", "VT", "Northeast", 43.6045, -72.8201, 340, 1291, "ikon"],
  ["Sugarbush", "VT", "Northeast", 44.1360, -72.9030, 490, 1245, "ikon"],
  ["Loon Mountain", "NH", "Northeast", 44.0364, -71.6215, 305, 930, "ikon"],
  ["Sugarloaf", "ME", "Northeast", 45.0490, -70.3158, 430, 1291, "ikon"],
  ["Sunday River", "ME", "Northeast", 44.4733, -70.8561, 235, 975, "ikon"],
  ["Whiteface", "NY", "Northeast", 44.3659, -73.9026, 370, 1350, "none"],

  // British Columbia
  ["Whistler Blackcomb", "BC", "BC", 50.1163, -122.9574, 675, 2284, "epic"],
  ["Cypress", "BC", "BC", 49.3960, -123.2040, 930, 1440, "ikon"],
  ["Mt. Washington", "BC", "BC", 49.7410, -125.3040, 1100, 1590, "none"],
  ["Revelstoke", "BC", "BC", 51.0050, -118.1630, 512, 2225, "ikon"],
  ["Kicking Horse", "BC", "BC", 51.2970, -117.0480, 1190, 2450, "epic-limited", "7 days"],
  ["Fernie", "BC", "BC", 49.4637, -115.0878, 1100, 2160, "epic-limited", "7 days"],
  ["Red Mountain", "BC", "BC", 49.1056, -117.8461, 1185, 2075, "ikon"],
  ["Whitewater", "BC", "BC", 49.4440, -117.1470, 1640, 2060, "none"],
  ["Sun Peaks", "BC", "BC", 50.8830, -119.8850, 1255, 2152, "ikon"],
  ["Big White", "BC", "BC", 49.7220, -118.9310, 1508, 2319, "none"],
  ["Panorama", "BC", "BC", 50.4600, -116.2380, 1160, 2400, "ikon"],

  // Alberta and Quebec
  ["Lake Louise", "AB", "Alberta", 51.4320, -116.1590, 1646, 2637, "ikon"],
  ["Sunshine Village", "AB", "Alberta", 51.0780, -115.7610, 1660, 2730, "ikon"],
  ["Marmot Basin", "AB", "Alberta", 52.8000, -118.0830, 1698, 2612, "none"],
  ["Mont Tremblant", "QC", "Quebec", 46.2090, -74.5850, 230, 875, "ikon"],
  ["Le Massif", "QC", "Quebec", 47.2878, -70.6475, 50, 770, "none"]
];
