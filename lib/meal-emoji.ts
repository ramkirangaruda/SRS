// A tiny emoji mapper (client-safe). We match a food item name against keyword
// rules and return a fitting emoji, defaulting to 🍽️. It's deliberately simple —
// a lookup table of substrings, first match wins — which is plenty for a menu.
const RULES: [RegExp, string][] = [
  [/rice|biryani|pulao/i, "🍚"],
  [/dal|sambar|curry|gravy|rasam/i, "🍲"],
  [/roti|chapati|naan|bread|paratha/i, "🍞"],
  [/idli|dosa|uttapam/i, "🥞"],
  [/fruit|apple|banana|mango|orange/i, "🍎"],
  [/milk|buttermilk|lassi/i, "🥛"],
  [/egg|omelette|omelet/i, "🥚"],
  [/chicken|mutton|fish|meat/i, "🍗"],
  [/veg|sabzi|salad|greens|spinach/i, "🥗"],
  [/biscuit|cookie|cake|sweet|halwa|kheer/i, "🍪"],
  [/tea|coffee/i, "☕"],
  [/juice/i, "🧃"],
  [/soup/i, "🥣"],
  [/noodle|pasta/i, "🍜"],
  [/potato|aloo|fries/i, "🥔"],
  [/chutney|pickle|sauce/i, "🥫"],
  [/water/i, "💧"],
];

export function emojiFor(item: string): string {
  for (const [re, emoji] of RULES) if (re.test(item)) return emoji;
  return "🍽️";
}
