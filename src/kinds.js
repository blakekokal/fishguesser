/* Fishguesser — what each species is, for the mode filter.
 *
 * A game can be narrowed to part of the collection: fish only, crabs, sharks.
 * Rather than hang a `kind` on all 230 entries, the two groups that read off a
 * name reliably are matched by name — anything with "crab" in it is a crab,
 * anything with "shark", "dogfish" or "wobbegong" is a shark — with an
 * exception list for the names that lie. The animals that are neither fish nor
 * crabs are few enough to name outright.
 *
 * "Fish mode" and "Sea life" cut the collection in two with nothing left over;
 * crab and shark mode are narrower cuts of the second. A shark or a ray is of
 * course a fish, but nobody choosing between fish and everything else means to
 * file it with the herrings, so both count as sea life here.
 *
 * Adding a species: a new crab or shark is picked up by its name and needs
 * nothing here. Anything else that is not a fish — another cephalopod, a
 * mammal, a turtle — has to go in NOT_FISH, or "Fish mode" will deal it. */

/* "Catshark" and "sawshark" are one word, so this deliberately matches inside a
 * word rather than on a boundary. */
const SHARK_NAME = /shark|dogfish|wobbegong/i;
const CRAB_NAME = /crab/i;
/* A ray, unlike the two above, is only ever a whole word — nothing in the
 * collection has "ray" buried in it, and a boundary keeps it that way. */
const RAY_NAME = /\bray\b|stingray|skate/i;

/* Names that lie: the bala shark is a carp with a dorsal fin and good PR, and
 * the horseshoe crab is closer to a spider than to anything in crab mode. */
const NOT_SHARKS = new Set(['bala-shark']);
const NOT_CRABS = new Set(['horseshoe-crab']);

/* The collection's animals that no rule above catches. A chimaera, a lamprey
 * and an eel are fish and stay in fish mode; these are not fish at all. */
const NOT_FISH = new Set([
  'caribbean-reef-octopus',
  'blue-ringed-octopus',
  'common-cuttlefish',
  'beluga-whale',
  'sea-angel',              // a snail that swims
  'peacock-mantis-shrimp',
  'antarctic-cushion-star',
  'spanish-dancer',         // a sea slug that swims like a cape
  'giant-river-prawn',
  'lions-mane-jellyfish',
  'freshwater-jellyfish',
  'pink-river-dolphin',
  'leopard-seal',
  'portuguese-man-o-war',   // a colony of four kinds of animal, no less a not-fish
  'irrawaddy-dolphin',
  'rusty-crayfish',
  'aubrys-flapshell-turtle',
  'matamata',
  'crown-of-thorns-starfish',
  'antarctic-krill',
  'horseshoe-crab',         // excluded from crabs above, so it needs saying here
]);

const isCrab = (fish) => CRAB_NAME.test(fish.name) && !NOT_CRABS.has(fish.id);
const isShark = (fish) => SHARK_NAME.test(fish.name) && !NOT_SHARKS.has(fish.id);
const isRay = (fish) => RAY_NAME.test(fish.name);

/* Everything a player would not call a fish — what the "Sea life" mode deals.
 * Its opposite is fish mode, so between the two nothing goes undealt. */
const isOther = (fish) => (
  isCrab(fish) || isShark(fish) || isRay(fish) || NOT_FISH.has(fish.id)
);
const isFish = (fish) => !isOther(fish);

/* The mode row of the filter, in the order it is shown. `test` is what a game
 * is dealt from; `short` is what fits on the tile in the top bar. */
const KIND_FILTERS = [
  { id: 'all', label: 'All', short: 'All', test: () => true },
  { id: 'fish', label: 'Fish mode', short: 'Fish', test: isFish },
  { id: 'other', label: 'Sea life', short: 'Sea life', test: isOther },
  { id: 'crab', label: 'Crab mode', short: 'Crabs', test: isCrab },
  { id: 'shark', label: 'Shark mode', short: 'Sharks', test: isShark },
];

const KIND_BY_ID = KIND_FILTERS.reduce((acc, kind) => {
  acc[kind.id] = kind;
  return acc;
}, {});
