/* Fishguesser — the guessable fish, grouped by home region.
 *
 * `region` must match an id in REGIONS (see regions.js); several fish share a
 * region, which is what makes the map worth reading rather than memorising.
 * Photos live in assets/fish/ and are all freely licensed; see CREDITS.md for
 * attribution. Adding another fish is just a matter of appending to this array.
 *
 * Species are picked so their natural range genuinely centres on the region
 * they are filed under — a widespread Indo-Pacific fish would make for an
 * unfair round. */

const FISH = [
  // ---- North Pacific ----
  {
    id: 'sockeye-salmon',
    name: 'Sockeye Salmon',
    sciName: 'Oncorhynchus nerka',
    image: 'assets/fish/sockeye-salmon.jpg',
    region: 'north-pacific',
    fact: 'Sockeye spend years at sea silver, then turn brilliant red with a green head to spawn in the same freshwater stream they hatched in.',
  },
  {
    id: 'yelloweye-rockfish',
    name: 'Yelloweye Rockfish',
    sciName: 'Sebastes ruberrimus',
    image: 'assets/fish/yelloweye-rockfish.jpg',
    region: 'north-pacific',
    fact: 'One of the longest-lived fish in the world — individuals over 100 years old have been aged. Growing that slowly makes the species very slow to recover from fishing.',
  },
  {
    id: 'lingcod',
    name: 'Lingcod',
    sciName: 'Ophiodon elongatus',
    image: 'assets/fish/lingcod.jpg',
    region: 'north-pacific',
    fact: 'Not a cod at all, but a greenling. Roughly one in five has startling blue-green flesh from a harmless pigment that cooks away white.',
  },

  // ---- Caribbean Sea ----
  {
    id: 'queen-angelfish',
    name: 'Queen Angelfish',
    sciName: 'Holacanthus ciliaris',
    image: 'assets/fish/queen-angelfish.jpg',
    region: 'caribbean',
    fact: 'Named for the ringed blue "crown" on its forehead. It grazes mostly on sponges around Caribbean and Floridian reefs.',
  },
  {
    id: 'nassau-grouper',
    name: 'Nassau Grouper',
    sciName: 'Epinephelus striatus',
    image: 'assets/fish/nassau-grouper.jpg',
    region: 'caribbean',
    fact: 'Gathers by the thousand to spawn at the same reefs each winter full moon — predictable enough that fishing collapsed the species to critically endangered.',
  },
  {
    id: 'stoplight-parrotfish',
    name: 'Stoplight Parrotfish',
    sciName: 'Sparisoma viride',
    image: 'assets/fish/stoplight-parrotfish.jpg',
    region: 'caribbean',
    fact: 'Scrapes algae off coral with a beak of fused teeth and excretes the ground-up rock as fine white sand — a single fish can make hundreds of kilos of beach a year.',
  },

  // ---- Amazon Basin ----
  {
    id: 'red-bellied-piranha',
    name: 'Red-bellied Piranha',
    sciName: 'Pygocentrus nattereri',
    image: 'assets/fish/red-bellied-piranha.jpg',
    region: 'amazon',
    fact: 'Far less bloodthirsty than its reputation — it mostly scavenges and eats insects, and shoals largely for protection from predators.',
  },
  {
    id: 'arapaima',
    name: 'Arapaima',
    sciName: 'Arapaima gigas',
    image: 'assets/fish/arapaima.jpg',
    region: 'amazon',
    fact: 'One of the largest freshwater fish alive, past three metres. It breathes air through a lung-like swim bladder and drowns if kept from the surface.',
  },
  {
    id: 'discus',
    name: 'Discus',
    sciName: 'Symphysodon aequifasciatus',
    image: 'assets/fish/discus.jpg',
    region: 'amazon',
    fact: 'Both parents grow a nutritious skin mucus that their fry graze on for the first few weeks — a fish equivalent of nursing.',
  },

  // ---- North Atlantic ----
  {
    id: 'atlantic-cod',
    name: 'Atlantic Cod',
    sciName: 'Gadus morhua',
    image: 'assets/fish/atlantic-cod.jpg',
    region: 'north-atlantic',
    fact: 'Three dorsal fins and a whisker-like chin barbel it uses to taste the seabed. Centuries of fishing collapsed the Grand Banks stock in 1992.',
  },
  {
    id: 'atlantic-wolffish',
    name: 'Atlantic Wolffish',
    sciName: 'Anarhichas lupus',
    image: 'assets/fish/atlantic-wolffish.jpg',
    region: 'north-atlantic',
    fact: 'Crushes sea urchins and clams with conical fangs, and makes its own antifreeze so its blood keeps flowing in near-freezing water.',
  },
  {
    id: 'atlantic-mackerel',
    name: 'Atlantic Mackerel',
    sciName: 'Scomber scombrus',
    image: 'assets/fish/atlantic-mackerel.jpg',
    region: 'north-atlantic',
    fact: 'Has no swim bladder, so it must keep swimming or sink. The wavy black bars across its back are as individual as a fingerprint.',
  },

  // ---- Mediterranean Sea ----
  {
    id: 'gilt-head-bream',
    name: 'Gilt-head Bream',
    sciName: 'Sparus aurata',
    image: 'assets/fish/gilt-head-bream.jpg',
    region: 'mediterranean',
    fact: 'Named for the golden band between its eyes. Every one starts life male and some later become female — a trick called protandry.',
  },
  {
    id: 'dusky-grouper',
    name: 'Dusky Grouper',
    sciName: 'Epinephelus marginatus',
    image: 'assets/fish/dusky-grouper.jpg',
    region: 'mediterranean',
    fact: 'A long-lived rocky-reef ambusher that holds the same territory for years. All are born female and the largest turn male around age twelve.',
  },
  {
    id: 'european-seabass',
    name: 'European Seabass',
    sciName: 'Dicentrarchus labrax',
    image: 'assets/fish/european-seabass.jpg',
    region: 'mediterranean',
    fact: 'A fast coastal hunter that pushes far into brackish lagoons and river mouths, tolerating water from nearly fresh to fully salt.',
  },

  // ---- Congo Basin ----
  {
    id: 'goliath-tigerfish',
    name: 'Goliath Tigerfish',
    sciName: 'Hydrocynus goliath',
    image: 'assets/fish/goliath-tigerfish.jpg',
    region: 'congo',
    fact: 'Grows past 1.5 m and 50 kg, with 32 interlocking dagger teeth. It hunts by sight in fast, turbid water where few predators can.',
  },
  {
    id: 'elephantnose-fish',
    name: 'Elephantnose Fish',
    sciName: 'Gnathonemus petersii',
    image: 'assets/fish/elephantnose-fish.jpg',
    region: 'congo',
    fact: 'Navigates pitch-dark, muddy water by reading distortions in its own weak electric field, and devotes a larger share of its body energy to its brain than a human does.',
  },
  {
    id: 'congo-tetra',
    name: 'Congo Tetra',
    sciName: 'Phenacogrammus interruptus',
    image: 'assets/fish/congo-tetra.jpg',
    region: 'congo',
    fact: 'Its scales scatter light into shifting bands of blue, gold and violet, and older males trail long feathered extensions from the middle of the tail.',
  },

  // ---- East African Rift Lakes ----
  {
    id: 'electric-yellow-cichlid',
    name: 'Electric Yellow Cichlid',
    sciName: 'Labidochromis caeruleus',
    image: 'assets/fish/electric-yellow-cichlid.jpg',
    region: 'rift-lakes',
    fact: 'A mouthbrooder: the female carries her eggs and fry in her mouth for around three weeks, not eating the whole time.',
  },
  {
    id: 'frontosa',
    name: 'Frontosa',
    sciName: 'Cyphotilapia frontosa',
    image: 'assets/fish/frontosa.jpg',
    region: 'rift-lakes',
    fact: 'Found only in Lake Tanganyika, hunting in deep water down to 100 m. Dominant males develop a large fatty hump above the eyes.',
  },
  {
    id: 'zebra-mbuna',
    name: 'Zebra Mbuna',
    sciName: 'Maylandia zebra',
    image: 'assets/fish/zebra-mbuna.jpg',
    region: 'rift-lakes',
    fact: 'One of the rock-dwelling "mbuna" of Lake Malawi, where hundreds of cichlid species evolved from a handful of ancestors in under a million years.',
  },

  // ---- Coral Triangle ----
  {
    id: 'mandarinfish',
    name: 'Mandarinfish',
    sciName: 'Synchiropus splendidus',
    image: 'assets/fish/mandarinfish.jpg',
    region: 'coral-triangle',
    fact: 'One of only two animals known to make blue with cellular pigment rather than structural colour. It has no scales — just toxic, foul-smelling slime.',
  },
  {
    id: 'clown-anemonefish',
    name: 'Clown Anemonefish',
    sciName: 'Amphiprion ocellaris',
    image: 'assets/fish/clown-anemonefish.jpg',
    region: 'coral-triangle',
    fact: 'Coats itself in mucus to live unstung among anemone tentacles. Every one is born male; when the resident female dies, her mate becomes female.',
  },
  {
    id: 'banggai-cardinalfish',
    name: 'Banggai Cardinalfish',
    sciName: 'Pterapogon kauderni',
    image: 'assets/fish/banggai-cardinalfish.jpg',
    region: 'coral-triangle',
    fact: 'Wild populations live only around Indonesia’s Banggai Islands — a range smaller than most cities. Males brood the eggs, then the hatched young, in their mouths.',
  },

  // ---- Northern Australia ----
  {
    id: 'barramundi',
    name: 'Barramundi',
    sciName: 'Lates calcarifer',
    image: 'assets/fish/barramundi.jpg',
    region: 'northern-australia',
    fact: 'Nearly all barramundi mature as males and change to female around five years old, so the biggest fish are almost always female.',
  },
  {
    id: 'australian-lungfish',
    name: 'Australian Lungfish',
    sciName: 'Neoceratodus forsteri',
    image: 'assets/fish/australian-lungfish.jpg',
    region: 'northern-australia',
    fact: 'Native to just a few Queensland rivers, and barely changed in 100 million years. It has a single true lung and can gulp air when its pool goes stagnant.',
  },
  {
    id: 'potato-cod',
    name: 'Potato Cod',
    sciName: 'Epinephelus tukula',
    image: 'assets/fish/potato-cod.jpg',
    region: 'northern-australia',
    fact: 'Named for the potato-sized blotches along its flanks. At the Great Barrier Reef’s Cod Hole they grow to two metres and are famously unbothered by divers.',
  },

  // ---- Southern Ocean ----
  {
    id: 'antarctic-toothfish',
    name: 'Antarctic Toothfish',
    sciName: 'Dissostichus mawsoni',
    image: 'assets/fish/antarctic-toothfish.jpg',
    region: 'southern-ocean',
    fact: 'Its blood carries antifreeze glycoproteins that stop ice crystals growing, letting it live in water below the normal freezing point.',
  },
  {
    id: 'blackfin-icefish',
    name: 'Blackfin Icefish',
    sciName: 'Chaenocephalus aceratus',
    image: 'assets/fish/blackfin-icefish.jpg',
    region: 'southern-ocean',
    fact: 'The only known vertebrates with no haemoglobin — their blood runs clear and carries oxygen dissolved straight into the plasma.',
  },
  {
    id: 'emerald-rockcod',
    name: 'Emerald Rockcod',
    sciName: 'Trematomus bernacchii',
    image: 'assets/fish/emerald-rockcod.jpg',
    region: 'southern-ocean',
    fact: 'Rests on the seabed under the sea ice at about −1.9 °C, kept liquid by antifreeze proteins that bind to ice crystals before they can spread.',
  },
];
