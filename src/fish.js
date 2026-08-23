/* Fishguesser — the ten guessable fish.
 *
 * `region` must match an id in REGIONS (see regions.js). Photos live in
 * assets/fish/ and are all freely licensed; see CREDITS.md for attribution.
 * Adding an 11th fish is just a matter of appending to this array. */

const FISH = [
  {
    id: 'sockeye-salmon',
    name: 'Sockeye Salmon',
    sciName: 'Oncorhynchus nerka',
    image: 'assets/fish/sockeye-salmon.jpg',
    region: 'north-pacific',
    fact: 'Sockeye spend years at sea silver, then turn brilliant red with a green head to spawn in the same freshwater stream they hatched in.',
  },
  {
    id: 'queen-angelfish',
    name: 'Queen Angelfish',
    sciName: 'Holacanthus ciliaris',
    image: 'assets/fish/queen-angelfish.jpg',
    region: 'caribbean',
    fact: 'Named for the ringed blue "crown" on its forehead. It grazes mostly on sponges around Caribbean and Floridian reefs.',
  },
  {
    id: 'red-bellied-piranha',
    name: 'Red-bellied Piranha',
    sciName: 'Pygocentrus nattereri',
    image: 'assets/fish/red-bellied-piranha.jpg',
    region: 'amazon',
    fact: 'Far less bloodthirsty than its reputation — it mostly scavenges and eats insects, and shoals largely for protection from predators.',
  },
  {
    id: 'atlantic-cod',
    name: 'Atlantic Cod',
    sciName: 'Gadus morhua',
    image: 'assets/fish/atlantic-cod.jpg',
    region: 'north-atlantic',
    fact: 'Three dorsal fins and a whisker-like chin barbel it uses to taste the seabed. Centuries of fishing collapsed the Grand Banks stock in 1992.',
  },
  {
    id: 'gilt-head-bream',
    name: 'Gilt-head Bream',
    sciName: 'Sparus aurata',
    image: 'assets/fish/gilt-head-bream.jpg',
    region: 'mediterranean',
    fact: 'Named for the golden band between its eyes. Every one starts life male and some later become female — a trick called protandry.',
  },
  {
    id: 'goliath-tigerfish',
    name: 'Goliath Tigerfish',
    sciName: 'Hydrocynus goliath',
    image: 'assets/fish/goliath-tigerfish.jpg',
    region: 'congo',
    fact: 'Grows past 1.5 m and 50 kg, with 32 interlocking dagger teeth. It hunts by sight in fast, turbid water where few predators can.',
  },
  {
    id: 'electric-yellow-cichlid',
    name: 'Electric Yellow Cichlid',
    sciName: 'Labidochromis caeruleus',
    image: 'assets/fish/electric-yellow-cichlid.jpg',
    region: 'rift-lakes',
    fact: 'A mouthbrooder: the female carries her eggs and fry in her mouth for around three weeks, not eating the whole time.',
  },
  {
    id: 'mandarinfish',
    name: 'Mandarinfish',
    sciName: 'Synchiropus splendidus',
    image: 'assets/fish/mandarinfish.jpg',
    region: 'coral-triangle',
    fact: 'One of only two animals known to make blue with cellular pigment rather than structural colour. It has no scales — just toxic, foul-smelling slime.',
  },
  {
    id: 'barramundi',
    name: 'Barramundi',
    sciName: 'Lates calcarifer',
    image: 'assets/fish/barramundi.jpg',
    region: 'northern-australia',
    fact: 'Nearly all barramundi mature as males and change to female around five years old, so the biggest fish are almost always female.',
  },
  {
    id: 'antarctic-toothfish',
    name: 'Antarctic Toothfish',
    sciName: 'Dissostichus mawsoni',
    image: 'assets/fish/antarctic-toothfish.jpg',
    region: 'southern-ocean',
    fact: 'Its blood carries antifreeze glycoproteins that stop ice crystals growing, letting it live in water below the normal freezing point.',
  },
];
