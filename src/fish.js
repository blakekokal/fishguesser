/* Fishguesser — the guessable fish, grouped by home region.
 *
 * `region` must match an id in REGIONS (see regions.js); several fish share a
 * region, which is what makes the map worth reading rather than memorising.
 * Photos are linked straight from Wikimedia Commons rather than stored here, so
 * the game needs a network connection to show them. The URLs point at the CDN
 * thumbnail directly — the path hash is derived from the filename, not the
 * contents, so it stays valid if the file is re-uploaded. Which Commons file
 * each fish uses, and who to credit, is recorded in assets/fish/credits.json;
 * see CREDITS.md. Regenerate the URLs with tools/build_photo_urls.py.
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
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Oncorhynchus_nerka_2.jpg/1280px-Oncorhynchus_nerka_2.jpg',
    region: 'north-pacific',
    fact: 'Sockeye spend years at sea silver, then turn brilliant red with a green head to spawn in the same freshwater stream they hatched in.',
  },
  {
    id: 'yelloweye-rockfish',
    name: 'Yelloweye Rockfish',
    sciName: 'Sebastes ruberrimus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Sebastes_ruberrimus_143567641.jpg/1280px-Sebastes_ruberrimus_143567641.jpg',
    region: 'north-pacific',
    fact: 'One of the longest-lived fish in the world — individuals over 100 years old have been aged. Growing that slowly makes the species very slow to recover from fishing.',
  },
  {
    id: 'lingcod',
    name: 'Lingcod',
    sciName: 'Ophiodon elongatus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Ophiodon_elongatus_458366655.jpg/1280px-Ophiodon_elongatus_458366655.jpg',
    region: 'north-pacific',
    fact: 'Not a cod at all, but a greenling. Roughly one in five has startling blue-green flesh from a harmless pigment that cooks away white.',
  },
  {
    id: 'pacific-halibut',
    name: 'Pacific Halibut',
    sciName: 'Hippoglossus stenolepis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Hippoglossus_stenolepis_1.JPG/1280px-Hippoglossus_stenolepis_1.JPG',
    region: 'north-pacific',
    fact: 'Hatches upright with an eye on each side, then one eye migrates across its skull as it tips over to live flat on the seabed.',
  },

  // ---- Caribbean Sea ----
  {
    id: 'queen-angelfish',
    name: 'Queen Angelfish',
    sciName: 'Holacanthus ciliaris',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Holacanthus_ciliaris_2.jpg/1280px-Holacanthus_ciliaris_2.jpg',
    region: 'caribbean',
    fact: 'Named for the ringed blue "crown" on its forehead. It grazes mostly on sponges around Caribbean and Floridian reefs.',
  },
  {
    id: 'nassau-grouper',
    name: 'Nassau Grouper',
    sciName: 'Epinephelus striatus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Epinephelus_striatus_2.jpg/1280px-Epinephelus_striatus_2.jpg',
    region: 'caribbean',
    fact: 'Gathers by the thousand to spawn at the same reefs each winter full moon — predictable enough that fishing collapsed the species to critically endangered.',
  },
  {
    id: 'stoplight-parrotfish',
    name: 'Stoplight Parrotfish',
    sciName: 'Sparisoma viride',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Stoplight-parrotfish.jpg/1280px-Stoplight-parrotfish.jpg',
    region: 'caribbean',
    fact: 'Scrapes algae off coral with a beak of fused teeth and excretes the ground-up rock as fine white sand — a single fish can make hundreds of kilos of beach a year.',
  },
  {
    id: 'tarpon',
    name: 'Atlantic Tarpon',
    sciName: 'Megalops atlanticus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Megalops_atlanticus_by_DaijuAzuma.jpg/1280px-Megalops_atlanticus_by_DaijuAzuma.jpg',
    region: 'caribbean',
    fact: 'Gulps air at the surface through a lung-like swim bladder, which lets it survive in stagnant backwaters that would suffocate its predators.',
  },

  // ---- Amazon Basin ----
  {
    id: 'red-bellied-piranha',
    name: 'Red-bellied Piranha',
    sciName: 'Pygocentrus nattereri',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Pygocentrus_nattereri_-_Karlsruhe_Zoo_01.jpg/1280px-Pygocentrus_nattereri_-_Karlsruhe_Zoo_01.jpg',
    region: 'amazon',
    fact: 'Far less bloodthirsty than its reputation — it mostly scavenges and eats insects, and shoals largely for protection from predators.',
  },
  {
    id: 'arapaima',
    name: 'Arapaima',
    sciName: 'Arapaima gigas',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Arapaima_gigas_5147.jpg/1280px-Arapaima_gigas_5147.jpg',
    region: 'amazon',
    fact: 'One of the largest freshwater fish alive, past three metres. It breathes air through a lung-like swim bladder and drowns if kept from the surface.',
  },
  {
    id: 'discus',
    name: 'Discus',
    sciName: 'Symphysodon aequifasciatus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Symphysodon_aequifasciatus_-_Karlsruhe_Zoo_04.jpg/1280px-Symphysodon_aequifasciatus_-_Karlsruhe_Zoo_04.jpg',
    region: 'amazon',
    fact: 'Both parents grow a nutritious skin mucus that their fry graze on for the first few weeks — a fish equivalent of nursing.',
  },
  {
    id: 'electric-eel',
    name: 'Electric Eel',
    sciName: 'Electrophorus electricus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Electrophorus_electricus_in_Ouwehands_Dierenpark_01.jpg/1280px-Electrophorus_electricus_in_Ouwehands_Dierenpark_01.jpg',
    region: 'amazon',
    fact: 'Not an eel but a knifefish. It can discharge around 600 volts, and has been seen leaping to press the shock directly into a large animal.',
  },

  // ---- North Atlantic ----
  {
    id: 'atlantic-cod',
    name: 'Atlantic Cod',
    sciName: 'Gadus morhua',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Atlantic_Cod%2C_Atlantischer_Kabeljau_%28Gadus_morhua%29.jpg/1280px-Atlantic_Cod%2C_Atlantischer_Kabeljau_%28Gadus_morhua%29.jpg',
    region: 'north-atlantic',
    fact: 'Three dorsal fins and a whisker-like chin barbel it uses to taste the seabed. Centuries of fishing collapsed the Grand Banks stock in 1992.',
  },
  {
    id: 'atlantic-wolffish',
    name: 'Atlantic Wolffish',
    sciName: 'Anarhichas lupus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Anarhichas-lupus-Atlanterhavsparken.jpg/1280px-Anarhichas-lupus-Atlanterhavsparken.jpg',
    region: 'north-atlantic',
    fact: 'Crushes sea urchins and clams with conical fangs, and makes its own antifreeze so its blood keeps flowing in near-freezing water.',
  },
  {
    id: 'atlantic-mackerel',
    name: 'Atlantic Mackerel',
    sciName: 'Scomber scombrus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Atlantic_mackerel_%28Scomber_scombrus%29.jpg/1280px-Atlantic_mackerel_%28Scomber_scombrus%29.jpg',
    region: 'north-atlantic',
    fact: 'Has no swim bladder, so it must keep swimming or sink. The wavy black bars across its back are as individual as a fingerprint.',
  },
  {
    id: 'lumpfish',
    name: 'Lumpfish',
    sciName: 'Cyclopterus lumpus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Merivarblane.jpg/1280px-Merivarblane.jpg',
    region: 'north-atlantic',
    fact: 'Its pelvic fins are fused into a suction disc that clamps it to rock against the swell. The male guards the eggs alone, fanning them for weeks.',
  },

  // ---- Mediterranean Sea ----
  {
    id: 'gilt-head-bream',
    name: 'Gilt-head Bream',
    sciName: 'Sparus aurata',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Brest_-_Oc%C3%A9anopolis_-_2015_-_051.jpg/1280px-Brest_-_Oc%C3%A9anopolis_-_2015_-_051.jpg',
    region: 'mediterranean',
    fact: 'Named for the golden band between its eyes. Every one starts life male and some later become female — a trick called protandry.',
  },
  {
    id: 'dusky-grouper',
    name: 'Dusky Grouper',
    sciName: 'Epinephelus marginatus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Mero_%28Epinephelus_marginatus%29%2C_Cabo_de_Palos%2C_Espa%C3%B1a%2C_2022-07-15%2C_DD_34.jpg/1280px-Mero_%28Epinephelus_marginatus%29%2C_Cabo_de_Palos%2C_Espa%C3%B1a%2C_2022-07-15%2C_DD_34.jpg',
    region: 'mediterranean',
    fact: 'A long-lived rocky-reef ambusher that holds the same territory for years. All are born female and the largest turn male around age twelve.',
  },
  {
    id: 'european-seabass',
    name: 'European Seabass',
    sciName: 'Dicentrarchus labrax',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Dicentrarchus_labrax_LoroParqueTenerife_seabass_IMG_4959.JPG/1280px-Dicentrarchus_labrax_LoroParqueTenerife_seabass_IMG_4959.JPG',
    region: 'mediterranean',
    fact: 'A fast coastal hunter that pushes far into brackish lagoons and river mouths, tolerating water from nearly fresh to fully salt.',
  },
  {
    id: 'mediterranean-moray',
    name: 'Mediterranean Moray',
    sciName: 'Muraena helena',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Morena_del_Mediterr%C3%A1neo_%28Muraena_helena%29%2C_Catania%2C_Sicilia%2C_Italia%2C_2025-04-05%2C_DD_35.jpg/1280px-Morena_del_Mediterr%C3%A1neo_%28Muraena_helena%29%2C_Catania%2C_Sicilia%2C_Italia%2C_2025-04-05%2C_DD_35.jpg',
    region: 'mediterranean',
    fact: 'Has a second set of jaws in its throat that lunge forward to drag prey down, since it cannot suck food in the way most fish do.',
  },

  // ---- Congo Basin ----
  {
    id: 'goliath-tigerfish',
    name: 'Goliath Tigerfish',
    sciName: 'Hydrocynus goliath',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Hydrocynus_goliath.jpg/1280px-Hydrocynus_goliath.jpg',
    region: 'congo',
    fact: 'Grows past 1.5 m and 50 kg, with 32 interlocking dagger teeth. It hunts by sight in fast, turbid water where few predators can.',
  },
  {
    id: 'elephantnose-fish',
    name: 'Elephantnose Fish',
    sciName: 'Gnathonemus petersii',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Mormyridae_Gnathonemus_petersii_2.jpg/1280px-Mormyridae_Gnathonemus_petersii_2.jpg',
    region: 'congo',
    fact: 'Navigates pitch-dark, muddy water by reading distortions in its own weak electric field, and devotes a larger share of its body energy to its brain than a human does.',
  },
  {
    id: 'congo-tetra',
    name: 'Congo Tetra',
    sciName: 'Phenacogrammus interruptus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Phenacogrammus_interruptus_1.jpg/1280px-Phenacogrammus_interruptus_1.jpg',
    region: 'congo',
    fact: 'Its scales scatter light into shifting bands of blue, gold and violet, and older males trail long feathered extensions from the middle of the tail.',
  },
  {
    id: 'african-butterflyfish',
    name: 'African Butterflyfish',
    sciName: 'Pantodon buchholzi',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Pantodon_buchholzi_K%C3%B6ln_Zoo_31122014_1.jpg/1280px-Pantodon_buchholzi_K%C3%B6ln_Zoo_31122014_1.jpg',
    region: 'congo',
    fact: 'Hangs motionless at the surface watching upward for insects, and can burst clear of the water on its huge wing-like pectoral fins.',
  },

  // ---- East African Rift Lakes ----
  {
    id: 'electric-yellow-cichlid',
    name: 'Electric Yellow Cichlid',
    sciName: 'Labidochromis caeruleus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Labidochromis_caeruleus_%28male%29.jpg/1280px-Labidochromis_caeruleus_%28male%29.jpg',
    region: 'rift-lakes',
    fact: 'A mouthbrooder: the female carries her eggs and fry in her mouth for around three weeks, not eating the whole time.',
  },
  {
    id: 'frontosa',
    name: 'Frontosa',
    sciName: 'Cyphotilapia frontosa',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Cyphotilapia_frontosa_-_Karlsruhe_Zoo_01.jpg/1280px-Cyphotilapia_frontosa_-_Karlsruhe_Zoo_01.jpg',
    region: 'rift-lakes',
    fact: 'Found only in Lake Tanganyika, hunting in deep water down to 100 m. Dominant males develop a large fatty hump above the eyes.',
  },
  {
    id: 'zebra-mbuna',
    name: 'Zebra Mbuna',
    sciName: 'Maylandia zebra',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Maylandia_zebra_B.jpg/1280px-Maylandia_zebra_B.jpg',
    region: 'rift-lakes',
    fact: 'One of the rock-dwelling "mbuna" of Lake Malawi, where hundreds of cichlid species evolved from a handful of ancestors in under a million years.',
  },
  {
    id: 'malawi-eyebiter',
    name: 'Malawi Eyebiter',
    sciName: 'Dimidiochromis compressiceps',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Cichlidae_-_Dimidiochromis_compressiceps.JPG/1280px-Cichlidae_-_Dimidiochromis_compressiceps.JPG',
    region: 'rift-lakes',
    fact: 'Hunts hanging head-down among reed stems, its blade-thin body almost invisible end-on until it strikes.',
  },

  // ---- Coral Triangle ----
  {
    id: 'mandarinfish',
    name: 'Mandarinfish',
    sciName: 'Synchiropus splendidus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Synchiropus_splendidus_2_Luc_Viatour.jpg/1280px-Synchiropus_splendidus_2_Luc_Viatour.jpg',
    region: 'coral-triangle',
    fact: 'One of only two animals known to make blue with cellular pigment rather than structural colour. It has no scales — just toxic, foul-smelling slime.',
  },
  {
    id: 'clown-anemonefish',
    name: 'Clown Anemonefish',
    sciName: 'Amphiprion ocellaris',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Amphiprion_ocellaris_%28Clown_anemonefish%29_by_Nick_Hobgood.jpg/1280px-Amphiprion_ocellaris_%28Clown_anemonefish%29_by_Nick_Hobgood.jpg',
    region: 'coral-triangle',
    fact: 'Coats itself in mucus to live unstung among anemone tentacles. Every one is born male; when the resident female dies, her mate becomes female.',
  },
  {
    id: 'banggai-cardinalfish',
    name: 'Banggai Cardinalfish',
    sciName: 'Pterapogon kauderni',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Banggai-Kardinalbarsch_Pterapogon_kauderni.jpg/1280px-Banggai-Kardinalbarsch_Pterapogon_kauderni.jpg',
    region: 'coral-triangle',
    fact: 'Wild populations live only around Indonesia’s Banggai Islands — a range smaller than most cities. Males brood the eggs, then the hatched young, in their mouths.',
  },
  {
    id: 'ribbon-eel',
    name: 'Ribbon Eel',
    sciName: 'Rhinomuraena quaesita',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Anguila_list%C3%B3n_azul_%28Rhinomuraena_quaesita%29%2C_Anilao%2C_Filipinas%2C_2023-08-23%2C_DD_60.jpg/1280px-Anguila_list%C3%B3n_azul_%28Rhinomuraena_quaesita%29%2C_Anilao%2C_Filipinas%2C_2023-08-23%2C_DD_60.jpg',
    region: 'coral-triangle',
    fact: 'Every one starts black as a juvenile, turns blue and yellow as a male, then yellow as a female — the same fish in three different liveries.',
  },

  // ---- Northern Australia ----
  {
    id: 'barramundi',
    name: 'Barramundi',
    sciName: 'Lates calcarifer',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Lates_calcarifer%2C_2014-09-19a.jpg/1280px-Lates_calcarifer%2C_2014-09-19a.jpg',
    region: 'northern-australia',
    fact: 'Nearly all barramundi mature as males and change to female around five years old, so the biggest fish are almost always female.',
  },
  {
    id: 'australian-lungfish',
    name: 'Australian Lungfish',
    sciName: 'Neoceratodus forsteri',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Neoceratodus_forsteri_Nagoya1.jpg/1280px-Neoceratodus_forsteri_Nagoya1.jpg',
    region: 'northern-australia',
    fact: 'Native to just a few Queensland rivers, and barely changed in 100 million years. It has a single true lung and can gulp air when its pool goes stagnant.',
  },
  {
    id: 'potato-cod',
    name: 'Potato Cod',
    sciName: 'Epinephelus tukula',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Serranidae_Epinephelus_tukula_1.jpg/1280px-Serranidae_Epinephelus_tukula_1.jpg',
    region: 'northern-australia',
    fact: 'Named for the potato-sized blotches along its flanks. At the Great Barrier Reef’s Cod Hole they grow to two metres and are famously unbothered by divers.',
  },
  {
    id: 'gulf-saratoga',
    name: 'Gulf Saratoga',
    sciName: 'Scleropages jardinii',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Scleropages_jardinii_043.JPG/1280px-Scleropages_jardinii_043.JPG',
    region: 'northern-australia',
    fact: 'A mouthbrooder that carries its young for weeks, and an ancient "bonytongue" — its lineage was swimming before Australia broke from Gondwana.',
  },

  // ---- Southern Ocean ----
  {
    id: 'antarctic-toothfish',
    name: 'Antarctic Toothfish',
    sciName: 'Dissostichus mawsoni',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Dissostichus_mawsoni_NOAA_Fish8711.jpg/1280px-Dissostichus_mawsoni_NOAA_Fish8711.jpg',
    region: 'southern-ocean',
    fact: 'Its blood carries antifreeze glycoproteins that stop ice crystals growing, letting it live in water below the normal freezing point.',
  },
  {
    id: 'blackfin-icefish',
    name: 'Blackfin Icefish',
    sciName: 'Chaenocephalus aceratus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/C._aceratus.jpg/1280px-C._aceratus.jpg',
    region: 'southern-ocean',
    fact: 'The only known vertebrates with no haemoglobin — their blood runs clear and carries oxygen dissolved straight into the plasma.',
  },
  {
    id: 'emerald-rockcod',
    name: 'Emerald Rockcod',
    sciName: 'Trematomus bernacchii',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Emerald_rockcod%2C_Trematomus_bernacchii.jpg/1280px-Emerald_rockcod%2C_Trematomus_bernacchii.jpg',
    region: 'southern-ocean',
    fact: 'Rests on the seabed under the sea ice at about −1.9 °C, kept liquid by antifreeze proteins that bind to ice crystals before they can spread.',
  },
  {
    id: 'mackerel-icefish',
    name: 'Mackerel Icefish',
    sciName: 'Champsocephalus gunnari',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Mackerel_Icefish_%28Champsocephalus_gunnari%29.jpg/1280px-Mackerel_Icefish_%28Champsocephalus_gunnari%29.jpg',
    region: 'southern-ocean',
    fact: 'Another white-blooded icefish. With no haemoglobin it compensates with an oversized heart and unusually large volumes of blood.',
  },

  // ---- Arctic Ocean ----
  {
    id: 'greenland-shark',
    name: 'Greenland Shark',
    sciName: 'Somniosus microcephalus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Greenland_shark_profile.jpg/1280px-Greenland_shark_profile.jpg',
    region: 'arctic',
    fact: 'The longest-lived vertebrate known: radiocarbon dating of the eye lens puts some individuals near 400 years old, and they mature at about 150.',
  },
  {
    id: 'polar-cod',
    name: 'Polar Cod',
    sciName: 'Boreogadus saida',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Boreogadus_saida_Kaiyukan.jpg/1280px-Boreogadus_saida_Kaiyukan.jpg',
    region: 'arctic',
    fact: 'Lives in the brine channels inside sea ice, kept liquid by antifreeze proteins. Almost every Arctic seal and seabird depends on it.',
  },
  {
    id: 'capelin',
    name: 'Capelin',
    sciName: 'Mallotus villosus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Capelin_%28Mallotus_villosus%29_-_Sandy_Cove%2C_Newfoundland_2019-08-14_%2801%29.jpg/1280px-Capelin_%28Mallotus_villosus%29_-_Sandy_Cove%2C_Newfoundland_2019-08-14_%2801%29.jpg',
    region: 'arctic',
    fact: 'Spawns by hurling itself onto gravel beaches in such numbers that the shoreline turns silver, then mostly dies where it lands.',
  },
  {
    id: 'arctic-char',
    name: 'Arctic Char',
    sciName: 'Salvelinus alpinus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Salvelinus_alpinus_Kaiyukan.jpg/1280px-Salvelinus_alpinus_Kaiyukan.jpg',
    region: 'arctic',
    fact: 'The northernmost freshwater fish on Earth, living in lakes that stay frozen most of the year.',
  },

  // ---- Great Lakes ----
  {
    id: 'lake-sturgeon',
    name: 'Lake Sturgeon',
    sciName: 'Acipenser fulvescens',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Juvenile_Acipenser_fulvescens_black_background.jpg/1280px-Juvenile_Acipenser_fulvescens_black_background.jpg',
    region: 'great-lakes',
    fact: 'Armoured with bony plates instead of scales and little changed in 150 million years. Females may not spawn until they are twenty-five.',
  },
  {
    id: 'muskellunge',
    name: 'Muskellunge',
    sciName: 'Esox masquinongy',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Esox_masquinongy_%28muskellunge%29_1.jpg/1280px-Esox_masquinongy_%28muskellunge%29_1.jpg',
    region: 'great-lakes',
    fact: 'Nicknamed "the fish of ten thousand casts" for how rarely it strikes. It ambushes from weed beds and takes prey a third of its own length.',
  },
  {
    id: 'lake-trout',
    name: 'Lake Trout',
    sciName: 'Salvelinus namaycush',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Lake_trout_fishes_salvelinus_namaycush.jpg/1280px-Lake_trout_fishes_salvelinus_namaycush.jpg',
    region: 'great-lakes',
    fact: 'A cold, deep-water char that grows slowly and lives for decades. Sea lamprey arriving through the shipping canals nearly wiped it out.',
  },
  {
    id: 'bluegill',
    name: 'Bluegill',
    sciName: 'Lepomis macrochirus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Bluegill_%28Lepomis_macrochirus%29_black_background.jpg/1280px-Bluegill_%28Lepomis_macrochirus%29_black_background.jpg',
    region: 'great-lakes',
    fact: 'Males scrape shallow nests in colonies and fan them constantly; smaller males mimic females to sneak into a guarded nest and spawn.',
  },

  // ---- Sea of Japan ----
  {
    id: 'japanese-amberjack',
    name: 'Japanese Amberjack',
    sciName: 'Seriola quinqueradiata',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Seriola_quinqueradiata.jpg/1280px-Seriola_quinqueradiata.jpg',
    region: 'sea-of-japan',
    fact: 'Known as buri, and renamed at each stage of its life as it grows — a fish whose name tells you how big it is.',
  },
  {
    id: 'red-seabream',
    name: 'Red Seabream',
    sciName: 'Pagrus major',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Pagrus_major_ioworld.jpg/1280px-Pagrus_major_ioworld.jpg',
    region: 'sea-of-japan',
    fact: 'Called tai, and served at weddings and New Year because the word rides inside "medetai" — auspicious.',
  },
  {
    id: 'torafugu',
    name: 'Torafugu',
    sciName: 'Takifugu rubripes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Takifugu_rubripes_AQUAS.jpg/1280px-Takifugu_rubripes_AQUAS.jpg',
    region: 'sea-of-japan',
    fact: 'Carries tetrodotoxin far deadlier than cyanide, which it does not make itself but accumulates from the bacteria in its diet.',
  },
  {
    id: 'pacific-saury',
    name: 'Pacific Saury',
    sciName: 'Cololabis saira',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Cololabis_saira_in_a_tank.jpg/1280px-Cololabis_saira_in_a_tank.jpg',
    region: 'sea-of-japan',
    fact: 'A slender surface fish with no true stomach, so it digests continuously — and an autumn staple grilled whole as sanma.',
  },

  // ---- Mekong Basin ----
  {
    id: 'mekong-giant-catfish',
    name: 'Mekong Giant Catfish',
    sciName: 'Pangasianodon gigas',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Mekong_giant_catfish.jpg/1280px-Mekong_giant_catfish.jpg',
    region: 'mekong',
    fact: 'One of the largest freshwater fish ever recorded, near three metres. Adults lose their teeth and barbels and live entirely on algae.',
  },
  {
    id: 'siamese-fighting-fish',
    name: 'Siamese Fighting Fish',
    sciName: 'Betta splendens',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Bojownik_syjamski.jpg/1280px-Bojownik_syjamski.jpg',
    region: 'mekong',
    fact: 'Breathes air through a labyrinth organ, so it survives in rice paddies too stagnant for other fish. The male builds a nest of bubbles.',
  },
  {
    id: 'giant-freshwater-stingray',
    name: 'Giant Freshwater Stingray',
    sciName: 'Urogymnus polylepis',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Urogymnus_polylepis_at_Itabashi_Botanical_Garden.png/1280px-Urogymnus_polylepis_at_Itabashi_Botanical_Garden.png.jpg',
    region: 'mekong',
    fact: 'Can span two metres across and carries a serrated spine longer than a hand, used only in defence against river-bottom predators.',
  },
  {
    id: 'giant-snakehead',
    name: 'Giant Snakehead',
    sciName: 'Channa micropeltes',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Channa_micropeltes_-_T%C3%AAte_de_serpent_-_Aqua_Porte_Dor%C3%A9e_01.JPG/1280px-Channa_micropeltes_-_T%C3%AAte_de_serpent_-_Aqua_Porte_Dor%C3%A9e_01.JPG',
    region: 'mekong',
    fact: 'Breathes air and can cross damp ground between pools. Both parents guard the shoal of red fry and will drive off anything that comes near.',
  },

  // ---- New Zealand ----
  {
    id: 'australasian-snapper',
    name: 'Australasian Snapper',
    sciName: 'Chrysophrys auratus',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Pagrus_auratus_%28Forster%2C_1801%29_%28AM_MA36682-1%29.jpg/1280px-Pagrus_auratus_%28Forster%2C_1801%29_%28AM_MA36682-1%29.jpg',
    region: 'new-zealand',
    fact: 'Older fish develop a pronounced bony hump on the forehead and snout, and can live past sixty years.',
  },
  {
    id: 'longfin-eel',
    name: 'New Zealand Longfin Eel',
    sciName: 'Anguilla dieffenbachii',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Anguilla_dieffenbachii_62220829.jpg/1280px-Anguilla_dieffenbachii_62220829.jpg',
    region: 'new-zealand',
    fact: 'Spends up to a century in fresh water, then swims thousands of kilometres to spawn near Tonga once, and dies.',
  },
  {
    id: 'blue-cod',
    name: 'Blue Cod',
    sciName: 'Parapercis colias',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Blue_Cod_in_Milford_Sound.jpg/1280px-Blue_Cod_in_Milford_Sound.jpg',
    region: 'new-zealand',
    fact: 'Found nowhere but New Zealand. Every one begins life female, and the largest turn male and take a territory.',
  },
  {
    id: 'kahawai',
    name: 'Kahawai',
    sciName: 'Arripis trutta',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Arripis_trutta_NZ.jpg/1280px-Arripis_trutta_NZ.jpg',
    region: 'new-zealand',
    fact: 'Hunts in fast surface shoals that drive baitfish into a boil, with seabirds working the same school from above.',
  },
];
