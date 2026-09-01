/* Fishguesser — place names, blanked out while a fact is a hint.
 *
 * Every fish carries a fact, and the game shows it before the guess. The facts
 * were written to be read *after* the answer, though, so a few of them name the
 * place outright — "on Antillean reefs", "Lake Tanganyika", "the Grand Banks".
 * Those words are dotted out for as long as the fact is a hint and come back
 * with the result, which is the same bargain the common name makes.
 *
 * Matching is whole-word and case-sensitive: place names are capitalised in the
 * facts, so that keeps "Superior" and "Pacific" out of the mask without taking
 * "superior" and "pacific" with them. The list runs well past what the current
 * facts use, since the cost of an unused term is nothing and the cost of a
 * missing one is a round given away. It is still a list, not a parser: a new
 * fact that names a place needs its term adding here.
 *
 * What a word list cannot catch is a fact that gives the region away without
 * naming it — a Japanese word quoted in full, a fishery, a myth. Those are
 * caught by reading the fact when it is written. */

const PLACE_TERMS = [
  // Oceans, seas and the water in between
  'Adriatic', 'Aegean', 'Andaman', 'Antarctic', 'Antarctica', 'Antillean',
  'Antilles', 'Arabian', 'Arctic', 'Atlantic', 'Baltic', 'Barents', 'Bering',
  'Black Sea', 'Caribbean', 'Coral Sea', 'Coral Triangle', 'Gulf of Mexico',
  'Indian', 'Mediterranean', 'North Sea', 'Pacific', 'Persian Gulf', 'Red Sea',
  'Sargasso', 'Sea of Japan', 'Southern Ocean', 'Tasman',
  // Continents and the people named after places
  'Africa', 'African', 'America', 'American', 'Americas', 'Asia', 'Asian',
  'Australasian', 'Australian', 'Brazilian', 'British', 'Californian',
  'Chilean', 'Chinese', 'Egyptian', 'English', 'Europe', 'European',
  'Filipino', 'Floridian', 'Greek', 'Hawaiian', 'Icelandic', 'Indonesian',
  'Inuit',
  'Irish', 'Japanese', 'Korean', 'Maori', 'Māori', 'Melanesian', 'Mexican',
  'Norwegian', 'Odysseus', 'Peruvian', 'Polynesian', 'Roman', 'Romans',
  'Russian', 'Scottish', 'Soviet', 'Thai', 'Vietnamese',
  // Countries, states and islands
  'Alaska', 'Angola', 'Aotearoa', 'Argentina', 'Australia', 'Baja', 'Bahamas',
  'Bali', 'Belize', 'Bermuda', 'Borneo', 'Brazil', 'Britain', 'Burma',
  'California', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China', 'Colombia',
  'Cuba', 'Denmark', 'Ecuador', 'Egypt', 'England', 'Fiji', 'Florida',
  'France', 'Gabon', 'Galapagos', 'Galápagos', 'Greece', 'Greenland',
  'Hawaii', 'Hokkaido', 'Honshu', 'Iceland', 'India', 'Indonesia', 'Ireland',
  'Israel', 'Italy', 'Japan', 'Java', 'Kenya', 'Korea', 'Laos', 'Madagascar',
  'Maine', 'Malaysia', 'Mexico', 'Morocco', 'Mozambique', 'Myanmar',
  'New Guinea', 'New Zealand', 'Nigeria', 'Norway', 'Okinawa', 'Oregon',
  'Papua', 'Peru', 'Philippines', 'Portugal', 'Queensland', 'Sakhalin',
  'Samoa', 'Scotland', 'Siberia', 'Singapore', 'Spain', 'Sulawesi', 'Sumatra',
  'Sweden', 'Taiwan', 'Tanzania', 'Tasmania', 'Texas', 'Thailand', 'Tonga',
  'Turkey', 'Uruguay', 'Venezuela', 'Vietnam', 'Washington', 'Zambia',
  // Cities and coasts a photograph or a fishery might be pinned to
  'Auckland', 'Cozumel', 'Kamchatka', 'Osaka', 'Sagami', 'Suruga', 'Sydney',
  'Tokyo',
  // Rivers, lakes and named pieces of water
  'Amazon', 'Amazonian', 'Amur', 'Baikal', 'Banggai', 'Chesapeake', 'Columbia',
  'Congo', 'Cod Hole', 'Danube', 'Darling', 'Erie', 'Everglades', 'Fraser',
  'Grand Banks', 'Great Barrier Reef', 'Great Lakes', 'Huron', 'Malawi',
  'Mekong', 'Michigan', 'Mississippi', 'Missouri', 'Murray', 'Niger', 'Nile',
  'Ontario', 'Orinoco', 'Paraná', 'Parana', 'Puget Sound', 'Rhine',
  'Rift Valley', 'Rio Xingu', 'Superior', 'Tanganyika', 'Victoria', 'Volga',
  'Xingu', 'Yangtze', 'Yukon', 'Zambezi',
];

/* Longest first, so "New Zealand" is matched and blanked as one name rather
 * than leaving "New" standing next to a row of dots. */
const PLACE_PATTERN = new RegExp(
  `\\b(?:${[...PLACE_TERMS].sort((a, b) => b.length - a.length).join('|')})\\b`,
  'g');

/** Dots out every place name in `text`, leaving spaces and punctuation alone. */
function maskPlaces(text) {
  return text.replace(PLACE_PATTERN, (found) => found.replace(/\S/g, '•'));
}
