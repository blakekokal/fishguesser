/* Fishguesser — game loop.
 *
 * Five rounds drawn at random from the fish list. Each round shows one fish and
 * you pick the region it comes from: an exact hit is worth MAX_POINTS, and a
 * miss earns partial credit that decays with the distance between the region
 * you picked and the right one. */

(() => {
  const ROUNDS = 5;
  const MAX_POINTS = 5000;
  // Full reveals are a budget for the whole game, not per fish, so using one
  // costs you the chance to use it later. Showing half a name is free of that
  // budget, but like a full reveal it gives up the round's no-peek bonus.
  const HINTS_PER_GAME = 2;
  // Guessing a fish while its name is still censored is worth this much on top
  // of the round score, and every hint left unspent pays out again at the end.
  const NO_PEEK_BONUS = 500;
  const SAVED_HINT_BONUS = 500;
  // Larger = more forgiving of near misses. The regions are far apart, so a
  // tight decay would round almost every wrong answer down to zero.
  const DECAY_KM = 3000;
  // Both live in localStorage, under keys that depend on which save is
  // active — see profile.js, which owns the naming and the backup codes.
  const BEST_KEY = () => PROFILE.bestKey();
  // Which fish have already come up in the current pass through the list.
  // Kept next to the best score so a refresh does not restart the cycle.
  const SEEN_KEY = () => PROFILE.seenKey();
  /* The filter is a view setting, not progress: it is not part of a save, does
   * not travel in a backup code, and so is stored once for the browser. */
  const FILTER_KEY = 'fishguesser.filter';

  /* Which part of the pass a game is dealt from. `unseen` is how the game has
   * always dealt — the rest of this pass first — and stays the default. */
  const POOL_FILTERS = [
    { id: 'unseen', label: 'Unseen first', short: 'Unseen' },
    { id: 'seen', label: 'Seen only', short: 'Seen' },
    { id: 'any', label: 'Any', short: 'Any' },
  ];

  const $ = (id) => document.getElementById(id);
  const ui = {
    round: $('roundValue'), score: $('scoreValue'), best: $('bestValue'),
    hints: $('hintsValue'),
    photo: $('fishPhoto'), photoBg: $('fishPhotoBg'), credit: $('photoCredit'),
    name: $('fishName'), sci: $('fishSci'), fact: $('fishFact'),
    map: $('map'),
    actionBar: $('actionBar'), hint: $('hint'), guessBtn: $('guessBtn'),
    hintBtn: $('hintBtn'), halfBtn: $('halfBtn'), promptText: $('promptText'),
    result: $('result'), verdict: $('verdict'), points: $('points'),
    resultBonus: $('resultBonus'),
    resultLine: $('resultLine'), resultFact: $('resultFact'), nextBtn: $('nextBtn'),
    version: $('version'), speciesCount: $('speciesCount'),
    startOverlay: $('startOverlay'), startBtn: $('startBtn'),
    startFishCount: $('startFishCount'),
    seen: $('seenValue'),
    resetBest: $('resetBestBtn'), resetSeen: $('resetSeenBtn'),
    topName: $('topName'),
    filterBtn: $('filterBtn'), filterValue: $('filterValue'),
    filterPanel: $('filterPanel'), filterPoolRow: $('filterPoolRow'),
    filterKindRow: $('filterKindRow'),
    profileName: $('profileName'), profileSave: $('profileSaveBtn'),
    profileNote: $('profileNote'), backup: $('backupBtn'),
    restore: $('restoreBtn'), backupCode: $('backupCode'),
    overlay: $('overlay'), finalScore: $('finalScore'), finalMax: $('finalMax'),
    endBlurb: $('endBlurb'), breakdown: $('breakdown'), playAgain: $('playAgainBtn'),
  };

  const state = {
    deck: [], index: 0, total: 0, selected: null, results: [],
    phase: 'guess', nameRevealed: false, halfShown: false,
    hintsLeft: HINTS_PER_GAME,
    // Overwritten from storage before the first deal; these are the defaults.
    filter: { kind: 'all', pool: 'unseen' },
  };

  const fmt = (n) => n.toLocaleString('en-US');

  function shuffle(items) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function readBest() {
    try {
      const raw = window.localStorage.getItem(BEST_KEY());
      const n = raw === null ? 0 : Number(raw);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0; // Private mode, blocked storage — the game works without it.
    }
  }

  function writeBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY(), String(value));
    } catch {
      /* nothing to do; the score just won't persist */
    }
  }

  /* Ids only, and filtered against the current FISH list on the way in: adding
   * or removing species must not strand the cycle on names that no longer
   * exist, and a newly added fish should simply count as not yet seen. */
  function readSeen() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(SEEN_KEY()));
      if (!Array.isArray(raw)) return [];
      const known = new Set(FISH.map((f) => f.id));
      return raw.filter((id) => known.has(id));
    } catch {
      return [];
    }
  }

  function writeSeen(ids) {
    try {
      window.localStorage.setItem(SEEN_KEY(), JSON.stringify(ids));
    } catch {
      /* the cycle just won't survive a refresh */
    }
  }

  /* The filter, read back defensively: it is a stored string that a later
   * version may no longer know, and an unknown mode must not empty the game. */
  function readFilter() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(FILTER_KEY));
      const kind = KIND_BY_ID[raw && raw.kind] ? raw.kind : 'all';
      const pool = POOL_FILTERS.some((p) => p.id === (raw && raw.pool))
        ? raw.pool : 'unseen';
      return { kind, pool };
    } catch {
      return { kind: 'all', pool: 'unseen' };
    }
  }

  function writeFilter() {
    try {
      window.localStorage.setItem(FILTER_KEY, JSON.stringify(state.filter));
    } catch {
      /* the filter just won't survive a refresh */
    }
  }

  /** Every species the current mode plays with, before the pass is considered. */
  function kindPool() {
    return FISH.filter(KIND_BY_ID[state.filter.kind].test);
  }

  /* Five rounds is what the scoring is built on, so a pool smaller than a game
   * repeats rather than dealing a short one. Only "Seen only" can get there —
   * the narrowest mode is ten crabs — and it reshuffles between helpings so a
   * repeat is not the very next round. */
  function take(list, count) {
    if (!list.length) return [];
    const out = shuffle(list).slice(0, count);
    while (out.length < count) out.push(...shuffle(list).slice(0, count - out.length));
    return out;
  }

  /* Deals a round's worth of fish without repeating any until every species has
   * been shown. The unseen pool is what is left of this pass; when it runs
   * short the last of it is dealt and a fresh pass starts, with the fish just
   * dealt held back so the changeover cannot repeat one inside a single game.
   *
   * The filter narrows what is drawn from, not what the pass means: `seen` is
   * still every species this browser has been shown, so playing crab mode does
   * not tell the game you have seen the other 220.
   *
   * Dealing marks nothing. A hand is five fish drawn at once but met one at a
   * time, and a game can be abandoned or reloaded away halfway through, so the
   * pass advances on `markSeen` as each fish actually reaches the screen. */
  function dealFish(count) {
    const pool = kindPool();
    const seenSet = new Set(readSeen());
    const unseen = pool.filter((f) => !seenSet.has(f.id));

    // Nothing seen yet is the ordinary state of "Seen only" on a fresh browser;
    // the option is disabled there, and this keeps a stale setting playable.
    if (state.filter.pool === 'seen') {
      const seen = pool.filter((f) => seenSet.has(f.id));
      return take(seen.length ? seen : pool, count);
    }
    if (state.filter.pool === 'any') return take(pool, count);

    if (unseen.length >= count) return shuffle(unseen).slice(0, count);

    const tail = shuffle(unseen);
    const dealt = new Set(tail.map((f) => f.id));
    const head = shuffle(pool.filter((f) => !dealt.has(f.id))).slice(0, count - tail.length);
    /* Only a pass through the whole collection can end: running out of unseen
     * crabs is not a full pass, and wiping the cycle there would throw away
     * progress on the 220 species crab mode never deals. */
    if (state.filter.kind === 'all') {
      writeSeen([]); // the pass is spent; the rest of this hand opens the next one
    }
    return take(tail.concat(head), count);
  }

  /* One fish has reached the player, so the pass moves on by one. Called when a
   * fish becomes visible rather than when it is dealt, which is what keeps a
   * reload — or a game walked away from — from spending fish nobody saw. */
  function markSeen(fish) {
    if (!fish) return;
    const seen = readSeen();
    if (!seen.includes(fish.id)) writeSeen(seen.concat(fish.id));
    renderSeen();
  }

  /* Most regions read as "the Congo Basin"; a few are proper place names that
   * do not take an article, and say so with `article: false`. */
  const withArticle = (region) =>
    (region.article === false ? '' : 'the ') + region.name;

  /* Blank the name completely — the photo is meant to be the only clue. Spaces
   * survive so the shape of the name still reads as a name rather than a blob,
   * but nothing about the words themselves shows. */
  const maskName = (name) => name.replace(/\S/g, '•');

  const blank = (word) => '•'.repeat(word.length);

  /* The free step: give back the last word, which says what kind of fish it is
   * ("… Cod", "… Tetra") while the leading word — nearly always the geographic
   * giveaway — stays hidden. A one-word name gives back its second half. */
  function halfMaskName(name) {
    const words = name.split(' ');
    if (words.length === 1) {
      const cut = Math.ceil(name.length / 2);
      return blank(name.slice(0, cut)) + name.slice(cut);
    }
    return words.map((w, i) => (i < words.length - 1 ? blank(w) : w)).join(' ');
  }

  function renderHints() {
    ui.hints.replaceChildren();
    for (let i = 0; i < HINTS_PER_GAME; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'hint-dot' + (i < state.hintsLeft ? '' : ' is-spent');
      dot.textContent = '\u25cf';
      ui.hints.append(dot);
    }
    ui.hints.setAttribute('aria-label',
      `${state.hintsLeft} of ${HINTS_PER_GAME} hints left`);
  }

  function updateHintButton() {
    if (state.nameRevealed) {
      ui.hintBtn.hidden = true;
      ui.halfBtn.hidden = true;
      return;
    }
    ui.halfBtn.hidden = state.halfShown;
    ui.hintBtn.hidden = false;
    ui.hintBtn.disabled = state.hintsLeft === 0;
    ui.hintBtn.textContent = state.hintsLeft === 0
      ? 'No reveals left'
      : `Reveal name · ${state.hintsLeft} left`;
  }

  /** Free: costs no reveal, but gives up this round's no-peek bonus. */
  function showHalfName() {
    const fish = state.deck[state.index];
    if (!fish || state.nameRevealed || state.halfShown) return;
    state.halfShown = true;
    ui.name.textContent = halfMaskName(fish.name);
    updateHintButton();
  }

  /* `spend` separates the two ways the full name gets shown: asking for it
   * costs one of the reveals, whereas the automatic reveal once a round is over
   * is free — by then the name is no longer a hint. */
  function revealName({ spend = false } = {}) {
    const fish = state.deck[state.index];
    if (!fish || state.nameRevealed) return;
    if (spend) {
      if (state.hintsLeft <= 0) return;
      state.hintsLeft -= 1;
      renderHints();
    }
    state.nameRevealed = true;
    ui.name.textContent = fish.name;
    ui.name.classList.remove('is-masked');
    ui.photo.alt = `Photograph of a ${fish.name}`;
    /* The credit deliberately stays hidden here: it can name a place or an
     * institution, so it waits for the guess rather than the name. */
    updateHintButton();
  }

  function scoreFor(distanceKm) {
    if (distanceKm === 0) return MAX_POINTS;
    return Math.round(MAX_POINTS * Math.exp(-distanceKm / DECAY_KM));
  }

  function select(regionId) {
    if (state.phase !== 'guess') return;
    state.selected = regionId;
    WorldMap.setSelected(regionId);
    ui.guessBtn.disabled = false;
    ui.hint.textContent = `${REGIONS_BY_ID[regionId].name} — ${REGIONS_BY_ID[regionId].blurb}`;
  }

  function renderRound() {
    const fish = state.deck[state.index];
    state.phase = 'guess';
    state.selected = null;

    ui.round.textContent = `${state.index + 1} / ${ROUNDS}`;
    ui.score.textContent = fmt(state.total);

    ui.photo.classList.remove('is-ready');
    ui.photo.classList.remove('is-broken');
    /* Not the species name: a linked photo that fails to load renders its alt
     * text on screen, which would hand over the answer. */
    ui.photo.alt = 'Photograph of the animal to identify';
    ui.photo.src = fish.image;
    ui.photoBg.classList.remove('is-ready');
    ui.photoBg.src = fish.image;
    ui.name.textContent = maskName(fish.name);
    ui.name.classList.add('is-masked');
    // Shown even while the common name is censored — it is the taxonomy, not
    // the answer, and it gives the round something to hold on to.
    ui.sci.textContent = fish.sciName;
    /* The fact, free and up front: what the animal does is a fair clue to where
     * it lives. Any place it names is dotted out (see spoilers.js) until the
     * guess is in, at which point the result card prints the fact whole. */
    ui.fact.textContent = maskPlaces(fish.fact);
    ui.fact.hidden = false;
    state.nameRevealed = false;
    state.halfShown = false;
    updateHintButton();
    ui.promptText.textContent = 'Where in the world does it live?';

    /* Loaded now but kept hidden until the guess is in: photographer names and
     * institutions ("Auckland War Memorial Museum") can give the region away.
     * Full attribution also lives in CREDITS.md, linked in the footer. */
    const credit = typeof PHOTO_CREDITS !== 'undefined' ? PHOTO_CREDITS[fish.id] : null;
    ui.credit.textContent = credit ? `${credit.author} · ${credit.license}` : '';
    ui.credit.hidden = true;

    WorldMap.unlock();

    ui.guessBtn.disabled = true;
    ui.hint.textContent = 'Pick a region on the map.';
    ui.actionBar.hidden = false;
    ui.result.hidden = true;
    document.body.classList.remove('is-result');

    // Round one is dealt behind the rules; beginPlay marks it once they lift.
    if (ui.startOverlay.hidden) markSeen(fish);
  }

  function submitGuess() {
    if (state.phase !== 'guess' || !state.selected) return;
    state.phase = 'result';

    /* Read this before the free end-of-round reveal below, otherwise every
     * round would look as though the name had been peeked at. */
    const peeked = state.nameRevealed || state.halfShown;
    revealName(); // the round is over, so the answer is no longer a hint
    ui.credit.hidden = !ui.credit.textContent;
    // The result card carries the fact from here, blanks filled in, so the
    // hint copy steps aside rather than sitting on screen twice.
    ui.fact.hidden = true;

    const fish = state.deck[state.index];
    const guess = REGIONS_BY_ID[state.selected];
    const answer = REGIONS_BY_ID[fish.region];
    const correct = guess.id === answer.id;
    const distance = correct ? 0 : Math.round(haversineKm(guess, answer));
    const bonus = peeked ? 0 : NO_PEEK_BONUS;
    const points = scoreFor(distance) + bonus;

    state.total += points;
    state.results.push({ fish, guess, answer, correct, distance, points, bonus });

    WorldMap.reveal(guess.id, answer.id);
    ui.score.textContent = fmt(state.total);
    ui.result.className = 'result ' + (correct ? 'is-correct' : distance <= 3000 ? 'is-close' : 'is-off');
    ui.verdict.textContent = correct ? 'Correct' : distance <= 3000 ? 'Close' : 'Not quite';
    ui.points.textContent = `+${fmt(points)}`;
    ui.resultLine.textContent = correct
      ? `The ${fish.name} is from ${withArticle(answer)}.`
      : `You said ${withArticle(guess)}. It's from ${withArticle(answer)} — ${fmt(distance)} km away.`;
    if (bonus) {
      ui.resultBonus.textContent =
        `Includes +${fmt(bonus)} for guessing with the name fully censored.`;
      ui.resultBonus.hidden = false;
    } else {
      ui.resultBonus.hidden = true;
    }
    ui.resultFact.textContent = fish.fact;
    ui.nextBtn.textContent = state.index + 1 >= ROUNDS ? 'See final score' : 'Next one';

    ui.actionBar.hidden = true;
    ui.result.hidden = false;
    document.body.classList.add('is-result');
    ui.nextBtn.focus();
  }

  function nextRound() {
    if (state.index + 1 >= ROUNDS) return endGame();
    state.index += 1;
    renderRound();
  }

  function endGame() {
    state.phase = 'over';

    // Unspent hints cash out here, so saving all three is worth 1,500.
    const savedBonus = state.hintsLeft * SAVED_HINT_BONUS;
    state.total += savedBonus;
    ui.score.textContent = fmt(state.total);

    const max = ROUNDS * (MAX_POINTS + NO_PEEK_BONUS)
      + HINTS_PER_GAME * SAVED_HINT_BONUS;
    const best = Math.max(readBest(), state.total);
    writeBest(best);

    ui.best.textContent = fmt(best);
    ui.resetBest.disabled = false;
    ui.finalScore.textContent = fmt(state.total);
    ui.finalMax.textContent = `/ ${fmt(max)}`;

    const hits = state.results.filter((r) => r.correct).length;
    const pct = state.total / max;
    const grade =
      pct >= 0.9 ? 'Marine biologist behaviour.' :
      pct >= 0.7 ? 'Strong instincts for fish.' :
      pct >= 0.45 ? 'Not bad — the oceans are big.' :
      'Plenty of sea left to learn.';
    /* "Blind" covers both peeks: a free half counts as a peek just as a full
     * reveal does, so this cannot claim a name was revealed when it was not. */
    const clean = state.results.filter((r) => r.bonus).length;
    const cleanNote = clean
      ? ` ${clean} guessed blind.`
      : ' None guessed blind.';
    ui.endBlurb.textContent = `${hits} of ${ROUNDS} exactly right.${cleanNote} ${grade}`;

    ui.breakdown.replaceChildren();
    for (const r of state.results) {
      const li = document.createElement('li');
      li.className = 'breakdown-row' + (r.correct ? ' is-correct' : '');

      const name = document.createElement('span');
      name.className = 'breakdown-fish';
      name.textContent = r.fish.name;

      const where = document.createElement('span');
      where.className = 'breakdown-where';
      where.textContent = r.correct ? r.answer.name : `${r.guess.name} → ${r.answer.name}`;

      const pts = document.createElement('span');
      pts.className = 'breakdown-points';
      pts.textContent = fmt(r.points);

      if (r.bonus) {
        where.textContent += `  ·  +${fmt(r.bonus)} unrevealed`;
      }
      li.append(name, where, pts);
      ui.breakdown.append(li);
    }

    // The unspent-hint payout is its own line rather than being folded into a
    // round, since it is earned across the whole game.
    if (savedBonus) {
      const li = document.createElement('li');
      li.className = 'breakdown-row is-bonus';

      const name = document.createElement('span');
      name.className = 'breakdown-fish';
      name.textContent = 'Hints saved';

      const where = document.createElement('span');
      where.className = 'breakdown-where';
      where.textContent = `${state.hintsLeft} × ${fmt(SAVED_HINT_BONUS)}`;

      const pts = document.createElement('span');
      pts.className = 'breakdown-points';
      pts.textContent = `+${fmt(savedBonus)}`;

      li.append(name, where, pts);
      ui.breakdown.append(li);
    }

    ui.overlay.hidden = false;
    ui.playAgain.focus();
  }

  /* How far the current pass has got through whatever is being played, next to
   * the button that restarts it. In a narrowed mode it counts that mode — "3/10"
   * in crab mode — since that is the pool the rounds are actually coming from.
   * Runs after every deal, after either reset, and when the filter changes. */
  function renderSeen() {
    const pool = kindPool();
    const seenSet = new Set(readSeen());
    const seen = pool.filter((f) => seenSet.has(f.id)).length;
    const kind = KIND_BY_ID[state.filter.kind];
    ui.seen.textContent = `${fmt(seen)}/${fmt(pool.length)}`;
    ui.seen.title = state.filter.kind === 'all'
      ? `${fmt(seen)} of ${fmt(pool.length)} species have come up this pass`
      : `${fmt(seen)} of ${fmt(pool.length)} in ${kind.label} have come up this pass`;
    // The reset clears the whole pass, so it follows the whole pass, not the mode.
    ui.resetSeen.disabled = seenSet.size === 0;
  }

  /* The filter's two rows, built from the lists that define them so a mode is
   * added in one place. A count rides on each option: it says what a game would
   * be dealt from, which is the only number that answers "why so few?". */
  function buildFilter() {
    const add = (row, id, group, label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-opt';
      btn.dataset.group = group;
      btn.dataset.id = id;
      const text = document.createElement('span');
      text.textContent = label;
      const count = document.createElement('span');
      count.className = 'filter-n';
      btn.append(text, count);
      btn.addEventListener('click', () => setFilter(group, id));
      row.append(btn);
    };
    POOL_FILTERS.forEach((p) => add(ui.filterPoolRow, p.id, 'pool', p.label));
    KIND_FILTERS.forEach((k) => add(ui.filterKindRow, k.id, 'kind', k.label));
  }

  /* Counts every option against the *other* row's current choice, so the panel
   * always says what picking it would deal from right now. An option with
   * nothing behind it is disabled rather than hidden. */
  function renderFilter() {
    const pool = kindPool();
    const seenSet = new Set(readSeen());
    const inPass = (list, mode) => {
      if (mode === 'any') return list.length;
      const seen = list.filter((f) => seenSet.has(f.id)).length;
      return mode === 'seen' ? seen : list.length - seen;
    };

    for (const btn of ui.filterPanel.querySelectorAll('.filter-opt')) {
      const { group, id } = btn.dataset;
      const on = state.filter[group] === id;
      const list = group === 'kind' ? FISH.filter(KIND_BY_ID[id].test) : pool;
      const mode = group === 'kind' ? state.filter.pool : id;
      const n = inPass(list, mode);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      /* Only "Seen only" can leave nothing to deal. "Unseen first" reads zero
       * at the end of a pass and still plays — that is the point of it, the
       * pass turns over and the collection comes round again. */
      btn.disabled = n === 0 && !on && mode === 'seen';
      btn.querySelector('.filter-n').textContent = fmt(n);
    }

    const kind = KIND_BY_ID[state.filter.kind];
    const poolFilter = POOL_FILTERS.find((p) => p.id === state.filter.pool);
    ui.filterValue.textContent = `${kind.short} · ${poolFilter.short}`;
    ui.filterBtn.title =
      `Dealing from ${kind.label.toLowerCase()}, ${poolFilter.label.toLowerCase()}`;
    ui.startFishCount.textContent = state.filter.kind === 'all'
      ? `all ${fmt(pool.length)} species`
      : `the ${fmt(pool.length)} in ${kind.label.toLowerCase()}`;
  }

  /* A game is five fish dealt at once, so a new pool means a new game rather
   * than a hand half from each. The panel says so before it is touched. */
  function setFilter(group, id) {
    if (state.filter[group] === id) return closeFilter();
    state.filter[group] = id;
    writeFilter();
    closeFilter();
    renderFilter();
    startGame();
    renderSeen();
  }

  function openFilter() {
    renderFilter(); // counts move as the pass does, so they are read on opening
    ui.filterPanel.hidden = false;
    ui.filterBtn.setAttribute('aria-expanded', 'true');
  }

  function closeFilter() {
    ui.filterPanel.hidden = true;
    ui.filterBtn.setAttribute('aria-expanded', 'false');
  }

  const filterOpen = () => !ui.filterPanel.hidden;

  /* The two stored numbers, redrawn from whichever save is active: switching
   * name or pasting a code changes both without touching the game on screen. */
  function renderStored() {
    const best = readBest();
    ui.best.textContent = best ? fmt(best) : '—';
    ui.resetBest.disabled = !best;
    renderSeen();
  }

  const note = (text, warn = false) => {
    ui.profileNote.textContent = text;
    ui.profileNote.classList.toggle('is-warn', warn);
  };

  /* Says whose save is on and how far it has got, which is the only feedback
   * naming a save gives — the counters themselves live in the top bar. */
  function renderProfile() {
    const seen = readSeen().length;
    note(PROFILE.name
      ? `Playing as ${PROFILE.name} — ${fmt(seen)} of ${fmt(FISH.length)} seen, in this browser.`
      : `Progress is kept in this browser. ${fmt(seen)} of ${fmt(FISH.length)} seen.`);
  }

  /* Both name boxes — the tile in the top bar and the one on the rules card —
   * edit the same save, so whichever was typed into wins and the other follows.
   * Switching name repoints storage, so the counters are redrawn with it. */
  function useName(source) {
    PROFILE.setName(source.value);
    ui.profileName.value = PROFILE.name;
    ui.topName.value = PROFILE.name;
    renderStored();
    renderProfile();
  }

  function showBackup() {
    const code = PROFILE.backupCode();
    ui.backupCode.hidden = false;
    ui.backupCode.value = code;
    ui.backupCode.select();
    // Clipboard access can be refused (an insecure origin, a permission), and
    // the code is selected either way, so a copy is never the only route.
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(
        () => note('Code copied. Keep it anywhere — paste it back to restore.'),
        () => note('Code ready — copy it from the box and keep it somewhere.'),
      );
    } else {
      note('Code ready — copy it from the box and keep it somewhere.');
    }
  }

  function restoreBackup() {
    if (ui.backupCode.hidden || !ui.backupCode.value.trim()) {
      ui.backupCode.hidden = false;
      ui.backupCode.value = '';
      ui.backupCode.focus();
      note('Paste a backup code into the box, then press Restore.');
      return;
    }
    const result = PROFILE.restore(ui.backupCode.value);
    if (!result) {
      note('That does not look like a backup code.', true);
      return;
    }
    ui.profileName.value = PROFILE.name;
    renderStored();
    const missing = result.unknown
      ? ` ${fmt(result.unknown)} from the code are no longer in the game.`
      : '';
    note(`Restored: ${fmt(result.added)} added, ${fmt(result.seen)} of ${fmt(FISH.length)} seen.${missing}`);
  }

  function resetBest() {
    try {
      window.localStorage.removeItem(BEST_KEY());
    } catch {
      /* nothing stored to begin with */
    }
    ui.best.textContent = '—';
    ui.resetBest.disabled = true;
  }

  /* Empties the pass without disturbing the game on screen. The fish being
   * looked at right now is marked straight back, so the count reads 1 mid-round
   * and 0 from the rules screen, where nothing has been shown yet. */
  function resetSeen() {
    writeSeen([]);
    if (ui.startOverlay.hidden) markSeen(state.deck[state.index]);
    renderSeen();
  }

  /* The front page holds the first round until the rules have been read. The
   * round behind it is already dealt, so this only lifts the curtain — dealing
   * again here would throw away the photo that has been loading meanwhile.
   * Play again skips the rules: by then the player knows how it works. */
  function beginPlay() {
    ui.startOverlay.hidden = true;
    markSeen(state.deck[state.index]); // now it is actually being looked at
  }

  function startGame() {
    state.deck = dealFish(ROUNDS);
    state.index = 0;
    state.total = 0;
    state.results = [];
    state.hintsLeft = HINTS_PER_GAME;
    renderHints();
    ui.overlay.hidden = true;
    renderRound();
  }

  ui.photo.addEventListener('load', () => ui.photo.classList.add('is-ready'));
  ui.photoBg.addEventListener('load', () => ui.photoBg.classList.add('is-ready'));
  /* Photos are fetched from Wikimedia at play time, so a slow or blocked
   * network is a real possibility. Say so rather than leaving an empty frame —
   * the round is still playable, since the name and the map carry the puzzle. */
  ui.photo.addEventListener('error', () => ui.photo.classList.add('is-broken'));
  ui.halfBtn.addEventListener('click', showHalfName);
  ui.hintBtn.addEventListener('click', () => revealName({ spend: true }));
  ui.guessBtn.addEventListener('click', submitGuess);
  ui.nextBtn.addEventListener('click', nextRound);
  ui.playAgain.addEventListener('click', startGame);
  ui.startBtn.addEventListener('click', beginPlay);
  ui.profileSave.addEventListener('click', () => useName(ui.profileName));
  ui.profileName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); useName(ui.profileName); }
  });
  /* The tile has no button beside it, so it commits on the two things that
   * mean "done": leaving the field, and pressing Enter. */
  ui.topName.addEventListener('change', () => useName(ui.topName));
  ui.topName.addEventListener('blur', () => useName(ui.topName));
  ui.topName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ui.topName.blur(); }
  });
  ui.filterBtn.addEventListener('click', () => (filterOpen() ? closeFilter() : openFilter()));
  /* A click anywhere else puts the panel away, which is what a popover is
   * expected to do; the button's own click is left to the toggle above. */
  document.addEventListener('click', (e) => {
    if (!filterOpen()) return;
    if (e.target.closest('.stat-filter')) return;
    closeFilter();
  });
  ui.backup.addEventListener('click', showBackup);
  ui.restore.addEventListener('click', restoreBackup);
  ui.resetBest.addEventListener('click', resetBest);
  ui.resetSeen.addEventListener('click', resetSeen);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filterOpen()) {
      closeFilter();
      ui.filterBtn.focus();
      return;
    }
    if (e.key !== 'Enter') return;
    // The filter is open: Enter belongs to whatever is focused inside it, not
    // to the game behind it.
    if (filterOpen()) return;
    // Enter starts the game while the rules are up; the round behind them is
    // already dealt, so it must not also lock in a guess on the same press.
    if (!ui.startOverlay.hidden) {
      // Enter on a focused reset button already presses it; starting the game
      // off the same keystroke would carry the player straight out of the rules.
      if (e.target === ui.resetBest || e.target === ui.resetSeen) return;
      // Same for the save block: naming a save or pasting a code is not a
      // request to start playing.
      if (e.target === ui.profileName || e.target === ui.backupCode) return;
      if (e.target === ui.topName) return;
      if (e.target === ui.filterBtn) return;
      if (e.target === ui.profileSave || e.target === ui.backup || e.target === ui.restore) return;
      beginPlay();
      return;
    }
    if (state.phase === 'guess' && state.selected) submitGuess();
    else if (state.phase === 'result') nextRound();
  });

  /* Shows which build you are looking at, so a stale cached page is obvious.
   * The date is spelled out rather than rendered from a Date object: the stamp
   * is a plain string, and parsing it would shift it across time zones. */
  function showVersion() {
    if (typeof APP_VERSION === 'undefined') return;
    const [y, m, d] = (APP_VERSION.date || '').split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pretty = y && m && d ? `${Number(d)} ${months[Number(m) - 1]} ${y}` : '';
    ui.version.textContent = `v${APP_VERSION.version}`;
    ui.version.title = pretty ? `Version ${APP_VERSION.version}, built ${pretty}` : '';
    if (pretty) {
      const stamp = document.createElement('span');
      stamp.className = 'version-date';
      stamp.textContent = pretty;
      ui.version.append(stamp);
    }
  }

  /* Counted, never hard-coded: adding an entry to FISH updates the header.
   * "species" rather than "fish" because the collection is no longer only
   * fish — there are cephalopods and marine mammals in it now. */
  function showSpeciesCount() {
    const n = FISH.length;
    ui.speciesCount.textContent = fmt(n);
    const label = document.createElement('span');
    label.className = 'species-count-label';
    label.textContent = 'species';
    ui.speciesCount.append(label);
    ui.speciesCount.title =
      `${fmt(n)} species across ${REGIONS.length} regions`;
  }

  /* The overlays sit below the top bar rather than under it, and the bar's
   * height changes with the screen — one row of tiles on a desktop, two on a
   * phone — so it is measured rather than guessed. */
  function measureTopbar() {
    const bar = document.querySelector('.topbar');
    if (!bar) return;
    document.documentElement.style.setProperty('--topbar-h', `${bar.offsetHeight}px`);
  }

  showVersion();
  showSpeciesCount();
  /* Read and drawn before the first deal: the stored filter decides what that
   * deal comes from, and the rules card behind it names the pool. */
  state.filter = readFilter();
  buildFilter();
  renderFilter();
  measureTopbar();
  window.addEventListener('resize', measureTopbar);
  WorldMap.build(ui.map, select);
  ui.profileName.value = PROFILE.name;
  ui.topName.value = PROFILE.name;
  const best = readBest();
  ui.best.textContent = best ? fmt(best) : '—';
  ui.resetBest.disabled = !best;
  /* Deal the first round behind the rules so its photo is fetched while they
   * are being read, then hand focus to Start. */
  startGame();
  renderSeen();
  renderProfile();
  // preventScroll: focusing the button would otherwise scroll the rules card
  // down to it, landing the player halfway through the text.
  ui.startBtn.focus({ preventScroll: true });
})();
