/* Fishguesser — what each species is, for the mode filter.
 *
 * A game can be narrowed to part of the collection: fish only, crabs, sharks.
 * Rather than hang a `kind` on all 230 entries, the two groups that read off a
 * name reliably are matched by name — anything with "crab" in it is a crab,
 * anything with "shark", "dogfish" or "wobbegong" is a shark — with an
 * exception list for the names that lie. The animals that are neither fish nor
 * crabs are few enough to name outright.
 *
 * Adding a species: a new crab or shark is picked up by its name and needs
 * nothing here. Anything else that is not a fish — another cephalopod, a
 * mammal, a turtle — has to go in NOT_FISH, or "Fish only" will deal it. */

/* "Catshark" and "sawshark" are one word, so this deliberately matches inside a
 * word rather than on a boundary. */
const SHARK_NAME = /shark|dogfish|wobbegong/i;
const CRAB_NAME = /crab/i;

/* Names that lie: the bala shark is a carp with a dorsal fin and good PR. */
const NOT_SHARKS = new Set(['bala-shark']);

/* The collection's animals that are not fish and not crabs. Sharks and rays are
 * fish; a chimaera and a lamprey are fish. These are not. */
const NOT_FISH = new Set([
  'caribbean-reef-octopus',
  'blue-ringed-octopus',
  'common-cuttlefish',
  'beluga-whale',
]);

const isCrab = (fish) => CRAB_NAME.test(fish.name);
const isShark = (fish) => SHARK_NAME.test(fish.name) && !NOT_SHARKS.has(fish.id);
const isFish = (fish) => !isCrab(fish) && !NOT_FISH.has(fish.id);

/* The mode row of the filter, in the order it is shown. `test` is what a game
 * is dealt from; `short` is what fits on the tile in the top bar. */
const KIND_FILTERS = [
  { id: 'all', label: 'All sea life', short: 'All', test: () => true },
  { id: 'fish', label: 'Fish only', short: 'Fish', test: isFish },
  { id: 'crab', label: 'Crab mode', short: 'Crabs', test: isCrab },
  { id: 'shark', label: 'Shark mode', short: 'Sharks', test: isShark },
];

const KIND_BY_ID = KIND_FILTERS.reduce((acc, kind) => {
  acc[kind.id] = kind;
  return acc;
}, {});
