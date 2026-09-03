/* Fishguesser — the guessable regions.
 *
 * Each region has a representative centroid (lat/lon) used both for anchoring
 * its label on the world map and for distance-based partial credit when you
 * guess wrong. `short` is an optional map-only label for names too long to sit
 * on the map comfortably; everything else shows the full `name`. `article:
 * false` marks a proper place name that reads "from Northern Australia" rather
 * than "from the ...".
 *
 * `seeds` is what the map's sections are drawn from: a handful of [lon, lat]
 * points inside the region's real extent. Every point on the map goes to the
 * nearest seed of any region, so the sections still tile the world completely
 * with no unclaimed water — but a region traced by a dozen seeds gets the shape
 * of the water it actually occupies, instead of the wedge one centre gives it.
 * That is what keeps the Great Lakes inland and hands the American coasts to
 * the two oceans they belong to.
 *
 * Adding a region means appending here and nothing else. Its centroid seeds it
 * on its own, which is enough to put it on the map; give it seeds when its
 * borders matter. Scoring never reads them — that is the centroid's job — so a
 * seed is only ever a statement about shape. */

const REGIONS = [
  {
    id: 'north-pacific',
    name: 'North Pacific',
    short: 'N. Pacific',
    blurb: 'Cold, plankton-rich coasts from Kamchatka to British Columbia.',
    lat: 54,
    lon: -152,
    // Bering Sea down the American coast to Baja, and west to the
    // Kurils; Japan's own water is the Sea of Japan's.
    seeds: [
      [-175, 58], [-160, 56], [-145, 55], [-135, 52], [-128, 46], [-124, 40],
      [-120, 33], [-115, 28], [-112, 18], [-100, 10], [-90, 6], [-92, -2],
      [-155, 42], [-175, 40],
      [-160, 25], [-140, 30],
      [165, 45], [172, 52], [-180, 50]
    ],
  },
  {
    id: 'caribbean',
    name: 'Caribbean Sea',
    short: 'Caribbean',
    blurb: 'Warm, clear reef water around the Antilles and the Gulf.',
    lat: 16,
    lon: -76,
    // The Caribbean proper plus the Gulf of Mexico, Florida and the
    // Bahamas.
    seeds: [
      [-75, 16], [-85, 22], [-92, 24], [-95, 20], [-80, 25], [-77, 21],
      [-65, 15], [-61, 17], [-70, 12], [-83, 10], [-80, 28], [-88, 28]
    ],
  },
  {
    id: 'amazon',
    name: 'Amazon Basin',
    blurb: 'Tea-coloured freshwater rivers and flooded forest.',
    lat: -4,
    lon: -62,
    // The basin and the water it drains into, off north-east Brazil.
    seeds: [
      [-62, -4], [-55, -2], [-70, -6], [-50, 0], [-45, -8], [-60, -12],
      [-38, -8], [-33, -10], [-48, -18]
    ],
  },
  {
    id: 'north-atlantic',
    name: 'North Atlantic',
    short: 'N. Atlantic',
    blurb: 'Cold shelf seas off Iceland, Norway and the Grand Banks.',
    lat: 62,
    lon: -20,
    // Iceland and the Norwegian shelf, the Grand Banks, and the
    // American seaboard from Maine to Hatteras.
    seeds: [
      [-20, 62], [-10, 60], [3, 58], [6, 63], [18, 58], [26, 60], [-30, 50], [-45, 45],
      [-55, 45], [-65, 42], [-72, 39], [-75, 35], [-40, 35], [-25, 38],
      [-10, 45], [3, 55], [-8, 52], [-45, 58], [-35, 28], [-18, 45]
    ],
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean Sea',
    short: 'Mediterranean',
    blurb: 'Warm, salty and almost tideless, ringed by three continents.',
    lat: 36,
    lon: 16,
    // The Mediterranean and the Black Sea.
    seeds: [
      [16, 36], [5, 39], [25, 35], [33, 44], [28, 40], [34, 33], [10, 34],
      [-1, 36], [20, 40]
    ],
  },
  {
    id: 'congo',
    name: 'Congo Basin',
    blurb: 'Vast, fast, murky rivers running through central African rainforest.',
    lat: -2,
    lon: 22,
    // The basin, and the Gulf of Guinea it empties into.
    seeds: [
      [22, -2], [18, 0], [26, -4], [12, -4], [6, 3], [0, 1], [10, -10],
      [20, -8], [15, 5]
    ],
  },
  {
    id: 'rift-lakes',
    name: 'East African Rift Lakes',
    short: 'Rift Lakes',
    blurb: 'Malawi, Tanganyika and Victoria — deep lakes bursting with cichlids.',
    lat: -12,
    lon: 34,
    // Victoria, Tanganyika and Malawi, and the East African coast.
    seeds: [
      [34, -12], [33, -2], [29, -6], [35, -14], [40, -6], [45, -12],
      [55, -15], [38, -20], [48, -25], [58, 10], [65, 2], [52, 18]
    ],
  },
  {
    id: 'coral-triangle',
    name: 'Coral Triangle',
    blurb: 'Indonesia, the Philippines and New Guinea: the richest reefs on Earth.',
    lat: 0,
    lon: 125,
    // Indonesia, the Philippines and New Guinea, with the seas
    // between them.
    seeds: [
      [125, 0], [122, 10], [130, -5], [115, -8], [114, 4], [147, -6],
      [135, 0], [105, -2], [120, -5], [128, 5], [140, -2], [155, -8]
    ],
  },
  {
    id: 'northern-australia',
    name: 'Northern Australia',
    // A proper place name, so it reads "from Northern Australia", not "the".
    article: false,
    blurb: 'Mangrove estuaries and the Coral Sea along the tropical north.',
    lat: -14,
    lon: 133,
    // The continent and its shelf, including the Great Barrier
    // Reef and the Coral Sea.
    seeds: [
      [133, -14], [147, -18], [120, -20], [142, -11], [133, -25], [115, -30],
      [150, -30], [138, -34], [128, -32], [153, -25]
    ],
  },
  {
    id: 'southern-ocean',
    name: 'Southern Ocean',
    blurb: 'Near-freezing water circling Antarctica, full of antifreeze-blooded fish.',
    lat: -70,
    lon: 170,
    // A ring right round Antarctica, so the section is the band it
    // actually is rather than a wedge under one ocean.
    seeds: [
      [0, -62], [60, -62], [120, -62], [180, -65], [-120, -62], [-60, -62],
      [170, -70], [-30, -65], [90, -68], [30, -65], [150, -68], [-90, -70],
      [-150, -65], [105, -60]
    ],
  },
  {
    id: 'arctic',
    name: 'Arctic Ocean',
    short: 'Arctic',
    blurb: 'Ice-covered water at the top of the world, dark for months at a time.',
    lat: 80,
    lon: 0,
    // A ring round the pole, over the ice.
    seeds: [
      [0, 80], [90, 82], [180, 80], [-90, 82], [-45, 78], [45, 78],
      [135, 80], [-135, 78], [-160, 73], [100, 76], [-20, 72], [60, 74]
    ],
  },
  {
    id: 'great-lakes',
    name: 'Great Lakes',
    article: false,
    blurb: 'Freshwater inland seas of North America, carved out by the ice sheets.',
    lat: 45,
    lon: -85,
    // The lakes and the middle of the continent — landlocked, with
    // the coasts left to the two oceans.
    seeds: [
      [-85, 45], [-88, 47], [-79, 43], [-83, 44], [-95, 46], [-100, 42],
      [-90, 38], [-97, 36], [-105, 45], [-75, 46], [-93, 30], [-108, 38]
    ],
  },
  {
    id: 'sea-of-japan',
    name: 'Sea of Japan',
    blurb: 'Cool, deep water between Japan and the Asian mainland.',
    lat: 38,
    lon: 135,
    // Japan on both sides, Korea, and the Yellow and East China seas.
    seeds: [
      [135, 38], [140, 35], [141, 43], [130, 33], [126, 36], [125, 30],
      [145, 40], [150, 45], [122, 25], [135, 30], [155, 48]
    ],
  },
  {
    id: 'mekong',
    name: 'Mekong Basin',
    blurb: "Southeast Asia's great muddy river, from Tibet to the Vietnamese delta.",
    lat: 15,
    lon: 105,
    // The river and mainland South-East Asia around it.
    seeds: [
      [105, 15], [106, 12], [102, 20], [100, 17], [98, 20], [101, 9],
      [96, 22], [108, 18]
    ],
  },
  {
    id: 'new-zealand',
    name: 'New Zealand',
    article: false,
    blurb: 'Isolated temperate islands in the South Pacific, far from anywhere.',
    lat: -42,
    lon: 174,
    // Both islands, the Tasman Sea and the South Pacific east of them.
    seeds: [
      [174, -42], [176, -38], [170, -45], [165, -40], [160, -38],
      [-180, -45], [-170, -40], [-160, -30], [175, -30], [-150, -35],
      [160, -25]
    ],
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
