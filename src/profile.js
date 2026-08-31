/* Fishguesser — named saves and backup codes.
 *
 * There is no server behind this game, so a name cannot be an account: it is a
 * label on a slot in this browser's storage, which lets two people share a
 * browser without spending each other's pass. What does survive the browser is
 * the backup code — the whole save written out as text you can keep anywhere
 * and paste back after clearing site data, or on another device.
 *
 * The code carries a short hash of each fish id rather than the id itself, so
 * a 200-odd fish save stays a paste rather than a page, and restoring it can
 * still match the ids the game has now. Restoring merges: seen fish are
 * unioned and the best score is the higher of the two, so pasting an old code
 * can never cost you progress you already have. */

const PROFILE = (() => {
  const NAME_KEY = 'fishguesser.profile';
  // Set once a name has been used, which is what tells a first naming (adopt
  // the progress already in the unnamed slot) from a second person's.
  const ROSTER_KEY = 'fishguesser.profiles';
  const BEST_BASE = 'fishguesser.best';
  const SEEN_BASE = 'fishguesser.seen';
  const CODE_PREFIX = 'FG1.';
  const MAX_NAME = 24;

  const read = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null; // blocked storage: the game plays, nothing persists
    }
  };

  const write = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* nothing to do; this save just will not survive the tab */
    }
  };

  const clean = (value) => String(value || '').trim().slice(0, MAX_NAME);

  let name = clean(read(NAME_KEY));

  /** Storage key for the active save: the unnamed slot keeps the old keys. */
  const key = (base) => (name ? `${base}:${name}` : base);
  const bestKey = () => key(BEST_BASE);
  const seenKey = () => key(SEEN_BASE);

  const readSeenIds = () => {
    try {
      const raw = JSON.parse(read(seenKey()));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  };

  const readBestScore = () => {
    const n = Number(read(bestKey()));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  /* FNV-1a, base36, five characters. Ids are matched by hash on the way back
   * in, so the code does not have to spell out 220 names. */
  function shortId(id) {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i += 1) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36).padStart(5, '0').slice(-5);
  }

  const idsByHash = () => new Map(FISH.map((f) => [shortId(f.id), f.id]));

  /** Everything worth keeping, as one line of text. */
  function backupCode() {
    const payload = {
      v: 1,
      n: name,
      b: readBestScore(),
      s: readSeenIds().map(shortId),
    };
    const json = JSON.stringify(payload);
    // btoa only speaks latin-1, so a name with an accent in it has to be
    // percent-escaped down to bytes first.
    const bytes = unescape(encodeURIComponent(json));
    return CODE_PREFIX + window.btoa(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** Reads a code back. Returns null if it is not one of ours. */
  function decode(code) {
    const trimmed = String(code || '').trim();
    if (!trimmed.startsWith(CODE_PREFIX)) return null;
    try {
      const b64 = trimmed.slice(CODE_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(escape(window.atob(b64)));
      const payload = JSON.parse(json);
      if (!payload || payload.v !== 1 || !Array.isArray(payload.s)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  /* Merges a code into the active save. Nothing is thrown away: a fish seen in
   * either the code or the browser stays seen, and the best score is whichever
   * is higher, so a stale code cannot undo a good game. Hashes the code does
   * not recognise are simply dropped — a species removed since it was written. */
  function restore(code) {
    const payload = decode(code);
    if (!payload) return null;

    // A code carries the name it was made under. If this browser has no named
    // save yet, take it: restoring after a wipe should give the save its name
    // back, not leave the progress in an anonymous slot.
    if (!name && clean(payload.n)) setName(payload.n);

    const table = idsByHash();
    const fromCode = payload.s.map((h) => table.get(h)).filter(Boolean);
    const before = readSeenIds();
    const merged = [...new Set(before.concat(fromCode))];
    write(seenKey(), JSON.stringify(merged));

    const best = Math.max(readBestScore(), Number(payload.b) || 0);
    if (best > 0) write(bestKey(), String(best));

    return {
      name: clean(payload.n),
      seen: merged.length,
      added: merged.length - before.length,
      best,
      unknown: payload.s.length - fromCode.length,
    };
  }

  /* Naming a save for the first time takes the progress that is already here
   * with it — it is the same player, now with a label. A later name starts
   * empty, which is the point of having names at all. */
  function setName(next) {
    const wanted = clean(next);
    if (wanted === name) return name;

    const roster = (read(ROSTER_KEY) || '').split('\n').filter(Boolean);
    const firstEver = roster.length === 0;
    const seen = readSeenIds();
    const best = readBestScore();

    name = wanted;
    write(NAME_KEY, name);

    if (name) {
      if (!roster.includes(name)) roster.push(name);
      write(ROSTER_KEY, roster.join('\n'));
      if (firstEver && (seen.length || best)) {
        write(seenKey(), JSON.stringify(seen));
        if (best) write(bestKey(), String(best));
      }
    }
    return name;
  }

  return {
    get name() { return name; },
    setName,
    bestKey,
    seenKey,
    backupCode,
    decode,
    restore,
  };
})();
