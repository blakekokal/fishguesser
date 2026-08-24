/* Fishguesser — the guessable regions.
 *
 * Each region has a representative centroid (lat/lon) used both for anchoring
 * its label on the world map and for distance-based partial credit when you
 * guess wrong. `short` is an optional map-only label for names too long to sit
 * on the map comfortably; everything else shows the full `name`. `article:
 * false` marks a proper place name that reads "from Northern Australia" rather
 * than "from the ...".
 *
 * Adding a region means appending here and nothing else: the map divides
 * itself into one section per region from these coordinates. */

const REGIONS = [
  {
    id: 'north-pacific',
    name: 'North Pacific',
    short: 'N. Pacific',
    blurb: 'Cold, plankton-rich coasts from Kamchatka to British Columbia.',
    lat: 54,
    lon: -152,
  },
  {
    id: 'caribbean',
    name: 'Caribbean Sea',
    short: 'Caribbean',
    blurb: 'Warm, clear reef water around the Antilles and the Gulf.',
    lat: 16,
    lon: -76,
  },
  {
    id: 'amazon',
    name: 'Amazon Basin',
    blurb: 'Tea-coloured freshwater rivers and flooded forest.',
    lat: -4,
    lon: -62,
  },
  {
    id: 'north-atlantic',
    name: 'North Atlantic',
    short: 'N. Atlantic',
    blurb: 'Cold shelf seas off Iceland, Norway and the Grand Banks.',
    lat: 62,
    lon: -20,
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean Sea',
    short: 'Mediterranean',
    blurb: 'Warm, salty and almost tideless, ringed by three continents.',
    lat: 36,
    lon: 16,
  },
  {
    id: 'congo',
    name: 'Congo Basin',
    blurb: 'Vast, fast, murky rivers running through central African rainforest.',
    lat: -2,
    lon: 22,
  },
  {
    id: 'rift-lakes',
    name: 'East African Rift Lakes',
    short: 'Rift Lakes',
    blurb: 'Malawi, Tanganyika and Victoria — deep lakes bursting with cichlids.',
    lat: -12,
    lon: 34,
  },
  {
    id: 'coral-triangle',
    name: 'Coral Triangle',
    blurb: 'Indonesia, the Philippines and New Guinea: the richest reefs on Earth.',
    lat: 0,
    lon: 125,
  },
  {
    id: 'northern-australia',
    name: 'Northern Australia',
    // A proper place name, so it reads "from Northern Australia", not "the".
    article: false,
    blurb: 'Mangrove estuaries and the Coral Sea along the tropical north.',
    lat: -14,
    lon: 133,
  },
  {
    id: 'southern-ocean',
    name: 'Southern Ocean',
    blurb: 'Near-freezing water circling Antarctica, full of antifreeze-blooded fish.',
    lat: -70,
    lon: 170,
  },
  {
    id: 'arctic',
    name: 'Arctic Ocean',
    short: 'Arctic',
    blurb: 'Ice-covered water at the top of the world, dark for months at a time.',
    lat: 80,
    lon: 0,
  },
  {
    id: 'great-lakes',
    name: 'Great Lakes',
    article: false,
    blurb: 'Freshwater inland seas of North America, carved out by the ice sheets.',
    lat: 45,
    lon: -85,
  },
  {
    id: 'sea-of-japan',
    name: 'Sea of Japan',
    blurb: 'Cool, deep water between Japan and the Asian mainland.',
    lat: 38,
    lon: 135,
  },
  {
    id: 'mekong',
    name: 'Mekong Basin',
    blurb: "Southeast Asia's great muddy river, from Tibet to the Vietnamese delta.",
    lat: 15,
    lon: 105,
  },
  {
    id: 'new-zealand',
    name: 'New Zealand',
    article: false,
    blurb: 'Isolated temperate islands in the South Pacific, far from anywhere.',
    lat: -42,
    lon: 174,
  },
];

const REGIONS_BY_ID = REGIONS.reduce((acc, region) => {
  acc[region.id] = region;
  return acc;
}, {});

/** Great-circle distance in kilometres between two {lat, lon} points. */
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
