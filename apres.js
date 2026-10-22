/*
  Après picks: up to three per resort, shown in the resort's map popup.
  Keyed by resort name in resorts.js. Each pick: [name, where?, note?]
    where: short wayfinding label shown under the name ("Teton Village, tram base",
           "Downtown Boise (off mountain)")
    note:  optional, one short line in your own words ("3:30 or no table")
  The Google Maps link searches the bar's name with the resort and state.
  From the list compiled in Oct 2026. Places close and change hands, and some on-mountain bars
  stop serving before last chair, so check each season.
*/
export const APRES = {
  "Aspen Snowmass": [
    ["Cloud Nine Alpine Bistro", "Aspen Highlands, on mountain near Cloud Nine lift"],
    ["Ajax Tavern", "Aspen Mountain base, gondola plaza"],
    ["Venga Venga", "Snowmass Base Village"]
  ],
  "Vail": [
    ["The Red Lion", "Vail Village, near Gondola One"],
    ["Garfinkel's", "Lionshead Village, base area"],
    ["Pepi's Bar", "Vail Village, near Bridge Street"]
  ],
  "Breckenridge": [
    ["T-Bar", "Peak 8 base area"],
    ["Robbie's Tavern", "Peak 8 base area"],
    ["RMU Tavern", "Downtown Breckenridge, Main Street"]
  ],
  "Telluride": [
    ["Gorrono Ranch", "Mid-mountain, Gorrono Ranch ski area"],
    ["Allred's", "San Sophia gondola mid-station"],
    ["The Last Dollar Saloon", "Downtown Telluride, Colorado Avenue"]
  ],
  "Winter Park": [
    ["Derailer Bar", "Winter Park base area"],
    ["Vertical Bistro & Tap", "Winter Park Resort village"],
    ["Deno's Mountain Bistro", "Downtown Winter Park"]
  ],
  "Steamboat": [
    ["T Bar", "Steamboat base, near Christie lift"],
    ["Slopeside Grill", "Steamboat base, slopeside"],
    ["Timber & Torch", "Steamboat base area"]
  ],
  "Arapahoe Basin": [
    ["6th Alley Bar & Grill", "A-Basin base lodge, 6th Alley"]
  ],
  "Loveland": [
    ["The Rathskeller", "Loveland Basin base lodge, lower level"],
    ["Loveland Wedge Bar", "Loveland Basin base lodge"]
  ],
  "Copper Mountain": [
    ["Duke's on the River", "Copper Center Village"],
    ["Endo's Adrenaline Cafe", "Copper Center Village"],
    ["JJ's Rocky Mountain Tavern", "Copper East Village, Super Bee lift base"]
  ],
  "Crested Butte": [
    ["The Avalanche Bar & Grill", "Mount Crested Butte base village"],
    ["Secret Stash", "Downtown Crested Butte, Elk Avenue"],
    ["The Eldo", "Downtown Crested Butte, Elk Avenue"]
  ],
  "Wolf Creek": [
    ["Riff Raff Brewing Company", "Pagosa Springs, downtown (off mountain)"],
    ["Kip's Grill", "Pagosa Springs, downtown (off mountain)"]
  ],
  "Alta": [
    ["Goldminer's Saloon", "Alta base, Goldminer's Daughter Lodge"],
    ["Sitzmark Club", "Alta base, Alta Lodge"],
    ["The Peruvian Bar", "Alta base, Alta Peruvian Lodge"]
  ],
  "Snowbird": [
    ["The Tram Club", "Snowbird base, Snowbird Center lower level"],
    ["The Aerie Lounge", "Snowbird base, Cliff Lodge"]
  ],
  "Brighton": [
    ["Molly Green's", "Brighton base, Molly Green's lodge"]
  ],
  "Solitude": [
    ["Thirsty Squirrel", "Solitude Village base area"],
    ["Argenta Pub", "Solitude Moonbeam base area"]
  ],
  "Park City": [
    ["High West Saloon", "Old Town Park City, lower Main Street"],
    ["No Name Saloon", "Old Town Park City, Main Street"],
    ["The Spur Bar & Grill", "Old Town Park City, Main Street"]
  ],
  "Deer Valley": [
    ["The Après Lounge", "Deer Valley Snow Park base, St. Regis funicular access"],
    ["The Brass Tag", "Deer Valley Empire Pass, Silver Baron Lodge"]
  ],
  "Powder Mountain": [
    ["Powder Keg", "Powder Mountain base area, Timberline Lodge"],
    ["Shooting Star Saloon", "Huntsville, Ogden Valley (off mountain)"]
  ],
  "Snowbasin": [
    ["Cinnabar", "Snowbasin base, Earl's Lodge"],
    ["Shooting Star Saloon", "Huntsville, Ogden Valley (off mountain)"]
  ],
  "Jackson Hole": [
    ["Mangy Moose Saloon", "Teton Village, mountain base"],
    ["Tram Dock", "Teton Village, tram base"],
    ["The Handle Bar", "Teton Village, Four Seasons base"]
  ],
  "Grand Targhee": [
    ["Trap Bar & Grill", "Grand Targhee base village"]
  ],
  "Big Sky": [
    ["Scissorbills Saloon", "Big Sky Mountain Village base area"],
    ["Umbrella Bar", "Big Sky Mountain Village base area"],
    ["Montana Jack", "Big Sky Mountain Village base area"]
  ],
  "Bridger Bowl": [
    ["Grizzly Ridge", "Bridger Bowl base, lodge area"],
    ["Bridger Brewing", "Bozeman, downtown vicinity (off mountain)"]
  ],
  "Whitefish": [
    ["Bierstube", "Whitefish Mountain Resort, base village"],
    ["Hellroaring Saloon", "On mountain, Hellroaring Basin lodge"],
    ["The Great Northern Bar", "Downtown Whitefish"]
  ],
  "Sun Valley": [
    ["Apple's Bar & Grill", "Warm Springs base area"],
    ["River Run Lodge", "River Run base lodge"],
    ["Grumpy's", "Downtown Ketchum"]
  ],
  "Schweitzer": [
    ["Taps Bar", "Schweitzer base village"]
  ],
  "Brundage": [
    ["Smoky's Bar & Grill", "Brundage base lodge, plaza level"],
    ["Upper Lot Pub", "Brundage base lodge, top floor"]
  ],
  "Bogus Basin": [
    ["Double R Ranch BBQ", "Bogus Basin base lodge area"],
    ["Bittercreek Alehouse", "Downtown Boise (off mountain)"]
  ],
  "Taos": [
    ["The Martini Tree", "Taos Ski Valley base village"],
    ["The Bavarian", "On mountain, Bavarian at Lift 4 base"]
  ],
  "Arizona Snowbowl": [
    ["Agassiz Lodge Bar", "Arizona Snowbowl base, Agassiz Lodge"],
    ["Mother Road Brewing Company", "Downtown Flagstaff (off mountain)"]
  ],
  "Palisades Tahoe": [
    ["Le Chamois", "Palisades base, Olympic Valley"],
    ["KT Base Bar", "Palisades base, near KT-22 lift"],
    ["The Slot Bar", "The Village at Palisades Tahoe"]
  ],
  "Northstar": [
    ["The Overlook", "Northstar Village, ice rink area"],
    ["Bourbon Pub", "Northstar Village, base area"]
  ],
  "Heavenly": [
    ["Tamarack Lodge", "On mountain, Tamarack Lodge near gondola upper station"],
    ["McP's Taphouse", "South Lake Tahoe, near Heavenly Village"],
    ["Basecamp Pizza", "Heavenly Village, gondola base"]
  ],
  "Kirkwood": [
    ["The Cornice", "Kirkwood base village, main lodge"],
    ["K-Bar", "Kirkwood base village"]
  ],
  "Sugar Bowl": [
    ["Belt Room Bar", "Sugar Bowl Village, historic lodge"],
    ["Judah Lodge", "Judah base area, Judah Lodge"]
  ],
  "Mt. Rose": [
    ["Timbers Bar", "Mt. Rose base, main lodge"],
    ["Inclined Burgers and Brews", "Incline Village (off mountain)"]
  ],
  "Mammoth": [
    ["The Yodler", "Mammoth Main Lodge base area"],
    ["Tusks Bar", "Mammoth Main Lodge base area"],
    ["Clocktower Cellar", "Mammoth Lakes town"]
  ],
  "Mt. Bachelor": [
    ["Clearing Rock Bar", "Mt. Bachelor West Village base area"],
    ["10 Barrel Brewing", "Bend, west side (off mountain)"]
  ],
  "Mt. Hood Meadows": [
    ["Vertical Restaurant & Sports Bar", "Mt. Hood Meadows main base lodge"],
    ["pFriem Family Brewers", "Hood River waterfront (off mountain)"]
  ],
  "Crystal Mountain": [
    ["Snorting Elk Cellar", "Crystal Mountain base, Alpine Inn lower level"],
    ["Fireside Cantina", "Crystal Mountain base area"]
  ],
  "Stevens Pass": [
    ["Foggy Goggle", "Stevens Pass main base lodge"],
    ["The Whistling Post", "Skykomish town (off mountain)"]
  ],
  "Mt. Baker": [
    ["Chair 9 Woodstone Pizza & Bar", "Glacier, Mount Baker Highway (off mountain)"],
    ["North Fork Brewery", "Deming, Mount Baker Highway (off mountain)"]
  ],
  "Alyeska": [
    ["Sitzmark Bar & Grill", "Alyeska base, Sitzmark building"],
    ["Chair 5 Restaurant", "Girdwood town (off mountain)"]
  ],
  "Stowe": [
    ["The Matterhorn", "Stowe Mountain Road, off mountain"],
    ["WhistlePig Pavilion", "Stowe base, Spruce Peak"],
    ["Doc Ponds", "Stowe village/town, Mountain Road"]
  ],
  "Jay Peak": [
    ["Bullwheel Bar", "Jay Peak Stateside base lodge"],
    ["Tower Bar", "Jay Peak Tram Haus base area"]
  ],
  "Killington": [
    ["The Wobbly Barn", "Killington Access Road (off mountain)"],
    ["Lookout Tavern", "Killington Access Road (off mountain)"],
    ["The Pickle Barrel", "Killington Access Road (off mountain)"]
  ],
  "Sugarbush": [
    ["Rumble's Bistro & Bar", "Sugarbush Lincoln Peak base village"],
    ["The Wunderbar", "Sugarbush Lincoln Peak base lodge"],
    ["Castlerock Pub", "Sugarbush Lincoln Peak base lodge"]
  ],
  "Loon Mountain": [
    ["Paul Bunyan Room", "Loon Mountain base lodge, Octagon Lodge"],
    ["One Love Brewery", "Downtown Lincoln (off mountain)"]
  ],
  "Sugarloaf": [
    ["Widowmaker", "Sugarloaf base lodge, upper level"],
    ["The Bag & Kettle", "Sugarloaf base village"]
  ],
  "Sunday River": [
    ["Foggy Goggle", "Sunday River South Ridge base lodge"],
    ["Matterhorn Ski Bar", "Newry, Sunday River Road (off mountain)"]
  ],
  "Whiteface": [
    ["Cloudspin Bar & Grill", "Whiteface base lodge"],
    ["Lake Placid Pub & Brewery", "Lake Placid village (off mountain)"],
    ["Smoke Signals", "Lake Placid village, Main Street"]
  ],
  "Whistler Blackcomb": [
    ["Longhorn Saloon", "Whistler Village, gondola base"],
    ["Garibaldi Lift Co. (GLC)", "Whistler Village, gondola base"],
    ["Merlin's Bar & Grill", "Blackcomb Upper Village, base area"]
  ],
  "Cypress": [
    ["Crazy Raven Bar & Grill", "Cypress main base lodge"]
  ],
  "Mt. Washington": [
    ["Ted's Bar & Grill", "Mt. Washington Alpine Lodge base area"],
    ["Buck's Bar", "Mt. Washington Alpine Lodge base area"]
  ],
  "Revelstoke": [
    ["Rockford Bar & Grill", "Revelstoke Mountain Resort base village"],
    ["Mackenzie Common Tavern", "Revelstoke Mountain Resort base village"],
    ["The Village Idiot", "Downtown Revelstoke"]
  ],
  "Kicking Horse": [
    ["Whitetooth Mountain Bistro", "Kicking Horse base village"],
    ["Peaks Grill", "Kicking Horse base village"],
    ["The Wolf's Den", "Golden town (off mountain)"]
  ],
  "Fernie": [
    ["The Griz Bar", "Fernie Alpine Resort base area"],
    ["The Brickhouse", "Downtown Fernie"],
    ["Northern Bar & Stage", "Downtown Fernie"]
  ],
  "Red Mountain": [
    ["Rafters Lounge", "RED Mountain base lodge, upper level"],
    ["The Flying Steamshovel", "Downtown Rossland"]
  ],
  "Whitewater": [
    ["Coal Oil Johnny's Pub", "Whitewater base lodge"],
    ["Mike's Place Pub", "Downtown Nelson, Hume Hotel"],
    ["The Royal", "Downtown Nelson, Baker Street"]
  ],
  "Sun Peaks": [
    ["Bottoms Bar & Grill", "Sun Peaks village, slopeside base"],
    ["Masa's Bar & Grill", "Sun Peaks base, Sun Peaks Grand area"],
    ["Morrisey's Public House", "Sun Peaks village"]
  ],
  "Big White": [
    ["Snowshoe Sam's", "Big White village center"],
    ["Sessions Taphouse & Grill", "Big White village center"],
    ["The BullWheel", "Big White village, near Bullet Express"]
  ],
  "Panorama": [
    ["T-Bar & Grill", "Panorama upper village base area"],
    ["Jackpine Pub", "Panorama lower village"]
  ],
  "Lake Louise": [
    ["Kokanee Kabin", "Lake Louise ski resort base, outdoor deck"],
    ["Powder Keg Lounge", "Lake Louise ski resort base, lodge upper level"],
    ["Bill Peyto's Cafe", "Lake Louise village, hostel (off mountain)"]
  ],
  "Sunshine Village": [
    ["Mad Trapper's Saloon", "Sunshine Village, top of gondola"],
    ["Chimney Corner", "Sunshine Village, top of gondola, Mountain Lodge"],
    ["Creekside Restaurant", "Sunshine gondola lower base, Creekside"]
  ],
  "Marmot Basin": [
    ["Caribou Chalet", "Marmot Basin base lodge"],
    ["Jasper Brewing Co.", "Downtown Jasper (off mountain)"]
  ],
  "Mont Tremblant": [
    ["Le P'tit Caribou", "Tremblant pedestrian village, near base"],
    ["La Forge Bistro-Bar", "Tremblant pedestrian village, gondola base"],
    ["Le Shack", "Tremblant pedestrian village, base plaza"]
  ],
  "Le Massif": [
    ["Pub Le Grand Duc", "Le Massif summit base area, summit lodge"]
  ]
};
