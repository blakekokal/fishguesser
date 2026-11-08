/* Fishguesser — the guessable regions.
 *
 * Each region has a representative centroid (lat/lon) used both for anchoring
 * its label on the world map and for distance-based partial credit when you
 * guess wrong. `short` is an optional map-only label for names too long to sit
 * on the map comfortably; everything else shows the full `name`. `article:
 * false` marks a proper place name that reads "from Australia" rather
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
    // The section runs from the Bering Sea right down the American coast
    // and out to the islands off it, so the name says east as well as north.
    name: 'North and East Pacific',
    short: 'N. & E. Pacific',
    blurb: 'Cold kelp coasts from the Bering Sea to Baja, then the warm eastern Pacific down to the Galápagos.',
    lat: 54,
    lon: -152,
    // Bering Sea down the American coast to Baja and on to Chile, and west
    // to the Kurils; Japan's own water is the Sea of Japan's.
    seeds: [
      [-175, 58], [-160, 56], [-145, 55], [-135, 52], [-128, 46], [-124, 40],
      [-120, 33], [-115, 28], [-112, 18], [-100, 10], [-90, 6], [-92, -2],
      [-155, 42], [-175, 40],
      [-160, 25], [-140, 30],
      [165, 45], [172, 52], [-180, 50],
      // Just off the coast of South America, partnering the Amazon's.
      [-82, 2], [-84, -2], [-85, -6], [-82, -10], [-79, -14], [-75, -18],
      [-73.5, -22], [-74, -26], [-75, -30], [-75.5, -34], [-77, -38],
      [-78, -42], [-79, -46], [-79, -50],
      [-78, -54], [-81.5, 5], [-79, -7.5]
    ],
  },
  {
    id: 'caribbean',
    name: 'Caribbean Sea',
    short: 'Caribbean',
    blurb: 'Warm, clear reef water around the Antilles, Florida and the Gulf of Mexico.',
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
    blurb: 'Tea-coloured rivers and flooded forest, and the rest of the fresh water of South America.',
    lat: -4,
    lon: -62,
    // The basin and the rest of the continent, stopping at the shore: the
    // Atlantic off Brazil belongs to the South Atlantic section and the
    // Pacific off Peru and Chile to the East Pacific. Each coastal seed here
    // has a partner a few degrees offshore in that neighbour, so the seam
    // between the two pairs lands on the coastline itself.
    seeds: [
      [-62, -4], [-55, -2], [-70, -6], [-66, 1], [-60, -12], [-52, -10],
      [-64, -18], [-62, -26],
      // Pacific side, a few degrees inland of the coast.
      [-75, 2], [-77, -2], [-78, -6], [-75, -10], [-73, -14], [-68, -18],
      [-67, -22], [-67.5, -26], [-68.5, -30], [-69, -34], [-70.5, -38],
      [-71, -42], [-72, -46], [-72.5, -50],
      // Atlantic side, the same.
      [-59, 4], [-54, 2], [-51, -2], [-46, -4], [-41, -5.5], [-38.5, -7.5],
      [-41, -12], [-42.5, -17], [-44, -21], [-48.5, -23.5], [-51, -27],
      [-55, -30.5], [-58, -33], [-63, -35.5], [-67.5, -40], [-70.5, -45],
      [-70.5, -48], [-72, -51.5]
    ],
  },
  {
    id: 'north-atlantic',
    name: 'North Atlantic',
    short: 'N. Atlantic',
    blurb: 'Cold shelf seas from Cape Hatteras and the Grand Banks to Iceland, Norway and the North Sea.',
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
    blurb: 'Warm, salty and almost tideless, ringed by three continents, with the Black Sea beyond the Bosporus.',
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
    // The section is the river and the whole ocean it empties into, across
    // to the coast of Brazil, so the name has to say both.
    name: 'Congo Basin and the South Atlantic',
    short: 'Congo & S. Atlantic',
    blurb: 'Vast, fast, murky rivers through central African rainforest, and the Atlantic from the Gulf of Guinea across to Brazil.',
    lat: -2,
    lon: 22,
    // The basin, the Gulf of Guinea it empties into, and the South Atlantic
    // over to South America, where seeds just offshore keep the seam on the
    // coast.
    seeds: [
      [22, -2], [18, 0], [26, -4], [12, -4], [6, 3], [0, 1], [10, -10],
      [20, -8], [15, 5], [-15, -5], [-12, -20], [-25, -30], [-30, 2],
      // Just off the coast of South America, partnering the Amazon's.
      [-55, 9], [-50, 5], [-46, 2], [-42, 0], [-38, -1], [-33, -4],
      [-32, -8], [-35, -13], [-36.5, -18], [-38, -22.5], [-42, -26],
      [-45.5, -28.5], [-49, -33], [-51.5, -36.5], [-54, -40], [-59, -43],
      [-62.5, -47], [-64, -51],
      [-58, 10.5], [-44.5, -26.5], [-58, -41], [-54, -37.5]
    ],
  },
  {
    id: 'rift-lakes',
    // The section covers the lakes and the ocean off them — Mombasa, the
    // Mozambique Channel and the Arabian Sea all fall inside it — so the name
    // has to say both, or a reef animal looks misfiled.
    name: 'East Africa and the Indian Ocean',
    short: 'E. Africa & Indian Ocean',
    // A proper place name, so it reads "from East Africa and ...".
    article: false,
    blurb: 'Malawi, Tanganyika and Victoria, plus the reefs and ocean off the coast.',
    lat: -12,
    lon: 34,
    // The three great lakes, the East African coast, and the western Indian
    // Ocean out past Madagascar.
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
    // The section is the whole continent and its shelf, south coast
    // included, so the name is too.
    name: 'Australia',
    // A proper place name, so it reads "from Australia", not "the".
    article: false,
    blurb: 'The whole continent and its shelf: mangroves and the Barrier Reef in the tropical north, kelp along the cool south.',
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
    blurb: 'Freshwater inland seas carved out by the ice sheets, and the rivers of the North American interior.',
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
    blurb: 'Both coasts of Japan, Korea, and the Yellow and East China seas.',
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
    blurb: 'Isolated temperate islands, with the Tasman Sea and the open South Pacific around them.',
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
