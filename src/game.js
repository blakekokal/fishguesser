/* Fishguesser — game loop.
 *
 * Five rounds drawn at random from the fish list. Each round shows one fish and
 * you pick the region it comes from: an exact hit is worth MAX_POINTS, and a
 * miss earns partial credit that decays with the distance between the region
 * you picked and the right one. */

(() => {
  const ROUNDS = 5;
  const MAX_POINTS = 5000;
  // Larger = more forgiving of near misses. The regions are far apart, so a
  // tight decay would round almost every wrong answer down to zero.
  const DECAY_KM = 3000;
  const BEST_KEY = 'fishguesser.best';

  const $ = (id) => document.getElementById(id);
  const ui = {
    round: $('roundValue'), score: $('scoreValue'), best: $('bestValue'),
    photo: $('fishPhoto'), credit: $('photoCredit'),
    name: $('fishName'), sci: $('fishSci'),
    map: $('map'), chips: $('regionChips'),
    actionBar: $('actionBar'), hint: $('hint'), guessBtn: $('guessBtn'),
    hintBtn: $('hintBtn'), promptText: $('promptText'),
    result: $('result'), verdict: $('verdict'), points: $('points'),
    resultLine: $('resultLine'), resultFact: $('resultFact'), nextBtn: $('nextBtn'),
    version: $('version'),
    overlay: $('overlay'), finalScore: $('finalScore'), finalMax: $('finalMax'),
    endBlurb: $('endBlurb'), breakdown: $('breakdown'), playAgain: $('playAgainBtn'),
  };

  const state = {
    deck: [], index: 0, total: 0, selected: null, results: [],
    phase: 'guess', nameRevealed: false,
  };
  const chips = new Map();

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

  const blank = (word) => '•'.repeat(word.length);

  /* Hide the front of the name, not the back. The geographic giveaway is almost
   * always the leading word — "Atlantic", "Congo", "Australian" — so masking
   * the front is what actually makes the round a guess, while the final word
   * ("… Cod", "… Tetra") still says what kind of fish you are looking at.
   * Whole words are masked so the result never reads like "•••••• •rouper"; a
   * single-word name falls back to hiding its first half. */
  function maskName(name) {
    const words = name.split(' ');
    if (words.length === 1) {
      const cut = Math.ceil(name.length / 2);
      return blank(name.slice(0, cut)) + name.slice(cut);
    }
    return words.map((w, i) => (i < words.length - 1 ? blank(w) : w)).join(' ');
  }

  function revealName() {
    const fish = state.deck[state.index];
    if (!fish) return;
    state.nameRevealed = true;
    ui.name.textContent = fish.name;
    ui.name.classList.remove('is-masked');
    ui.hintBtn.hidden = true;
  }

  function scoreFor(distanceKm) {
    if (distanceKm === 0) return MAX_POINTS;
    return Math.round(MAX_POINTS * Math.exp(-distanceKm / DECAY_KM));
  }

  function buildChips() {
    ui.chips.replaceChildren();
    chips.clear();
    for (const region of REGIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = region.name;
      btn.title = region.blurb;
      btn.addEventListener('click', () => select(region.id));
      // Points the chip at its zone, so the pairing is obvious before clicking.
      btn.addEventListener('mouseenter', () => WorldMap.setHover(region.id));
      btn.addEventListener('mouseleave', () => WorldMap.setHover(null));
      ui.chips.append(btn);
      chips.set(region.id, btn);
    }
  }

  function select(regionId) {
    if (state.phase !== 'guess') return;
    state.selected = regionId;
    for (const [id, btn] of chips) btn.classList.toggle('is-selected', id === regionId);
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
    ui.photo.alt = `Photograph of a ${fish.name}`;
    ui.photo.src = fish.image;
    ui.name.textContent = maskName(fish.name);
    ui.name.classList.add('is-masked');
    ui.sci.textContent = fish.sciName;
    state.nameRevealed = false;
    ui.hintBtn.hidden = false;
    ui.promptText.textContent = 'Where in the world does it live?';

    const credit = typeof PHOTO_CREDITS !== 'undefined' ? PHOTO_CREDITS[fish.id] : null;
    if (credit) {
      ui.credit.textContent = `${credit.author} · ${credit.license}`;
      ui.credit.hidden = false;
    } else {
      ui.credit.hidden = true;
    }

    for (const btn of chips.values()) {
      btn.classList.remove('is-selected', 'is-answer', 'is-guess');
      btn.disabled = false;
    }
    WorldMap.unlock();

    ui.guessBtn.disabled = true;
    ui.hint.textContent = 'Pick a region on the map, or from the list above.';
    ui.actionBar.hidden = false;
    ui.result.hidden = true;
    document.body.classList.remove('is-result');
  }

  function submitGuess() {
    if (state.phase !== 'guess' || !state.selected) return;
    state.phase = 'result';
    revealName(); // the round is over, so the answer is no longer a hint

    const fish = state.deck[state.index];
    const guess = REGIONS_BY_ID[state.selected];
    const answer = REGIONS_BY_ID[fish.region];
    const correct = guess.id === answer.id;
    const distance = correct ? 0 : Math.round(haversineKm(guess, answer));
    const points = scoreFor(distance);

    state.total += points;
    state.results.push({ fish, guess, answer, correct, distance, points });

    WorldMap.reveal(guess.id, answer.id);
    for (const [id, btn] of chips) {
      btn.disabled = true;
      btn.classList.remove('is-selected');
      btn.classList.toggle('is-answer', id === answer.id);
      btn.classList.toggle('is-guess', !correct && id === guess.id);
    }

    ui.score.textContent = fmt(state.total);
    ui.result.className = 'result ' + (correct ? 'is-correct' : distance <= 3000 ? 'is-close' : 'is-off');
    ui.verdict.textContent = correct ? 'Correct' : distance <= 3000 ? 'Close' : 'Not quite';
    ui.points.textContent = `+${fmt(points)}`;
    ui.resultLine.textContent = correct
      ? `The ${fish.name} is from ${withArticle(answer)}.`
      : `You said ${withArticle(guess)}. It's from ${withArticle(answer)} — ${fmt(distance)} km away.`;
    ui.resultFact.textContent = fish.fact;
    ui.nextBtn.textContent = state.index + 1 >= ROUNDS ? 'See final score' : 'Next fish';

    ui.actionBar.hidden = true;
    ui.result.hidden = false;
    // Lets the landscape layout reclaim the chip row for the result panel.
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
    const max = ROUNDS * MAX_POINTS;
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
    ui.endBlurb.textContent = `${hits} of ${ROUNDS} exactly right. ${grade}`;

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

      li.append(name, where, pts);
      ui.breakdown.append(li);
    }

    ui.overlay.hidden = false;
    ui.playAgain.focus();
  }

  function startGame() {
    state.deck = shuffle(FISH).slice(0, ROUNDS);
    state.index = 0;
    state.total = 0;
    state.results = [];
    ui.overlay.hidden = true;
    renderRound();
  }

  ui.photo.addEventListener('load', () => ui.photo.classList.add('is-ready'));
  ui.hintBtn.addEventListener('click', revealName);
  ui.guessBtn.addEventListener('click', submitGuess);
  ui.nextBtn.addEventListener('click', nextRound);
  ui.playAgain.addEventListener('click', startGame);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
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

  showVersion();
  WorldMap.build(ui.map, select);
  buildChips();
  const best = readBest();
  ui.best.textContent = best ? fmt(best) : '—';
  startGame();
})();
