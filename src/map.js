/* Fishguesser — the world map.
 *
 * An equirectangular map: land comes from Natural Earth coastlines (see
 * src/coastlines.js) and the whole map is divided into one labelled, clickable
 * section per region.
 * Everything projects through `project()`, so the sections, the labels and the
 * coastlines always agree. */

const WorldMap = (() => {
  const W = 1000;
  const H = 500;
  const SVG_NS = 'http://www.w3.org/2000/svg';


  /* The map is partitioned into sections that tile it completely: every point
   * belongs to whichever region's centre is nearest, measured as a real
   * great-circle distance. That is the rule the scoring uses, so a section is
   * exactly "everywhere closer to this region than to any other", and there is
   * no unclaimed water. Sections are drawn translucent over the land so the
   * coastline still reads underneath.
   *
   * Each region's lat/lon in regions.js is by definition inside its own
   * section, and anchors both the label and the guess-to-answer line. */
  const GRID_STEP = 1; // degrees; small enough that the borders read as smooth

  /** Lat/lon to a point on the unit sphere, so "nearest" is just a dot product. */
  function toUnitVector(lon, lat) {
    const p = (lat * Math.PI) / 180;
    const l = (lon * Math.PI) / 180;
    const c = Math.cos(p);
    return [c * Math.cos(l), c * Math.sin(l), Math.sin(p)];
  }

  /** owners[row][col] — which region owns each cell of the grid. */
  function computePartition() {
    const cols = Math.round(360 / GRID_STEP);
    const rows = Math.round(180 / GRID_STEP);
    const centres = REGIONS.map((r) => ({ id: r.id, v: toUnitVector(r.lon, r.lat) }));
    const owners = [];

    for (let j = 0; j < rows; j++) {
      const lat = 90 - (j + 0.5) * GRID_STEP;
      const row = new Array(cols);
      for (let i = 0; i < cols; i++) {
        const lon = -180 + (i + 0.5) * GRID_STEP;
        const [x, y, z] = toUnitVector(lon, lat);
        let best = null;
        let bestDot = -Infinity;
        for (const c of centres) {
          const dot = x * c.v[0] + y * c.v[1] + z * c.v[2];
          if (dot > bestDot) {
            bestDot = dot;
            best = c.id;
          }
        }
        row[i] = best;
      }
      owners.push(row);
    }
    return { owners, cols, rows };
  }

  const cellX = (i) => (i * GRID_STEP * W) / 360;
  const cellY = (j) => (j * GRID_STEP * H) / 180;

  /* One path per region. Cells are merged into horizontal runs first, so a
   * section is a few dozen rectangles rather than thousands, and because the
   * runs share exact edges they fill as one solid shape with no seams. */
  function fillPaths({ owners, cols, rows }) {
    const parts = new Map(REGIONS.map((r) => [r.id, []]));
    for (let j = 0; j < rows; j++) {
      let i = 0;
      while (i < cols) {
        const id = owners[j][i];
        let k = i;
        while (k + 1 < cols && owners[j][k + 1] === id) k += 1;
        /* Absolute edges, not relative widths: two runs that meet then round
         * to the identical coordinate and tile exactly. Relative h/v rounds
         * the width separately and can leave a sub-pixel seam between them. */
        const x0 = cellX(i).toFixed(2);
        const x1 = cellX(k + 1).toFixed(2);
        const y0 = cellY(j).toFixed(2);
        const y1 = cellY(j + 1).toFixed(2);
        const run = parts.get(id);
        if (run) run.push(`M${x0} ${y0}H${x1}V${y1}H${x0}Z`);
        i = k + 1;
      }
    }
    return parts;
  }

  /* Only the edges where two different regions meet, merged into straight
   * runs. Stroking the fills instead would outline every internal rectangle. */
  function borderPath({ owners, cols, rows }) {
    const d = [];

    for (let i = 0; i + 1 < cols; i += 1) {
      let j = 0;
      while (j < rows) {
        if (owners[j][i] === owners[j][i + 1]) {
          j += 1;
          continue;
        }
        let k = j;
        while (k + 1 < rows && owners[k + 1][i] !== owners[k + 1][i + 1]) k += 1;
        d.push(`M${cellX(i + 1).toFixed(2)} ${cellY(j).toFixed(2)}V${cellY(k + 1).toFixed(2)}`);
        j = k + 1;
      }
    }

    for (let j = 0; j + 1 < rows; j += 1) {
      let i = 0;
      while (i < cols) {
        if (owners[j][i] === owners[j + 1][i]) {
          i += 1;
          continue;
        }
        let k = i;
        while (k + 1 < cols && owners[j][k + 1] !== owners[j + 1][k + 1]) k += 1;
        d.push(`M${cellX(i).toFixed(2)} ${cellY(j + 1).toFixed(2)}H${cellX(k + 1).toFixed(2)}`);
        i = k + 1;
      }
    }

    return d.join('');
  }

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
    for (const rings of LAND) {
      /* A landmass is an outline plus any holes for inland seas. They go on one
       * path so the even-odd rule punches the holes out of the fill. */
      land.append(el('path', {
        d: rings.map(ringToPath).join(''),
        'fill-rule': 'evenodd',
      }));
    }
    svg.append(land);

    const partition = computePartition();
    const fills = fillPaths(partition);

    zoneGroup = el('g', { class: 'zones' });
    svg.append(zoneGroup);

    // Borders sit above the fills so the seams between sections stay crisp.
    svg.append(el('path', { class: 'zone-borders', d: borderPath(partition) }));

    overlayGroup = el('g', { class: 'overlay-layer' });
    svg.append(overlayGroup);

    // Labels last, so nothing paints over them.
    const labelGroup = el('g', { class: 'zone-labels' });
    svg.append(labelGroup);

    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    zones.clear();

    for (const region of REGIONS) {
      const d = (fills.get(region.id) || []).join('');
      if (!d) continue; // a region that won no cells simply isn't on the map

      const group = el('g', {
        class: 'zone',
        tabindex: '0',
        role: 'button',
        'aria-label': region.name,
      });
      group.append(el('path', { class: 'zone-fill', d }));

      const [labelLon, labelLat] = LABEL_AT[region.id] || [region.lon, region.lat];
      const at = project(labelLon, labelLat);
      const ax = clamp(at.x, 80, W - 80).toFixed(1);
      const ay = clamp(at.y, 14, H - 14).toFixed(1);
      const label = el('text', {
        class: 'zone-label',
        x: ax,
        y: ay,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      // Remembered so a re-layout starts from the anchor, not the last nudge.
      label.dataset.x = ax;
      label.dataset.y = ay;
      label.textContent = region.short || region.name;

      const choose = (e) => {
        e.preventDefault();
        if (!locked) onPick(region.id);
      };
      group.addEventListener('click', choose);
      group.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') choose(e);
      });

      zoneGroup.append(group);
      labelGroup.append(label);
      zones.set(region.id, { group, label });
    }

    layoutLabels();
    window.addEventListener('resize', scheduleLabelLayout);
  }

  let labelTimer = null;
  function scheduleLabelLayout() {
    window.clearTimeout(labelTimer);
    labelTimer = window.setTimeout(layoutLabels, 120);
  }

  /* A label starts at its region's own coordinate, which can leave it hanging
   * off the edge of the map or sitting on a neighbour once the font scales up
   * on a small map. Measure what actually got laid out, pull each label back
   * inside, then push overlapping pairs apart vertically. The font size comes
   * from CSS, so this has to run after layout and again whenever the map is
   * resized. */
  function layoutLabels() {
    const labels = [...zones.values()].map((z) => z.label);
    if (!labels.length) return;

    const PAD = 3;
    const at = (label, axis) => Number(label.getAttribute(axis));
    const nudge = (label, dx, dy) => {
      label.setAttribute('x', (at(label, 'x') + dx).toFixed(1));
      label.setAttribute('y', (at(label, 'y') + dy).toFixed(1));
    };

    let boxes;
    try {
      // Back to the anchor first, so resizing does not accumulate offsets.
      for (const label of labels) {
        label.setAttribute('x', label.dataset.x);
        label.setAttribute('y', label.dataset.y);
      }
      boxes = labels.map((l) => l.getBBox());
    } catch {
      return; // not rendered yet (display:none, detached) — nothing to measure
    }

    const clampInside = (i) => {
      const b = boxes[i];
      let dx = 0;
      let dy = 0;
      if (b.x < PAD) dx = PAD - b.x;
      else if (b.x + b.width > W - PAD) dx = W - PAD - (b.x + b.width);
      if (b.y < PAD) dy = PAD - b.y;
      else if (b.y + b.height > H - PAD) dy = H - PAD - (b.y + b.height);
      if (dx || dy) {
        nudge(labels[i], dx, dy);
        boxes[i] = labels[i].getBBox();
      }
    };

    labels.forEach((_, i) => clampInside(i));

    for (let pass = 0; pass < 5; pass += 1) {
      let moved = false;
      for (let i = 0; i < labels.length; i += 1) {
        for (let j = i + 1; j < labels.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if (overlapX <= 0 || overlapY <= 0) continue;

          const shift = overlapY / 2 + 1;
          const upper = a.y <= b.y ? i : j;
          const lower = upper === i ? j : i;
          nudge(labels[upper], 0, -shift);
          nudge(labels[lower], 0, shift);
          boxes[i] = labels[i].getBBox();
          boxes[j] = labels[j].getBBox();
          moved = true;
        }
      }
      if (!moved) break;
      labels.forEach((_, i) => clampInside(i));
    }
  }

  /** The fill and its label live in different layers but share state classes. */
  function mark(entry, className, on) {
    entry.group.classList.toggle(className, on);
    entry.label.classList.toggle(className, on);
  }

  function setSelected(regionId) {
    for (const [id, entry] of zones) mark(entry, 'is-selected', id === regionId);
  }

  /** Highlight a zone from outside the map. */
  function setHover(regionId) {
    for (const [id, entry] of zones) mark(entry, 'is-hover', !locked && id === regionId);
  }

  /** Show the answer: mark both pins and draw the link between them. */
  function reveal(guessId, answerId) {
    locked = true;
    overlayGroup.replaceChildren();

    for (const [id, entry] of zones) {
      mark(entry, 'is-selected', false);
      mark(entry, 'is-hover', false);
      mark(entry, 'is-answer', id === answerId);
      mark(entry, 'is-guess', id === guessId && guessId !== answerId);
      mark(entry, 'is-dim', id !== answerId && id !== guessId);
      entry.group.setAttribute('tabindex', '-1');
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
    for (const entry of zones.values()) {
      for (const c of ['is-answer', 'is-guess', 'is-dim', 'is-selected', 'is-hover']) {
        mark(entry, c, false);
      }
      entry.group.setAttribute('tabindex', '0');
    }
  }

  return { build, setSelected, setHover, reveal, unlock, project };
})();
