/* Fishguesser — build stamp, shown in the top bar.
 *
 * This is the one place the version lives; the header reads it at load time.
 * Bump it with `python3 tools/bump_version.py [major|minor|patch]`, which also
 * stamps today's date, rather than editing the numbers by hand. */

const APP_VERSION = {
  version: '2.30.0',
  date: '2026-08-27',
};
