/* Fishguesser — photo check.
 *
 * A reviewing tool, not part of the game: it steps through every fish one at a
 * time in the same letterboxed frame the game uses, so a picture can be judged
 * as a player would meet it. The name is shown by default so a bad photo can be
 * named; `R` hides it to look at a picture cold. The region is never shown —
 * that is the answer, and reviewing photos must not spend it.
 *
 * Two orders: newest photo first, which is what a review after adding some
 * fish wants, and the collection's own order, where a number is a stable way
 * to point at one ("number 37 is bad") without the details on screen.
 *
 * The mode row narrows it to what one of the game's modes deals — the weird
 * ones, the crabs — so a batch just added can be looked at without stepping
 * past everything else. */

(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    photo: $('fishPhoto'), photoBg: $('fishPhotoBg'),
    details: $('details'), name: $('fishName'), sci: $('fishSci'),
    meta: $('fishMeta'), count: $('count'), jump: $('jump'),
    prev: $('prevBtn'), next: $('nextBtn'), reveal: $('revealBtn'),
    speciesCount: $('speciesCount'), order: $('orderBtn'), modeRow: $('modeRow'),
  };

  const fmt = (n) => n.toLocaleString('en-US');

  /* PHOTO_CREDITS is keyed alphabetically, but PHOTO_ORDER keeps the order
   * photos were actually added — a swapped photo moves to the end there too,
   * so "newest" means newest picture, not newest species. Anything missing
   * from it (a fish added without touching credits.json) counts as oldest. */
  const byId = new Map(FISH.map((f) => [f.id, f]));
  const added = (typeof PHOTO_ORDER === 'undefined' ? [] : PHOTO_ORDER)
    .filter((id) => byId.has(id));
  const addedSet = new Set(added);

  /* Newest-first within whatever the mode leaves: the photos added last, then
   * everything the order does not know about, in the collection's own order. */
  const newestOf = (pool) => {
    const inPool = new Set(pool.map((f) => f.id));
    return [
      ...[...added].filter((id) => inPool.has(id)).reverse().map((id) => byId.get(id)),
      ...pool.filter((f) => !addedSet.has(f.id)),
    ];
  };

  let kind = 'all';
  let newestFirst = true;
  let pool = FISH;
  let list = newestOf(FISH);
  let index = 0;
  /* On by default: the page is mostly used to spot a bad photo and say which
   * one it is, and that needs the name. `R` hides it to judge a picture cold. */
  let revealed = true;

  /* The next photo is fetched while this one is being looked at, so stepping
   * forward does not wait on the network every time. */
  function preload(i) {
    if (i < 0 || i >= list.length) return;
    const img = new Image();
    img.src = list[i].image;
  }

  function renderDetails() {
    ui.details.hidden = !revealed;
    ui.reveal.setAttribute('aria-pressed', String(revealed));
    ui.reveal.textContent = revealed ? 'Hide details' : 'Show details';
    if (!revealed) return;

    const fish = list[index];
    const credit = (typeof PHOTO_CREDITS !== 'undefined' && PHOTO_CREDITS[fish.id]) || null;

    ui.name.textContent = fish.name;
    ui.sci.textContent = fish.sciName;
    ui.meta.replaceChildren();

    /* No region, ever. Knowing where each fish lives is the whole game, and
     * reviewing the photos should not spend the answers. */
    const id = document.createElement('code');
    id.className = 'review-id';
    id.textContent = fish.id;
    ui.meta.append(id);

    if (credit) {
      const link = document.createElement('a');
      link.href = credit.source;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `${credit.author} · ${credit.license}`;
      ui.meta.append(link);
    }
  }

  function show(i) {
    index = Math.min(Math.max(i, 0), list.length - 1);
    const fish = list[index];

    ui.photo.classList.remove('is-ready', 'is-broken');
    ui.photoBg.classList.remove('is-ready');
    ui.photo.src = fish.image;
    ui.photoBg.src = fish.image;

    ui.count.textContent = `of ${fmt(list.length)}`;
    ui.jump.value = String(index + 1);
    ui.jump.max = String(list.length);
    ui.prev.disabled = index === 0;
    ui.next.disabled = index === list.length - 1;

    renderDetails();
    preload(index + 1);
  }

  const step = (delta) => show(index + delta);

  ui.photo.addEventListener('load', () => ui.photo.classList.add('is-ready'));
  ui.photoBg.addEventListener('load', () => ui.photoBg.classList.add('is-ready'));
  /* A dead link is exactly the kind of thing this page exists to catch, so say
   * so in place rather than leaving an empty frame. */
  ui.photo.addEventListener('error', () => ui.photo.classList.add('is-broken'));

  ui.prev.addEventListener('click', () => step(-1));
  ui.next.addEventListener('click', () => step(1));
  ui.reveal.addEventListener('click', () => { revealed = !revealed; renderDetails(); });

  /* Swapping order keeps the photo on screen rather than the position, so the
   * picture being looked at does not change under the toggle. */
  ui.order.addEventListener('click', () => {
    const current = list[index];
    newestFirst = !newestFirst;
    relist(current);
    renderOrder();
  });

  /* Rebuilds the list for the current mode and order, keeping the photo on
   * screen where it can — a mode that no longer holds it starts at the top. */
  function relist(keep) {
    pool = FISH.filter(KIND_BY_ID[kind].test);
    list = newestFirst ? newestOf(pool) : pool;
    const at = keep ? list.indexOf(keep) : -1;
    show(at === -1 ? 0 : at);
  }

  /* One button per mode, each carrying how many photos are behind it. */
  function buildModes() {
    for (const k of KIND_FILTERS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-opt';
      btn.dataset.id = k.id;
      const text = document.createElement('span');
      text.textContent = k.short;
      const n = document.createElement('span');
      n.className = 'filter-n';
      n.textContent = fmt(FISH.filter(k.test).length);
      btn.append(text, n);
      btn.title = k.label;
      btn.addEventListener('click', () => {
        if (kind === k.id) return;
        kind = k.id;
        renderModes();
        relist(list[index]);
      });
      ui.modeRow.append(btn);
    }
  }

  function renderModes() {
    for (const btn of ui.modeRow.querySelectorAll('.filter-opt')) {
      const on = btn.dataset.id === kind;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    }
  }

  function renderOrder() {
    ui.order.textContent = newestFirst ? 'Newest first' : 'Collection order';
    ui.order.setAttribute('aria-pressed', String(newestFirst));
    ui.order.title = newestFirst
      ? 'Newest photo first — click for the collection\'s own order'
      : "The collection's own order — click for newest photo first";
  }

  ui.jump.addEventListener('change', () => {
    const n = Number(ui.jump.value);
    if (Number.isFinite(n)) show(Math.round(n) - 1);
    else ui.jump.value = String(index + 1);
    /* Hand the keyboard back: while this input holds focus the arrow keys
     * belong to it, so stepping would stay dead after a jump. */
    ui.jump.blur();
  });

  document.addEventListener('keydown', (e) => {
    // Let the number box have its own keys while it is being typed into.
    if (e.target === ui.jump) return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(list.length - 1); }
    else if (e.key === 'r' || e.key === 'R') { revealed = !revealed; renderDetails(); }
  });

  renderOrder();
  buildModes();
  renderModes();
  ui.speciesCount.textContent = fmt(FISH.length);
  const label = document.createElement('span');
  label.className = 'species-count-label';
  label.textContent = 'species';
  ui.speciesCount.append(label);

  show(0);
})();
