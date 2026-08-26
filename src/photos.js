/* Fishguesser — photo check.
 *
 * A reviewing tool, not part of the game: it steps through every fish one at a
 * time in the same letterboxed frame the game uses, so a picture can be judged
 * as a player would meet it. The name is shown by default so a bad photo can be
 * named; `R` hides it to look at a picture cold. The region is never shown —
 * that is the answer, and reviewing photos must not spend it.
 *
 * Order follows FISH, so the number under the photo is a stable way to point at
 * one ("number 37 is bad") without the details being on screen. */

(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    photo: $('fishPhoto'), photoBg: $('fishPhotoBg'),
    details: $('details'), name: $('fishName'), sci: $('fishSci'),
    meta: $('fishMeta'), count: $('count'), jump: $('jump'),
    prev: $('prevBtn'), next: $('nextBtn'), reveal: $('revealBtn'),
    speciesCount: $('speciesCount'),
  };

  const fmt = (n) => n.toLocaleString('en-US');
  const total = FISH.length;
  let index = 0;
  /* On by default: the page is mostly used to spot a bad photo and say which
   * one it is, and that needs the name. `R` hides it to judge a picture cold. */
  let revealed = true;

  /* The next photo is fetched while this one is being looked at, so stepping
   * forward does not wait on the network every time. */
  function preload(i) {
    if (i < 0 || i >= total) return;
    const img = new Image();
    img.src = FISH[i].image;
  }

  function renderDetails() {
    ui.details.hidden = !revealed;
    ui.reveal.setAttribute('aria-pressed', String(revealed));
    ui.reveal.textContent = revealed ? 'Hide details' : 'Show details';
    if (!revealed) return;

    const fish = FISH[index];
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
    index = Math.min(Math.max(i, 0), total - 1);
    const fish = FISH[index];

    ui.photo.classList.remove('is-ready', 'is-broken');
    ui.photoBg.classList.remove('is-ready');
    ui.photo.src = fish.image;
    ui.photoBg.src = fish.image;

    ui.count.textContent = `of ${fmt(total)}`;
    ui.jump.value = String(index + 1);
    ui.prev.disabled = index === 0;
    ui.next.disabled = index === total - 1;

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
    else if (e.key === 'End') { e.preventDefault(); show(total - 1); }
    else if (e.key === 'r' || e.key === 'R') { revealed = !revealed; renderDetails(); }
  });

  ui.jump.max = String(total);
  ui.speciesCount.textContent = fmt(total);
  const label = document.createElement('span');
  label.className = 'species-count-label';
  label.textContent = 'species';
  ui.speciesCount.append(label);

  show(0);
})();
