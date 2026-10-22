/*
  Après picks: up to three per resort, shown in the resort's map popup.
  Keyed by resort name in resorts.js. Each pick: [name, where, note?]
    where: the base area or town, also used to find the bar on Google Maps
    note:  optional, one short line in your own words ("rope tow to the patio", "3:30 or no table")
  First draft written from memory in Oct 2026, limited to long-running spots. Places close and
  change hands, so check before you trust it, and add your own. Resorts left out show no picks.
*/
export const APRES = {
  // Colorado
  "Vail": [["The Red Lion", "Vail Village"], ["Pepi's Bar", "Vail Village"], ["Garfinkel's", "Lionshead"]],
  "Aspen Snowmass": [["Ajax Tavern", "Aspen Mountain base"], ["Cloud Nine Alpine Bistro", "Aspen Highlands, on mountain"]],
  "Telluride": [["The Last Dollar Saloon", "Telluride"]],
  "Arapahoe Basin": [["6th Alley Bar & Grill", "A-Basin base"]],
  "Crested Butte": [["Eldo Brewery", "Crested Butte"]],

  // Utah
  "Alta": [["Goldminer's Daughter", "Alta"]],
  "Snowbird": [["The Tram Club", "Snowbird Center"]],
  "Brighton": [["Molly Green's", "Brighton base"]],
  "Solitude": [["Thirsty Squirrel", "Solitude Village"]],
  "Park City": [["No Name Saloon", "Main Street, Park City"], ["High West Saloon", "Park City"], ["Wasatch Brew Pub", "Main Street, Park City"]],

  // Northern Rockies
  "Jackson Hole": [["Mangy Moose", "Teton Village"]],
  "Grand Targhee": [["Trap Bar & Grill", "Grand Targhee base"]],
  "Sun Valley": [["Apples Bar & Grill", "River Run base"], ["Pioneer Saloon", "Ketchum"]],

  // Southwest
  "Taos": [["The Martini Tree Bar", "Taos Ski Valley"], ["The Bavarian", "Taos Ski Valley, on mountain"]],

  // Sierra
  "Palisades Tahoe": [["Le Chamois & Loft Bar", "Olympic Valley base"]],
  "Mammoth": [["Lakanuki", "The Village at Mammoth"], ["Mammoth Brewing Co.", "Mammoth Lakes"]],

  // Pacific Northwest
  "Crystal Mountain": [["Snorting Elk Cellar", "Crystal Mountain base"]],

  // Alaska
  "Alyeska": [["Sitzmark Bar & Grill", "Girdwood"]],

  // Northeast
  "Stowe": [["The Matterhorn", "Mountain Road, Stowe"]],
  "Killington": [["Wobbly Barn", "Killington Road"], ["Pickle Barrel", "Killington Road"]],
  "Sugarbush": [["Castlerock Pub", "Lincoln Peak base"]],
  "Sugarloaf": [["The Bag & Kettle", "Sugarloaf village"], ["Widowmaker Lounge", "Sugarloaf base lodge"]],
  "Sunday River": [["Foggy Goggle", "South Ridge base"]],
  "Jay Peak": [["The Tower Bar", "Jay Peak base"]],

  // BC and Alberta
  "Whistler Blackcomb": [["Garibaldi Lift Co.", "Whistler Village"], ["Merlin's Bar & Grill", "Blackcomb base"], ["Dusty's", "Creekside"]],
  "Fernie": [["The Griz Bar", "Fernie Alpine Resort"]],
  "Red Mountain": [["Rafters", "Red Mountain base"]],
  "Whitewater": [["Coal Oil Johnny's Pub", "Whitewater lodge"]],
  "Big White": [["Snowshoe Sam's", "Big White village"]],
  "Sunshine Village": [["Mad Trapper's Saloon", "Sunshine Village"]],

  // Quebec
  "Mont Tremblant": [["Le P'tit Caribou", "Tremblant village"]]
};
