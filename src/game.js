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
    result: $('result'), verdict: $('verdict'), points: $('points'),
    resultLine: $('resultLine'), resultFact: $('resultFact'), nextBtn: $('nextBtn'),
    overlay: $('overlay'), finalScore: $('finalScore'), finalMax: $('finalMax'),
    endBlurb: $('endBlurb'), breakdown: $('breakdown'), playAgain: $('playAgainBtn'),
  };

  const state = { deck: [], index: 0, total: 0, selected: null, results: [], phase: 'guess' };
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
    ui.name.textContent = fish.name;
    ui.sci.textContent = fish.sciName;

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
  }

  function submitGuess() {
    if (state.phase !== 'guess' || !state.selected) return;
    state.phase = 'result';

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
      ? `The ${fish.name} is from the ${answer.name}.`
      : `You said ${guess.name}. It's from the ${answer.name} — ${fmt(distance)} km away.`;
    ui.resultFact.textContent = fish.fact;
    ui.nextBtn.textContent = state.index + 1 >= ROUNDS ? 'See final score' : 'Next fish';

    ui.actionBar.hidden = true;
    ui.result.hidden = false;
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
  ui.guessBtn.addEventListener('click', submitGuess);
  ui.nextBtn.addEventListener('click', nextRound);
  ui.playAgain.addEventListener('click', startGame);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (state.phase === 'guess' && state.selected) submitGuess();
    else if (state.phase === 'result') nextRound();
  });

  WorldMap.build(ui.map, select);
  buildChips();
  const best = readBest();
  ui.best.textContent = best ? fmt(best) : '—';
  startGame();
})();
