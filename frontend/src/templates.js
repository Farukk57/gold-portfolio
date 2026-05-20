export const PRESET_TEMPLATES = [
  // ── Turkish ───────────────────────────────────────────────────────────────
  { id: 'tr-cumhuriyet', category: 'turkish', name: 'Cumhuriyet Altını', metal: 'gold', carat: '22k', weight_grams: 7.216, notes: 'Turkish Republic gold coin (Tam Altın)' },
  { id: 'tr-resat',      category: 'turkish', name: 'Reşat Altını',      metal: 'gold', carat: '22k', weight_grams: 7.216, notes: 'Ottoman Reşad V gold coin' },
  { id: 'tr-ata',        category: 'turkish', name: 'Ata Altını',         metal: 'gold', carat: '22k', weight_grams: 7.216, notes: 'Atatürk portrait gold coin' },
  { id: 'tr-yarim',      category: 'turkish', name: 'Yarım Altın',        metal: 'gold', carat: '22k', weight_grams: 3.608, notes: 'Half Turkish gold coin' },
  { id: 'tr-ceyrek',     category: 'turkish', name: 'Çeyrek Altın',       metal: 'gold', carat: '22k', weight_grams: 1.804, notes: 'Quarter Turkish gold coin' },
  { id: 'tr-besli',      category: 'turkish', name: '5\'li (Beşibirlik)', metal: 'gold', carat: '22k', weight_grams: 36.08, notes: '5 Turkish gold coins' },
  { id: 'tr-gram-1',     category: 'turkish', name: 'Gram Altın 1g',      metal: 'gold', carat: '24k', weight_grams: 1,     notes: '24k gold gram bar' },
  { id: 'tr-gram-2',     category: 'turkish', name: 'Gram Altın 2.5g',    metal: 'gold', carat: '24k', weight_grams: 2.5,   notes: '24k gold gram bar' },
  { id: 'tr-gram-5',     category: 'turkish', name: 'Gram Altın 5g',      metal: 'gold', carat: '24k', weight_grams: 5,     notes: '24k gold gram bar' },
  { id: 'tr-gram-10',    category: 'turkish', name: 'Gram Altın 10g',     metal: 'gold', carat: '24k', weight_grams: 10,    notes: '24k gold gram bar' },

  // ── German / European ────────────────────────────────────────────────────
  { id: 'de-krug-1',    category: 'german', name: 'Krügerrand 1 oz',             metal: 'gold', carat: '22k', weight_grams: 33.93,   notes: '1 troy oz, 22k — most popular investment coin in Germany' },
  { id: 'de-krug-half', category: 'german', name: 'Krügerrand 1/2 oz',           metal: 'gold', carat: '22k', weight_grams: 16.97,   notes: 'Half ounce Krügerrand' },
  { id: 'de-krug-qtr',  category: 'german', name: 'Krügerrand 1/4 oz',           metal: 'gold', carat: '22k', weight_grams: 8.48,    notes: 'Quarter ounce Krügerrand' },
  { id: 'de-krug-10',   category: 'german', name: 'Krügerrand 1/10 oz',          metal: 'gold', carat: '22k', weight_grams: 3.39,    notes: 'Tenth ounce Krügerrand' },
  { id: 'de-phil-1',    category: 'german', name: 'Wiener Philharmoniker 1 oz',   metal: 'gold', carat: '24k', weight_grams: 31.1035, notes: 'Austrian 24k gold coin' },
  { id: 'de-phil-qtr',  category: 'german', name: 'Wiener Philharmoniker 1/4 oz', metal: 'gold', carat: '24k', weight_grams: 7.776,   notes: 'Austrian quarter ounce' },
  { id: 'de-maple-1',   category: 'german', name: 'Maple Leaf 1 oz',             metal: 'gold', carat: '24k', weight_grams: 31.1035, notes: 'Canadian 24k gold coin' },
  { id: 'de-pamp-1',    category: 'german', name: 'PAMP Suisse 1g',              metal: 'gold', carat: '24k', weight_grams: 1,       notes: 'Swiss gold bar' },
  { id: 'de-pamp-5',    category: 'german', name: 'PAMP Suisse 5g',              metal: 'gold', carat: '24k', weight_grams: 5,       notes: 'Swiss gold bar' },
  { id: 'de-pamp-10',   category: 'german', name: 'PAMP Suisse 10g',             metal: 'gold', carat: '24k', weight_grams: 10,      notes: 'Swiss gold bar' },
  { id: 'de-pamp-50',   category: 'german', name: 'PAMP Suisse 50g',             metal: 'gold', carat: '24k', weight_grams: 50,      notes: 'Swiss gold bar' },
  { id: 'de-pamp-100',  category: 'german', name: 'PAMP Suisse 100g',            metal: 'gold', carat: '24k', weight_grams: 100,     notes: 'Swiss gold bar' },

  // ── International ────────────────────────────────────────────────────────
  { id: 'int-eagle-1',    category: 'international', name: 'American Eagle 1 oz',     metal: 'gold',    carat: '22k',  weight_grams: 33.93,   notes: 'US 22k gold coin' },
  { id: 'int-panda-1',    category: 'international', name: 'Chinese Panda 1 oz',      metal: 'gold',    carat: '24k',  weight_grams: 31.1035, notes: 'Chinese 24k gold coin' },
  { id: 'int-bar-250',    category: 'international', name: 'Gold Bar 250g',            metal: 'gold',    carat: '24k',  weight_grams: 250,     notes: 'Investment grade gold bar' },
  { id: 'int-bar-500',    category: 'international', name: 'Gold Bar 500g',            metal: 'gold',    carat: '24k',  weight_grams: 500,     notes: 'Investment grade gold bar' },
  { id: 'int-bar-1kg',    category: 'international', name: 'Gold Bar 1 kg',            metal: 'gold',    carat: '24k',  weight_grams: 1000,    notes: 'Investment grade 1kg gold bar' },
  { id: 'int-ag-krug',    category: 'international', name: 'Silver Krügerrand 1 oz',  metal: 'silver',  carat: null,   weight_grams: 31.1035, notes: 'South African silver coin' },
  { id: 'int-ag-maple',   category: 'international', name: 'Silver Maple Leaf 1 oz',  metal: 'silver',  carat: null,   weight_grams: 31.1035, notes: 'Canadian silver coin' },
  { id: 'int-ag-phil',    category: 'international', name: 'Silver Philharmoniker 1 oz', metal: 'silver', carat: null, weight_grams: 31.1035, notes: 'Austrian silver coin' },
  { id: 'int-ag-bar-1kg', category: 'international', name: 'Silver Bar 1 kg',          metal: 'silver',  carat: null,   weight_grams: 1000,    notes: 'Investment grade silver bar' },
  { id: 'int-pt-maple',   category: 'international', name: 'Platinum Maple Leaf 1 oz', metal: 'platinum', carat: null, weight_grams: 31.1035, notes: 'Canadian platinum coin' },
];

export const CATEGORIES = [
  { key: 'turkish',       label: '🇹🇷 Turkish' },
  { key: 'german',        label: '🇩🇪 German' },
  { key: 'international', label: '🌍 International' },
  { key: 'custom',        label: '⭐ My Templates' },
];
