/* Fishguesser — the world map.
 *
 * A stylised equirectangular map: land is drawn from coarse lat/lon outlines
 * (accurate enough to navigate by, deliberately not a survey chart) and each
 * region gets a clickable pin. Everything projects through `project()`, so the
 * pins and the coastlines always agree. */

const WorldMap = (() => {
  const W = 1000;
  const H = 500;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Coarse coastlines as flat [lon, lat, lon, lat, ...] rings.
  const LAND = [
    // North America
    [-168, 66, -166, 60, -158, 58, -152, 59, -140, 60, -133, 55, -127, 50, -124, 44,
     -122, 37, -117, 32, -114, 28, -110, 24, -106, 21, -97, 16, -92, 15, -88, 16,
     -87, 21, -91, 19, -94, 18, -97, 22, -97, 26, -94, 29, -89, 29, -85, 30, -82, 27,
     -80, 25, -81, 31, -76, 35, -74, 39, -70, 42, -67, 45, -61, 46, -56, 51, -64, 60,
     -78, 62, -95, 68, -115, 70, -134, 69, -156, 71, -166, 68],
    // Greenland
    [-45, 60, -50, 64, -53, 68, -56, 71, -62, 76, -68, 78, -62, 82, -45, 83, -32, 82,
     -22, 77, -20, 73, -27, 70, -33, 67, -40, 64],
    // South America
    [-81, 7, -77, 8, -73, 11, -66, 11, -60, 9, -52, 5, -50, 0, -44, -2, -38, -5,
     -35, -8, -39, -14, -42, -21, -48, -25, -53, -33, -57, -38, -62, -40, -65, -45,
     -68, -50, -70, -55, -75, -53, -74, -46, -73, -38, -71, -30, -70, -20, -75, -15,
     -80, -6, -81, -2, -79, 2],
    // Africa
    [-17, 15, -16, 20, -12, 26, -6, 32, -1, 35, 8, 37, 11, 34, 16, 31, 22, 32, 28, 31,
     33, 31, 35, 28, 37, 22, 39, 16, 43, 12, 48, 8, 51, 11, 47, 4, 41, -1, 40, -8,
     36, -18, 33, -26, 28, -33, 20, -35, 17, -29, 13, -22, 12, -15, 9, -2, 5, 4,
     -2, 5, -8, 4, -13, 9],
    // Madagascar
    [49, -12, 50, -16, 48, -22, 45, -25, 44, -22, 43, -17, 46, -13],
    // Eurasia
    [-9, 43, -9, 39, -6, 36, -2, 37, 0, 39, 3, 42, 7, 44, 10, 44, 13, 45, 16, 42,
     19, 40, 23, 38, 26, 38, 30, 41, 35, 41, 36, 36, 36, 31, 34, 28, 38, 22, 43, 17,
     48, 13, 52, 17, 57, 23, 60, 25, 66, 25, 72, 21, 77, 9, 80, 10, 83, 18, 88, 22,
     92, 17, 97, 17, 99, 10, 104, 2, 104, 1, 106, 10, 109, 15, 108, 21, 113, 22,
     117, 24, 121, 30, 122, 37, 126, 40, 129, 43, 131, 47, 135, 54, 141, 53, 143, 59,
     150, 60, 156, 61, 163, 58, 170, 60, 177, 65, 180, 66, 180, 70, 170, 70, 160, 70,
     145, 72, 135, 73, 125, 73, 113, 74, 105, 77, 95, 78, 85, 74, 75, 72, 66, 70,
     55, 69, 45, 66, 36, 68, 33, 70, 28, 71, 22, 70, 15, 68, 12, 65, 5, 61, 8, 58,
     10, 55, 5, 53, 4, 51, 0, 49, -2, 47, -1, 44],
    // Great Britain
    [-5, 58, -3, 58, -1, 55, 1, 53, 1, 51, -3, 50, -5, 50, -5, 53, -3, 54, -5, 55, -6, 57],
    // Ireland
    [-10, 54, -8, 55, -6, 55, -6, 52, -9, 52],
    // Iceland
    [-24, 65, -22, 66, -15, 66, -13, 65, -16, 64, -21, 64],
    // Japan
    [130, 31, 131, 33, 135, 34, 138, 35, 141, 38, 141, 41, 145, 44, 143, 45, 140, 42,
     138, 37, 134, 35, 131, 34],
    // Sumatra
    [95, 5, 98, 4, 102, 0, 106, -6, 104, -6, 100, -1, 96, 3],
    // Borneo
    [109, 2, 113, 4, 117, 4, 118, 1, 117, -3, 114, -4, 110, -3, 109, 0],
    // Java
    [105, -6, 110, -7, 114, -8, 114, -9, 109, -9, 105, -7],
    // Sulawesi
    [119, 1, 122, 1, 125, 1, 125, -2, 122, -3, 121, -6, 119, -5, 120, -2, 118, 0],
    // New Guinea
    [131, -1, 136, -2, 141, -3, 146, -6, 150, -10, 146, -9, 141, -9, 137, -8, 133, -4],
    // Philippines
    [121, 18, 122, 15, 124, 12, 126, 7, 123, 6, 121, 8, 120, 13, 120, 16],
    // Australia
    [113, -22, 114, -26, 116, -32, 119, -34, 124, -33, 129, -32, 134, -33, 137, -35,
     140, -38, 145, -39, 148, -37, 151, -33, 153, -28, 153, -25, 149, -21, 146, -19,
     143, -14, 142, -11, 139, -17, 136, -12, 132, -11, 129, -15, 125, -14, 122, -18,
     117, -21],
    // Tasmania
    [145, -41, 148, -41, 148, -43, 146, -43],
    // New Zealand
    [173, -35, 175, -37, 178, -38, 177, -40, 174, -41, 171, -43, 167, -46, 166, -45,
     170, -43, 173, -40, 173, -37],
    // Antarctica
    [-180, -72, -160, -77, -145, -75, -130, -74, -115, -73, -100, -73, -85, -72,
     -70, -70, -62, -65, -58, -62, -45, -61, -35, -66, -20, -70, -5, -70, 10, -69,
     25, -68, 40, -67, 55, -66, 70, -67, 85, -66, 100, -65, 115, -65, 130, -66,
     145, -67, 160, -70, 170, -72, 180, -78, 180, -90, -180, -90],
  ];

  /* The clickable areas, as flat [lon, lat, ...] rings in the same projection
   * as the coastlines. Each one traces roughly the water or basin its fish
   * actually live in, so the shape itself is part of the answer. They are drawn
   * translucent over the land so the coastline still reads underneath.
   *
   * Each region's lat/lon in regions.js sits inside its zone and is used to
   * anchor the label and the guess-to-answer line. */
  const ZONES = {
    'north-pacific': [
      -180, 40, -170, 50, -158, 57, -145, 59, -132, 57, -124, 48, -122, 40,
      -130, 35, -145, 34, -160, 36, -172, 36,
    ],
    caribbean: [
      -88, 21, -80, 23, -70, 22, -61, 18, -60, 11, -68, 9, -78, 9, -84, 11, -88, 16,
    ],
    amazon: [
      -73, 2, -66, 4, -58, 4, -50, 1, -48, -3, -52, -8, -60, -12, -68, -12,
      -74, -8, -76, -2,
    ],
    'north-atlantic': [
      -45, 58, -35, 62, -22, 65, -10, 64, -2, 60, -5, 52, -15, 48, -28, 48, -40, 52,
    ],
    mediterranean: [
      -5, 36, 3, 43, 12, 45, 19, 41, 26, 41, 34, 37, 36, 33, 30, 31, 20, 32,
      10, 34, 2, 36,
    ],
    congo: [12, 2, 18, 4, 25, 4, 29, 1, 28, -6, 22, -9, 15, -7, 11, -4, 11, -1],
    'rift-lakes': [29, 1, 33, 2, 36, -2, 37, -9, 35, -15, 31, -14, 29, -8, 28, -3],
    'coral-triangle': [
      116, 8, 125, 10, 133, 6, 137, 0, 134, -6, 126, -10, 118, -8, 114, -2, 115, 3,
    ],
    'northern-australia': [
      113, -12, 122, -10, 132, -9, 142, -9, 152, -18, 154, -24, 145, -26,
      135, -25, 125, -22, 114, -20,
    ],
    'southern-ocean': [
      -180, -56, -120, -58, -60, -55, 0, -57, 60, -56, 120, -58, 180, -60,
      180, -72, 120, -71, 60, -69, 0, -70, -60, -67, -120, -73, -180, -70,
    ],
  };

  /* Where to put a zone's label when the region's own coordinate is a poor
   * anchor — too near the edge of the map, or close enough to a neighbour that
   * the two labels collide. Scoring still uses the coordinates in regions.js;
   * these only move the text. */
  const LABEL_AT = {
    'southern-ocean': [-25, -63],
    congo: [17, 1],
    'rift-lakes': [36, -13],
    'coral-triangle': [124, 5],
    'northern-australia': [134, -17],
  };

  /** Equirectangular projection into the 1000x500 viewBox. */
  function project(lon, lat) {
    return { x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H };
  }

  function el(name, attrs = {}) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  function ringToPath(ring) {
    let d = '';
    for (let i = 0; i < ring.length; i += 2) {
      const { x, y } = project(ring[i], ring[i + 1]);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d + 'Z';
  }

  let svg = null;
  let zoneGroup = null;
  let overlayGroup = null;
  const zones = new Map();
  let onPick = () => {};
  let locked = false;

  function build(target, pickHandler) {
    svg = target;
    onPick = pickHandler;
    svg.replaceChildren();

    const defs = el('defs');
    const sea = el('linearGradient', { id: 'sea', x1: '0', y1: '0', x2: '0', y2: '1' });
    sea.append(
      el('stop', { offset: '0', 'stop-color': '#0d2b45' }),
      el('stop', { offset: '1', 'stop-color': '#071a2c' })
    );
    defs.append(sea);
    svg.append(defs);

    svg.append(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#sea)' }));

    // Graticule every 30 degrees, for a bit of chart texture.
    const grid = el('g', { class: 'graticule' });
    for (let lon = -150; lon < 180; lon += 30) {
      const { x } = project(lon, 0);
      grid.append(el('line', { x1: x, y1: 0, x2: x, y2: H }));
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const { y } = project(0, lat);
      grid.append(el('line', { x1: 0, y1: y, x2: W, y2: y }));
    }
    svg.append(grid);

    const land = el('g', { class: 'land' });
    for (const ring of LAND) land.append(el('path', { d: ringToPath(ring) }));
    svg.append(land);

    zoneGroup = el('g', { class: 'zones' });
    svg.append(zoneGroup);

    overlayGroup = el('g', { class: 'overlay-layer' });
    svg.append(overlayGroup);

    zones.clear();
    for (const region of REGIONS) {
      const ring = ZONES[region.id];
      if (!ring) continue; // a region with no zone simply isn't on the map

      const g = el('g', {
        class: 'zone',
        tabindex: '0',
        role: 'button',
        'aria-label': region.name,
      });
      g.append(el('path', { class: 'zone-fill', d: ringToPath(ring) }));

      const [labelLon, labelLat] = LABEL_AT[region.id] || [region.lon, region.lat];
      const at = project(labelLon, labelLat);
      // Keep the text off the edges; a centred label near lon 180 overflows.
      const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
      const label = el('text', {
        class: 'zone-label',
        x: clamp(at.x, 80, W - 80).toFixed(1),
        y: clamp(at.y, 14, H - 14).toFixed(1),
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      label.textContent = region.short || region.name;
      g.append(label);

      const choose = (e) => {
        e.preventDefault();
        if (!locked) onPick(region.id);
      };
      g.addEventListener('click', choose);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') choose(e);
      });

      zoneGroup.append(g);
      zones.set(region.id, g);
    }
  }

  function setSelected(regionId) {
    for (const [id, g] of zones) g.classList.toggle('is-selected', id === regionId);
  }

  /** Highlight a zone from outside the map, e.g. hovering its chip. */
  function setHover(regionId) {
    for (const [id, g] of zones) g.classList.toggle('is-hover', !locked && id === regionId);
  }

  /** Show the answer: mark both pins and draw the link between them. */
  function reveal(guessId, answerId) {
    locked = true;
    overlayGroup.replaceChildren();

    for (const [id, g] of zones) {
      g.classList.remove('is-selected', 'is-hover');
      g.classList.toggle('is-answer', id === answerId);
      g.classList.toggle('is-guess', id === guessId && guessId !== answerId);
      g.classList.toggle('is-dim', id !== answerId && id !== guessId);
      g.setAttribute('tabindex', '-1');
    }

    if (guessId !== answerId) {
      const a = REGIONS_BY_ID[guessId];
      const b = REGIONS_BY_ID[answerId];
      const p1 = project(a.lon, a.lat);
      const p2 = project(b.lon, b.lat);
      const line = el('line', {
        class: 'link',
        x1: p1.x.toFixed(1), y1: p1.y.toFixed(1),
        x2: p2.x.toFixed(1), y2: p2.y.toFixed(1),
      });
      overlayGroup.append(line);
    }
  }

  function unlock() {
    locked = false;
    overlayGroup.replaceChildren();
    for (const g of zones.values()) {
      g.classList.remove('is-answer', 'is-guess', 'is-dim', 'is-selected', 'is-hover');
      g.setAttribute('tabindex', '0');
    }
  }

  return { build, setSelected, setHover, reveal, unlock, project };
})();
