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
  const BEST_KEY = 'fishguesser.best';

  const $ = (id) => document.getElementById(id);
  const ui = {
    round: $('roundValue'), score: $('scoreValue'), best: $('bestValue'),
    hints: $('hintsValue'),
    photo: $('fishPhoto'), photoBg: $('fishPhotoBg'), credit: $('photoCredit'),
    name: $('fishName'), sci: $('fishSci'),
    map: $('map'),
    actionBar: $('actionBar'), hint: $('hint'), guessBtn: $('guessBtn'),
    hintBtn: $('hintBtn'), halfBtn: $('halfBtn'), promptText: $('promptText'),
    result: $('result'), verdict: $('verdict'), points: $('points'),
    resultBonus: $('resultBonus'),
    resultLine: $('resultLine'), resultFact: $('resultFact'), nextBtn: $('nextBtn'),
    version: $('version'), speciesCount: $('speciesCount'),
    startOverlay: $('startOverlay'), startBtn: $('startBtn'),
    startFishCount: $('startFishCount'),
    overlay: $('overlay'), finalScore: $('finalScore'), finalMax: $('finalMax'),
    endBlurb: $('endBlurb'), breakdown: $('breakdown'), playAgain: $('playAgainBtn'),
  };

  const state = {
    deck: [], index: 0, total: 0, selected: null, results: [],
    phase: 'guess', nameRevealed: false, halfShown: false,
    hintsLeft: HINTS_PER_GAME,
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
      const raw = window.localStorage.getItem(BEST_KEY);
      const n = raw === null ? 0 : Number(raw);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0; // Private mode, blocked storage — the game works without it.
    }
  }

  function writeBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch {
      /* nothing to do; the score just won't persist */
    }
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
    ui.photo.alt = 'Photograph of the fish to identify';
    ui.photo.src = fish.image;
    ui.photoBg.classList.remove('is-ready');
    ui.photoBg.src = fish.image;
    ui.name.textContent = maskName(fish.name);
    ui.name.classList.add('is-masked');
    // Shown even while the common name is censored — it is the taxonomy, not
    // the answer, and it gives the round something to hold on to.
    ui.sci.textContent = fish.sciName;
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
  }

  function submitGuess() {
    if (state.phase !== 'guess' || !state.selected) return;
    state.phase = 'result';

    /* Read this before the free end-of-round reveal below, otherwise every
     * round would look as though the name had been peeked at. */
    const peeked = state.nameRevealed || state.halfShown;
    revealName(); // the round is over, so the answer is no longer a hint
    ui.credit.hidden = !ui.credit.textContent;

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
    ui.nextBtn.textContent = state.index + 1 >= ROUNDS ? 'See final score' : 'Next fish';

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

  /* The front page holds the first round until the rules have been read. The
   * round behind it is already dealt, so this only lifts the curtain — dealing
   * again here would throw away the photo that has been loading meanwhile.
   * Play again skips the rules: by then the player knows how it works. */
  function beginPlay() {
    ui.startOverlay.hidden = true;
  }

  function startGame() {
    state.deck = shuffle(FISH).slice(0, ROUNDS);
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
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    // Enter starts the game while the rules are up; the round behind them is
    // already dealt, so it must not also lock in a guess on the same press.
    if (!ui.startOverlay.hidden) { beginPlay(); return; }
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

  /* Counted, never hard-coded: adding a fish to FISH updates the header. */
  function showSpeciesCount() {
    const n = FISH.length;
    ui.speciesCount.textContent = fmt(n);
    const label = document.createElement('span');
    label.className = 'species-count-label';
    label.textContent = 'fish';
    ui.speciesCount.append(label);
    ui.speciesCount.title =
      `${fmt(n)} species across ${REGIONS.length} regions`;
  }

  showVersion();
  showSpeciesCount();
  ui.startFishCount.textContent = `all ${fmt(FISH.length)} fish`;
  WorldMap.build(ui.map, select);
  const best = readBest();
  ui.best.textContent = best ? fmt(best) : '—';
  /* Deal the first round behind the rules so its photo is fetched while they
   * are being read, then hand focus to Start. */
  startGame();
  // preventScroll: focusing the button would otherwise scroll the rules card
  // down to it, landing the player halfway through the text.
  ui.startBtn.focus({ preventScroll: true });
})();
