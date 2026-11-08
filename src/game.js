/* Fishguesser — game loop.
 *
 * Five rounds drawn at random from the fish list — or, in the two zone games,
 * five from five different regions, or one from every region with each region
 * greyed out on the map once its animal has come up. Each round shows one fish and
 * you pick the region it comes from: an exact hit is worth MAX_POINTS, and a
 * miss earns partial credit that decays with the distance between the region
 * you picked and the right one. */

(() => {
  // A classic game, and a Five zones game. Zone elimination plays one round
  // per region instead, so the length of a game is read off its deck.
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
  /* Zone elimination is sixteen rounds to the others' five, so its scores are
   * not comparable and it keeps a best of its own. Five zones is the same
   * length as a classic game and shares that one. */
  const BEST_KEY = () => PROFILE.bestKey()
    + ({ elimination: ':elimination', lives: ':lives' }[state.filter.game] || '');
  // 3 lives: misses allowed before the game is over.
  const LIVES = 3;
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

  /* How a game's rounds are spread over the map. `classic` is how the game has
   * always dealt and stays the default. `spread` deals five fish from five
   * different regions, so no region is the answer twice in one game.
   * `elimination` deals one fish from every region the mode has a species in,
   * and each region goes grey on the map once its animal has come up, so the
   * board narrows as the game goes on. */
  const GAME_TYPES = [
    { id: 'classic', label: 'Classic', short: 'Classic',
      desc: 'Five rounds drawn at random from anywhere.' },
    { id: 'spread', label: 'Five zones', short: 'Five zones',
      desc: 'Five rounds from five different regions — no region is the answer twice.' },
    { id: 'elimination', label: 'Zone elimination', short: 'Elimination',
      desc: 'One round per region. Each region greys out once its animal has come up.' },
    { id: 'lives', label: '3 lives', short: '3 lives',
      desc: 'Endless. A wrong region costs a life and you stay on that animal, told whether you were on the border or nowhere close. Lose all three and it is over.' },
  ];
  const GAME_BY_ID = Object.fromEntries(GAME_TYPES.map((g) => [g.id, g]));

  /* Regions Zone elimination leaves out, grey from the first round. A region
   * with only a couple of species would repeat one of them every game from
   * the third on, since elimination has to deal from every region it plays;
   * so a region sits here until it has enough species to carry a round.
   * Classic and Five zones still deal from it. */
  const ELIMINATION_SKIP = new Set(['south-atlantic']);

  const $ = (id) => document.getElementById(id);
  const ui = {
    round: $('roundValue'), score: $('scoreValue'), best: $('bestValue'),
    hints: $('hintsValue'),
    photo: $('fishPhoto'), photoBg: $('fishPhotoBg'), credit: $('photoCredit'),
    name: $('fishName'), sci: $('fishSci'), fact: $('fishFact'),
    map: $('map'),
    actionBar: $('actionBar'), hint: $('hint'), guessBtn: $('guessBtn'),
    hintBtn: $('hintBtn'), halfBtn: $('halfBtn'), factBtn: $('factBtn'),
    promptText: $('promptText'),
    result: $('result'), verdict: $('verdict'), points: $('points'),
    resultBonus: $('resultBonus'),
    resultLine: $('resultLine'), resultFact: $('resultFact'), nextBtn: $('nextBtn'),
    version: $('version'), speciesCount: $('speciesCount'),
    startBtn: $('startBtn'), startFishCount: $('startFishCount'),
    roundGate: $('roundGate'),
    seen: $('seenValue'),
    resetBest: $('resetBestBtn'), resetSeen: $('resetSeenBtn'),
    topName: $('topName'),
    modeBtn: $('modeBtn'), modeFlag: $('modeFlag'), modeDesc: $('modeDesc'),
    filterBtn: $('filterBtn'), filterFlag: $('filterFlag'),
    settingsBtn: $('settingsBtn'),
    filterPoolRow: $('filterPoolRow'), filterKindRow: $('filterKindRow'),
    filterGameRow: $('filterGameRow'),
    startRounds: $('startRounds'), startPerfect: $('startPerfect'),
    startFoot: $('startFoot'), roundLabel: $('roundLabel'),
    startScoring: document.querySelectorAll('[data-scoring]'),
    startPerfectRounds: document.querySelectorAll('.start-perfect-n'),
    profileName: $('profileName'), profileSave: $('profileSaveBtn'),
    profileNote: $('profileNote'), backup: $('backupBtn'),
    restore: $('restoreBtn'), backupCode: $('backupCode'),
    overlay: $('overlay'), finalScore: $('finalScore'), finalMax: $('finalMax'),
    endBlurb: $('endBlurb'), breakdown: $('breakdown'), playAgain: $('playAgainBtn'),
  };

  const state = {
    deck: [], index: 0, total: 0, selected: null, results: [],
    phase: 'guess', nameRevealed: false, halfShown: false, factShown: false,
    hintsLeft: HINTS_PER_GAME,
    // Regions greyed out in Zone elimination: answered, or never in the deck.
    // In 3 lives: the regions already guessed wrong for the animal on screen.
    out: new Set(),
    // 3 lives: lives left, animals placed, and misses on the current animal.
    lives: LIVES, found: 0, misses: 0,
    // Overwritten from storage before the first deal; these are the defaults.
    filter: { kind: 'all', pool: 'unseen', game: 'classic' },
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
      const game = GAME_BY_ID[raw && raw.game] ? raw.game : 'classic';
      return { kind, pool, game };
    } catch {
      return { kind: 'all', pool: 'unseen', game: 'classic' };
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

  /* The two zone games deal by region rather than from one heap: a fish is
   * drawn from each chosen region, preferring what the pool setting prefers
   * (the unseen ones, by default), and falling back to anything from that
   * region rather than skipping it. Regions that still have a preferred fish
   * are chosen first, so the pass keeps moving.
   *
   * `count` is how many regions to draw from; null means every region the
   * mode has a species in, which is Zone elimination. A narrow mode with fewer
   * regions than rounds — a handful of crabs, say — tops up from the rest of
   * the pool, since a game is always the full five. */
  function dealByZone(count) {
    const pool = kindPool();
    const seenSet = new Set(readSeen());
    const mode = state.filter.pool;

    // A spent pass turns over here just as it does in a classic deal.
    if (mode === 'unseen' && state.filter.kind === 'all'
        && pool.every((f) => seenSet.has(f.id))) {
      writeSeen([]);
      seenSet.clear();
    }

    const byZone = new Map();
    for (const f of pool) {
      if (count == null && ELIMINATION_SKIP.has(f.region)) continue;
      if (!byZone.has(f.region)) byZone.set(f.region, []);
      byZone.get(f.region).push(f);
    }
    const prefer = (list) => {
      if (mode === 'any') return list;
      if (mode === 'seen') return list.filter((f) => seenSet.has(f.id));
      return list.filter((f) => !seenSet.has(f.id));
    };
    const zones = shuffle([...byZone.entries()])
      .map(([id, all]) => ({ id, all, best: prefer(all) }));
    // Stable, so regions stay shuffled among themselves on either side.
    zones.sort((a, b) => Number(b.best.length > 0) - Number(a.best.length > 0));

    const chosen = count == null ? zones : zones.slice(0, count);
    const hand = chosen.map((z) => shuffle(z.best.length ? z.best : z.all)[0]);
    if (count != null && hand.length < count) {
      const dealt = new Set(hand.map((f) => f.id));
      const rest = pool.filter((f) => !dealt.has(f.id));
      hand.push(...take(rest.length ? rest : pool, count - hand.length));
    }
    return shuffle(hand);
  }

  /** A game's deck, by whichever kind of game is being played. */
  function deal() {
    if (state.filter.game === 'lives') return dealFish(1);
    if (state.filter.game === 'spread') return dealByZone(ROUNDS);
    if (state.filter.game === 'elimination') return dealByZone(null);
    return dealFish(ROUNDS);
  }

  /** How many rounds a game of the current kind would have, before dealing. */
  function roundsFor(game) {
    if (game === 'lives') return Infinity;
    if (game !== 'elimination') return ROUNDS;
    return new Set(kindPool().map((f) => f.region)
      .filter((id) => !ELIMINATION_SKIP.has(id))).size;
  }

  const rounds = () => state.deck.length;

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

  /* The free step: hand back half the letters, scattered through the name
   * rather than taken off one end. Giving back a whole word handed over a word
   * — often the one that names the place — while this leaves every word partly
   * standing, so the name has to be worked out from its shape. Which half is
   * drawn fresh each time, and a round only ever asks once. */
  function halfMaskName(name) {
    const chars = Array.from(name);
    const spots = chars.map((c, i) => i).filter((i) => chars[i].trim() !== '');
    // Fisher-Yates, so every letter has the same chance of being one shown.
    for (let i = spots.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    const shown = new Set(spots.slice(0, Math.ceil(spots.length / 2)));
    return chars.map((c, i) => (c.trim() === '' || shown.has(i) ? c : '•')).join('');
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
    /* The fact is free and separate from the name: revealing the name does not
     * take it away, and it only goes once the round is over, when the result
     * card prints the fact whole. */
    ui.factBtn.hidden = state.factShown || state.phase !== 'guess';
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

  /* Free, and costs no bonus either: the fact says what the animal does, which
   * is a clue to where it lives rather than what it is called. It starts folded
   * away so the photograph has the panel to itself. */
  function showFact() {
    if (state.factShown) return;
    state.factShown = true;
    ui.fact.hidden = false;
    updateHintButton();
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

    if (lives()) {
      // A fresh animal: every region is back in play and the misses reset.
      state.out = new Set();
      state.misses = 0;
      renderLives();
      ui.score.textContent = fmt(state.found);
    } else {
      ui.roundLabel.textContent = 'Round';
      ui.round.removeAttribute('aria-label');
      ui.round.textContent = `${state.index + 1} / ${rounds()}`;
      ui.score.textContent = fmt(state.total);
    }

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
    ui.fact.hidden = true;
    state.factShown = false;
    state.nameRevealed = false;
    state.halfShown = false;
    updateHintButton();
    ui.promptText.textContent = 'Where in the world does it live?';
    ui.promptText.classList.remove('is-near', 'is-far');

    /* Loaded now but kept hidden until the guess is in: photographer names and
     * institutions ("Auckland War Memorial Museum") can give the region away.
     * Full attribution also lives in CREDITS.md, linked in the footer. */
    const credit = typeof PHOTO_CREDITS !== 'undefined' ? PHOTO_CREDITS[fish.id] : null;
    ui.credit.textContent = credit ? `${credit.author} · ${credit.license}` : '';
    ui.credit.hidden = true;

    WorldMap.setOut(state.out);
    WorldMap.unlock();

    ui.guessBtn.disabled = true;
    ui.hint.textContent = 'Pick a region on the map.';
    ui.actionBar.hidden = false;
    ui.result.hidden = true;
    document.body.classList.remove('is-result');

    // The first round of a game is dealt under the cover; beginPlay marks it.
    if (!waiting()) markSeen(fish);
  }

  const lives = () => state.filter.game === 'lives';

  /** The Round tile becomes the lives left, as hearts, in 3 lives. */
  function renderLives() {
    ui.roundLabel.textContent = 'Lives';
    ui.round.replaceChildren();
    const hearts = document.createElement('span');
    hearts.className = 'lives-hearts';
    hearts.textContent = '\u2665'.repeat(state.lives) + '\u2661'.repeat(LIVES - state.lives);
    ui.round.append(hearts);
    ui.round.setAttribute('aria-label', `${state.lives} of ${LIVES} lives left`);
  }

  /* 3 lives. A wrong region costs a life, greys that region out for this
   * animal, and says how near it was — "on the border" when the guessed
   * region's section touches the right one on the map, "nowhere close" when
   * it does not — and the player goes again on the same animal. The round
   * ends when they find it, or on the last life. */
  function submitLivesGuess() {
    const fish = state.deck[state.index];
    const guess = REGIONS_BY_ID[state.selected];
    const answer = REGIONS_BY_ID[fish.region];
    const correct = guess.id === answer.id;

    if (!correct) {
      state.lives -= 1;
      state.misses += 1;
      renderLives();
      if (state.lives > 0) {
        state.out.add(guess.id);
        state.selected = null;
        WorldMap.setSelected(null);
        WorldMap.setOut(state.out);
        ui.guessBtn.disabled = true;
        const near = WorldMap.bordering(guess.id, answer.id);
        const left = `${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left`;
        ui.promptText.textContent = near
          ? `On the border — not ${withArticle(guess)}, but right next to it. ${left}.`
          : `Nowhere close — it isn't anywhere near ${withArticle(guess)}. ${left}.`;
        ui.promptText.classList.toggle('is-near', near);
        ui.promptText.classList.toggle('is-far', !near);
        ui.hint.textContent = 'Pick another region.';
        return;
      }
    }

    state.phase = 'result';
    revealName();
    ui.credit.hidden = !ui.credit.textContent;
    ui.fact.hidden = true;
    if (correct) state.found += 1;
    state.results.push({ fish, guess, answer, correct, misses: state.misses });

    WorldMap.reveal(guess.id, answer.id);
    ui.score.textContent = fmt(state.found);
    ui.result.className = 'result ' + (correct ? 'is-correct' : 'is-off');
    const missNote = state.misses === 1 ? 'after 1 miss' : `after ${state.misses} misses`;
    ui.verdict.textContent = correct
      ? (state.misses ? `Found it, ${missNote}` : 'Correct')
      : 'Out of lives';
    ui.points.textContent = correct ? '+1' : '';
    ui.resultLine.textContent = correct
      ? `The ${fish.name} is from ${withArticle(answer)}.`
      : `You said ${withArticle(guess)}. The ${fish.name} is from ${withArticle(answer)}.`;
    ui.resultBonus.hidden = true;
    ui.resultFact.textContent = fish.fact;
    ui.nextBtn.textContent = state.lives > 0 ? 'Next one' : 'See final score';

    ui.actionBar.hidden = true;
    ui.result.hidden = false;
    document.body.classList.add('is-result');
    ui.nextBtn.focus();
  }

  function submitGuess() {
    if (state.phase !== 'guess' || !state.selected) return;
    if (lives()) return submitLivesGuess();
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
    /* Zone elimination: this region has had its turn. It stays lit as the
     * answer for now and goes grey when the next round is drawn. */
    if (state.filter.game === 'elimination') state.out.add(answer.id);

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
    ui.nextBtn.textContent = state.index + 1 >= rounds() ? 'See final score' : 'Next one';

    ui.actionBar.hidden = true;
    ui.result.hidden = false;
    document.body.classList.add('is-result');
    ui.nextBtn.focus();
  }

  function nextRound() {
    if (lives()) {
      if (state.lives <= 0) return endGame();
      /* Endless: the next animal is dealt only now, once the last one has been
       * marked seen, so the pass never hands back the one just played. */
      // "Seen only" and "Any" draw at random, so they could deal the animal
      // just played straight back; a few redraws keep it from following itself.
      const last = state.deck[state.index];
      let next = dealFish(1);
      for (let i = 0; i < 5 && next[0] && last && next[0].id === last.id; i++) next = dealFish(1);
      state.deck.push(...next);
      state.index += 1;
      return renderRound();
    }
    if (state.index + 1 >= rounds()) return endGame();
    state.index += 1;
    renderRound();
  }

  const perfectScore = (n) => n * (MAX_POINTS + NO_PEEK_BONUS)
    + HINTS_PER_GAME * SAVED_HINT_BONUS;

  /* 3 lives has no points: the score is how many animals were placed. */
  function endLivesGame() {
    const best = Math.max(readBest(), state.found);
    if (best) writeBest(best);
    ui.best.textContent = best ? fmt(best) : '—';
    ui.resetBest.disabled = !best;
    ui.finalScore.textContent = fmt(state.found);
    ui.finalMax.textContent = state.found === 1 ? ' animal found' : ' animals found';
    const firstTry = state.results.filter((r) => r.correct && !r.misses).length;
    const grade =
      state.found >= 40 ? 'Marine biologist behaviour.' :
      state.found >= 20 ? 'Strong instincts for fish.' :
      state.found >= 8 ? 'Not bad — the oceans are big.' :
      'Plenty of sea left to learn.';
    const placed = state.found === 0
      ? 'None placed before the third miss.'
      : `${fmt(firstTry)} of them first time.`;
    ui.endBlurb.textContent = `${placed} ${grade}`;

    ui.breakdown.replaceChildren();
    for (const r of state.results) {
      const li = document.createElement('li');
      li.className = 'breakdown-row' + (r.correct && !r.misses ? ' is-correct' : '');
      const name = document.createElement('span');
      name.className = 'breakdown-fish';
      name.textContent = r.fish.name;
      const where = document.createElement('span');
      where.className = 'breakdown-where';
      where.textContent = r.answer.name
        + (r.misses ? `  ·  ${r.misses} ${r.misses === 1 ? 'miss' : 'misses'}` : '');
      const mark = document.createElement('span');
      mark.className = 'breakdown-points';
      mark.textContent = r.correct ? '\u2713' : '\u2717';
      li.append(name, where, mark);
      ui.breakdown.append(li);
    }
    ui.overlay.hidden = false;
    ui.playAgain.focus();
  }

  function endGame() {
    state.phase = 'over';
    if (lives()) return endLivesGame();

    // Unspent hints cash out here, so saving all three is worth 1,500.
    const savedBonus = state.hintsLeft * SAVED_HINT_BONUS;
    state.total += savedBonus;
    ui.score.textContent = fmt(state.total);

    const max = perfectScore(rounds());
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
    ui.endBlurb.textContent = `${hits} of ${rounds()} exactly right.${cleanNote} ${grade}`;

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
    GAME_TYPES.forEach((g) => add(ui.filterGameRow, g.id, 'game', g.label));
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

    for (const btn of document.querySelectorAll('.menus .filter-opt')) {
      const { group, id } = btn.dataset;
      const on = state.filter[group] === id;
      /* The game row counts rounds, not species: what changes between its
       * options is how long a game is, not what it is dealt from. */
      if (group === 'game') {
        const n = roundsFor(id);
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', String(on));
        btn.title = n === Infinity ? 'Endless, until the third miss' : `${n} rounds`;
        btn.querySelector('.filter-n').textContent = fmt(n);
        continue;
      }
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
    /* The flag is the whole of the filter that shows with the panel shut, so it
     * appears exactly when a game is dealt from less than the default: the mode
     * if one is on, otherwise the part of the pass. */
    const game = GAME_BY_ID[state.filter.game];
    /* Each menu flags itself when it is off its default, so a closed panel is
     * never the only place a narrowed game is written down. */
    ui.modeFlag.hidden = state.filter.game === 'classic';
    ui.modeFlag.textContent = game.short;
    ui.modeBtn.title = `Mode: ${game.label}`;
    ui.modeDesc.textContent = game.desc;
    const flags = [];
    if (state.filter.kind !== 'all') flags.push(kind.short);
    if (state.filter.pool !== 'unseen') flags.push(poolFilter.short);
    ui.filterFlag.hidden = !flags.length;
    ui.filterFlag.textContent = flags.join(' · ');
    ui.filterBtn.title =
      `Dealing from ${kind.label.toLowerCase()}, ${poolFilter.label.toLowerCase()}`;
    ui.startFishCount.textContent = state.filter.kind === 'all'
      ? `all ${fmt(pool.length)} species`
      : `the ${fmt(pool.length)} in ${kind.label.toLowerCase()}`;

    /* The rules card says how long this game is and what a perfect one is. */
    const n = roundsFor(state.filter.game);
    const livesMode = state.filter.game === 'lives';
    ui.startScoring.forEach((el) => { el.hidden = livesMode; });
    if (!startFootHtml) startFootHtml = ui.startFoot.innerHTML;
    if (livesMode) {
      ui.startFoot.textContent = 'Three lives. A wrong region costs one and you '
        + 'stay on that animal until you place it, told whether you were on the '
        + 'border of the right region or nowhere close. Your score is how many you '
        + 'place before the third miss.';
      ui.startRounds.textContent = 'One animal after another,';
      return;
    }
    if (ui.startFoot.innerHTML !== startFootHtml) {
      ui.startFoot.innerHTML = startFootHtml;
      ui.startPerfect = $('startPerfect');
      ui.startPerfectRounds = document.querySelectorAll('.start-perfect-n');
    }
    ui.startRounds.textContent = {
      classic: 'Five rounds',
      spread: 'Five rounds, each from a different region,',
      elimination: `One round per region, ${n} in all, each region greying out on the map once its animal has come up,`,
    }[state.filter.game];
    ui.startPerfect.textContent = fmt(perfectScore(n));
    ui.startPerfectRounds.forEach((el) => { el.textContent = n === 5 ? 'five' : fmt(n); });
  }

  let startFootHtml = null; // the perfect-score line, put back after 3 lives

  /* A game is five fish dealt at once, so a new pool means a new game rather
   * than a hand half from each. The panel says so before it is touched. */
  function setFilter(group, id) {
    if (state.filter[group] === id) return closeSettings();
    state.filter[group] = id;
    writeFilter();
    closeSettings();
    renderFilter();
    startGame();
    renderSeen();
    if (group === 'game') renderStored(); // elimination keeps its own best
  }

  /* The three menus on the bar. Only one is open at a time: opening one puts
   * the others away, as a click anywhere else does. */
  const MENUS = [...document.querySelectorAll('.menus .menu')].map((root) => ({
    root,
    btn: root.querySelector('.settings-btn'),
    panel: root.querySelector('.settings-panel'),
  }));

  function openMenu(menu) {
    closeSettings();
    renderFilter(); // counts move as the pass does, so they are read on opening
    menu.panel.hidden = false;
    menu.btn.setAttribute('aria-expanded', 'true');
    /* A panel hangs right-aligned under its button, which is right when the
     * menus sit at the right of the bar. If the bar ever wraps them onto a row
     * of their own on the left, that would hang it off the edge of the
     * screen, so it is nudged back inside. */
    menu.panel.style.translate = '';
    const r = menu.panel.getBoundingClientRect();
    const edge = 8;
    let dx = 0;
    if (r.left < edge) dx = edge - r.left;
    else if (r.right > window.innerWidth - edge) dx = window.innerWidth - edge - r.right;
    if (dx) menu.panel.style.translate = `${dx}px 0`;
  }

  function closeSettings() {
    for (const m of MENUS) {
      m.panel.hidden = true;
      m.btn.setAttribute('aria-expanded', 'false');
    }
  }

  const openMenuOf = () => MENUS.find((m) => !m.panel.hidden);
  const settingsOpen = () => Boolean(openMenuOf());

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
   * and 0 under the cover, where nothing has been shown yet. */
  function resetSeen() {
    /* It wipes the whole pass for this save, and there is no undo, so it asks
     * first and says how much would go. */
    const n = readSeen().length;
    if (!n) return;
    const ok = window.confirm(
      `Reset seen fish? The ${fmt(n)} species you have seen this pass can all come up again.`);
    if (!ok) return;
    writeSeen([]);
    if (!waiting()) markSeen(state.deck[state.index]);
    renderSeen();
  }

  /* Whether a dealt game is still waiting to be asked for. While it is, the
   * fish panel is covered (see .round-gate in styles.css) and nothing in it
   * counts as seen — which is what keeps opening the page, or changing what
   * the game deals from, from spending a fish nobody looked at. */
  const waiting = () => document.body.classList.contains('is-waiting');

  /* The rules take this panel over before every game. They are a panel and not
   * a dialog on purpose: the map stays on screen beside them, so the page the
   * game is played on is the page the rules are read on. */
  function holdForStart() {
    document.body.classList.add('is-waiting');
    ui.roundGate.hidden = false;
    ui.roundGate.scrollTop = 0;
    // preventScroll: focusing the button would otherwise scroll the rules
    // straight down to it, landing the player halfway through the text.
    ui.startBtn.focus({ preventScroll: true });
  }

  /* Hands the panel back to the round. Dealing again here would throw away the
   * photo that has been loading meanwhile, so this only reveals what is
   * already waiting. */
  function beginPlay() {
    if (!waiting()) return;
    ui.roundGate.hidden = true;
    document.body.classList.remove('is-waiting');
    markSeen(state.deck[state.index]); // now it is actually being looked at
  }

  /* Every game starts the same way — from the page opening, from Play again,
   * and from the filter changing — so every game goes under the cover. */
  function startGame() {
    state.deck = deal();
    state.lives = LIVES;
    state.found = 0;
    state.misses = 0;
    /* In Zone elimination a region with nothing in this deck — one the mode
     * has no species in — is out before the first round. */
    const inDeck = new Set(state.deck.map((f) => f.region));
    state.out = new Set(state.filter.game === 'elimination'
      ? REGIONS.map((r) => r.id).filter((id) => !inDeck.has(id))
      : []);
    state.index = 0;
    state.total = 0;
    state.results = [];
    state.hintsLeft = HINTS_PER_GAME;
    renderHints();
    ui.overlay.hidden = true;
    /* The cover goes on before the round is drawn, not after: renderRound
     * marks what it draws as seen unless the cover is already over it. */
    holdForStart();
    renderRound();
  }

  ui.photo.addEventListener('load', () => ui.photo.classList.add('is-ready'));
  ui.photoBg.addEventListener('load', () => ui.photoBg.classList.add('is-ready'));
  /* Photos are fetched from Wikimedia at play time, so a slow or blocked
   * network is a real possibility. Say so rather than leaving an empty frame —
   * the round is still playable, since the name and the map carry the puzzle. */
  ui.photo.addEventListener('error', () => ui.photo.classList.add('is-broken'));
  ui.factBtn.addEventListener('click', showFact);
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
  for (const m of MENUS) {
    m.btn.addEventListener('click',
      () => (m.panel.hidden ? openMenu(m) : closeSettings()));
  }
  /* A click anywhere else puts the panel away, which is what a popover is
   * expected to do; the button's own click is left to the toggle above. */
  document.addEventListener('click', (e) => {
    if (!settingsOpen()) return;
    if (e.target.closest('.settings')) return;
    closeSettings();
  });
  ui.backup.addEventListener('click', showBackup);
  ui.restore.addEventListener('click', restoreBackup);
  ui.resetBest.addEventListener('click', resetBest);
  ui.resetSeen.addEventListener('click', resetSeen);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsOpen()) {
      const open = openMenuOf();
      closeSettings();
      open.btn.focus();
      return;
    }
    if (e.key !== 'Enter') return;
    // Settings are open: Enter belongs to whatever is focused inside the panel,
    // not to the game behind it.
    if (settingsOpen()) return;
    // Enter starts the game while one is waiting under the cover; the round is
    // already dealt, so it must not also lock in a guess on the same press.
    if (waiting()) {
      // Enter on a focused reset button already presses it; starting the game
      // off the same keystroke would carry the player straight out of the rules.
      if (e.target === ui.resetBest || e.target === ui.resetSeen) return;
      // Same for the save block: naming a save or pasting a code is not a
      // request to start playing.
      if (e.target === ui.profileName || e.target === ui.backupCode) return;
      if (e.target === ui.topName) return;
      if (MENUS.some((m) => e.target === m.btn)) return;
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
  /* Deals the first round behind the rules, so its photo is fetched while they
   * are being read. */
  startGame();
  renderSeen();
  renderProfile();
})();
