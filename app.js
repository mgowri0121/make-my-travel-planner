// Make My Travel — Fully Automatic Goal-Based Travel Planner
const $ = id => document.getElementById(id);
const KEY = 'mmt_free_trips_v2';

let trips = JSON.parse(localStorage.getItem(KEY) || '[]');
let currentId = null;
let generated = null;
let isEditPlanMode = false;

// Currency configuration and exchange rates relative to USD
const CURRENCY_CONFIG = {
  USD: { symbol: '$', rate: 1.0, locale: 'en-US', decimals: 0 },
  INR: { symbol: '₹', rate: 83.5, locale: 'en-IN', decimals: 0 },
  EUR: { symbol: '€', rate: 0.92, locale: 'fr-FR', decimals: 0 },
  GBP: { symbol: '£', rate: 0.79, locale: 'en-GB', decimals: 0 },
  JPY: { symbol: '¥', rate: 155.0, locale: 'ja-JP', decimals: 0 },
  AUD: { symbol: 'A$', rate: 1.52, locale: 'en-AU', decimals: 0 },
  CAD: { symbol: 'C$', rate: 1.37, locale: 'en-CA', decimals: 0 },
  AED: { symbol: 'AED ', rate: 3.67, locale: 'en-AE', decimals: 0 },
  SGD: { symbol: 'S$', rate: 1.35, locale: 'en-SG', decimals: 0 },
  THB: { symbol: '฿', rate: 36.5, locale: 'th-TH', decimals: 0 }
};

const save = () => localStorage.setItem(KEY, JSON.stringify(trips));

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function money(amount, currency = 'USD') {
  const num = Number(amount) || 0;
  const cfg = CURRENCY_CONFIG[currency] || { symbol: currency + ' ', locale: 'en-US', decimals: 0 };
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: cfg.decimals,
      minimumFractionDigits: cfg.decimals
    }).format(num);
  } catch (e) {
    return `${cfg.symbol}${Math.round(num).toLocaleString()}`;
  }
}

function convertUSD(usdAmount, targetCurrency = 'USD') {
  const rate = (CURRENCY_CONFIG[targetCurrency] || CURRENCY_CONFIG.USD).rate;
  return Math.round(usdAmount * rate);
}

function toast(text) {
  const t = $('toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// -----------------------------------------------------------------------------
// BUILT-IN TRAVEL KNOWLEDGE BASE
// -----------------------------------------------------------------------------
const DESTINATIONS = {
  hassan: {
    name: 'Hassan (Belur & Halebidu), Karnataka, India',
    stayAreas: [
      { name: 'Belur & Hassan Town', rationale: 'Central base close to Hassan railway station, local bus stands, markets, and direct highway to Belur Chennakeshava Temple.', bestFor: 'Transit convenience, markets & central access' },
      { name: 'Sakleshpur & Western Ghats Foothills', rationale: 'Misty hills, aromatic coffee and cardamom plantations, heritage homestays, and cool mountain breezes.', bestFor: 'Nature, coffee estates & tranquil stays' },
      { name: 'Shravanabelagola Foothills', rationale: 'Close to the historic Vindhyagiri hill and the colossal 57-foot Gommateshwara monolithic statue.', bestFor: 'Pilgrimage, heritage & spiritual serenity' }
    ],
    hotels: [
      { name: 'Hotel Suvarna Regency / Mayura Velapuri Belur', tier: 'budget', tierName: 'Comfortable Heritage Hotel', approxUSD: 18, amenities: ['Pure Veg Restaurant', 'AC Rooms', 'Travel Desk', 'Free Wi-Fi'], highlight: 'Reliable comfortable stay near major transport and temples' },
      { name: 'Hoysala Village Resort Hassan', tier: 'mid', tierName: 'Traditional Karnataka Resort', approxUSD: 72, amenities: ['Cottage Rooms', 'Swimming Pool', 'Ayurvedic Spa', 'Malnad Restaurant'], highlight: 'Rustic village architecture set in lush landscaped flowering gardens' },
      { name: 'Rosetta by Ferns Sakleshpur', tier: 'comfort', tierName: '5★ Luxury Coffee Plantation Resort', approxUSD: 210, amenities: ['Private Forest Villas', 'Infinity Pool', 'Fine Dining', 'Coffee Plantation Walk'], highlight: 'Exclusive luxury nestled amidst 100 acres of fragrant coffee and spice estates' }
    ],
    meals: {
      breakfast: { spot: 'Hotel Mayura Velapuri / Sri Krishna Bhavan', desc: 'Crispy golden benne masala dosa, soft idli-vada with coconut chutney, hot akki roti, and steaming filter coffee.', approxUSD: 3 },
      lunch: { spot: 'Hotel Suvarna Regency Hassan', desc: 'Authentic South Indian plantain leaf thali with saaru, sambar, kosambari, beetroot palya, curd, and obbattu or payasa.', approxUSD: 4 },
      dinner: { spot: 'Hoysala Village Dining / Malnad Kitchen', desc: 'Aromatic Malnad-style vegetable stew or country chicken curry paired with neer dosa, akki roti, and warm Mysore pak.', approxUSD: 8 }
    },
    foods: [
      { name: 'Akki Roti with Ennegayi', desc: 'Crispy rice flour flatbread spiced with cumin, onions, and coriander, served with spicy stuffed brinjal curry and fresh coconut chutney.', bestWhere: 'Local breakfast eateries in Hassan & Belur' },
      { name: 'Bisi Bele Bath with Kara Boondi', desc: 'Comforting, hot spiced rice and toor dal preparation slow-cooked with mixed vegetables, tamarind, and aromatic spice blend.', bestWhere: 'Traditional Brahmin tiffin rooms' },
      { name: 'Neer Dosa with Sagu', desc: 'Paper-thin, feather-light crepes made of delicate rice batter, served with spicy vegetable sagu and sweetened coconut milk.', bestWhere: 'Malnad family restaurants' },
      { name: 'Malnad Filter Kaapi', desc: 'Freshly roasted and ground local chicory-blended coffee brewed in brass filters with frothy boiled milk.', bestWhere: 'Coffee kiosks on Belur road' },
      { name: 'Authentic Mysore Pak', desc: 'Rich traditional royal confection made with roasted chickpea flour, generous pure ghee, and cardamom that melts on the tongue.', bestWhere: 'Historic sweet shops in Hassan town' }
    ],
    transport: {
      airport: { desc: 'Bengaluru Airport (BLR, 195km, 3.5 hrs via NH75) or Hassan Junction Railway Station (HAS)', costUSD: 16 },
      options: [
        { mode: 'Full-Day Tourist Taxi', desc: 'AC cab for the Belur-Halebidu-Shravanabelagola sightseeing circuit.', costUSD: 24, unit: 'per day' },
        { mode: 'KSRTC State Buses', desc: 'Frequent express buses connecting Hassan, Belur, and Halebidu.', costUSD: 0.8, unit: 'per ticket' },
        { mode: 'Auto-Rickshaws', desc: 'Quick rides for town sightseeing and station transfers.', costUSD: 1.5, unit: 'per ride' }
      ],
      tips: 'Hiring a dedicated taxi for the Belur-Halebidu-Shravanabelagola circuit allows relaxed temple photography without waiting for buses.'
    },
    dayPlans: [
      { title: 'Arrival, Shettihalli Rosary Church & Town Stroll', morning: 'Arrive at Hassan by train or car from Bengaluru, check in to your stay.', afternoon: 'Visit the hauntingly beautiful Shettihalli Rosary Church, a 19th-century French gothic church partially submerged in the Hemavathi reservoir.', evening: 'Enjoy aromatic Malnad filter coffee and hot masala dosa at the town center; stroll through the local spice market.', places: ['Shettihalli Rosary Church', 'Hassan Town Market'], tip: 'Shettihalli church is best photographed during sunset when water reflections catch the gothic arches.' },
      { title: 'Architectural Wonders of Belur & Halebidu', morning: 'Marvel at the 12th-century Chennakeshava Temple in Belur; admire thousands of intricate soapstone carvings of celestial dancers and epics.', afternoon: 'Short 20-minute drive to Halebidu; tour the grand Hoysaleswara Temple with twin sanctums and Nandi pavilions.', evening: 'Visit the peaceful Kedareshwara Temple and enjoy a traditional Karnataka thali dinner in Belur.', places: ['Belur Chennakeshava Temple', 'Halebidu Hoysaleswara Temple', 'Kedareshwara Temple'], tip: 'Hire an official ASI certified guide at Belur to understand the fascinating stories behind individual carvings.' },
      { title: 'The Monolith of Shravanabelagola', morning: 'Drive to Shravanabelagola; climb the granite steps of Vindhyagiri Hill to view the awe-inspiring 57-foot monolithic statue of Lord Bahubali (Gommateshwara).', afternoon: 'Visit Chandragiri Hill across the temple tank to explore ancient Jain basadis and historic rock inscriptions.', evening: 'Return to Hassan for evening snacks (akki roti and filter coffee) and relaxed dinner.', places: ['Vindhyagiri Hill Gommateshwara', 'Chandragiri Hill', 'Kalyani Temple Tank'], tip: 'Climb early in the morning before 9:00 AM before the granite rocks heat up under the sun.' },
      { title: 'Misty Sakleshpur, Coffee Estates & Manjarabad Fort', morning: 'Scenic morning drive into the Western Ghats to Sakleshpur; tour lush coffee and cardamom plantations.', afternoon: 'Climb the star-shaped Manjarabad Fort built by Tipu Sultan in 1792, offering 360-degree panoramic views of the Western Ghats.', evening: 'Enjoy fresh stream views at Magajahalli (Hanbal) Falls and savor estate-brewed coffee.', places: ['Sakleshpur Coffee Estates', 'Manjarabad Star Fort', 'Magajahalli Falls'], tip: 'Wear shoes with good traction when ascending the ramparts of Manjarabad Fort.' },
      { title: 'Gorur Dam, Local Spices & Farewell', morning: 'Visit the Hemavathi Reservoir at Gorur Dam and take a serene morning walk through the surrounding gardens.', afternoon: 'Pick up freshly roasted coffee beans, cardamom, pure honey, and sandalwood crafts at local emporiums.', evening: 'Enjoy a farewell South Indian meal before departing for Bengaluru or your onward journey.', places: ['Gorur Hemavathi Dam', 'Malnad Spice & Coffee Emporiums'], tip: 'Confirm reservoir viewing permissions at Gorur Dam security gate upon arrival.' }
    ],
    packing: ['Comfortable cotton clothing', 'Socks (granite stones get hot when walking barefoot in temples)', 'Slip-on footwear for temples', 'Sun hat & sunscreen', 'Light sweater for Sakleshpur evenings'],
    dailyBaselineUSD: { budget: 20, balanced: 55, comfort: 160 },
    budgetTips: [
      'Belur and Halebidu Hoysala temples have modest ASI entry tickets (free/minimal fee for Indian nationals, great value for internationals).',
      'KSRTC non-AC buses ply between Hassan, Belur, and Halebidu every 15-20 minutes for under ₹40.',
      'Authentic plantain-leaf South Indian thalis at local vegetarian canteens cost under ₹100-150 ($1.50-2).'
    ]
  },

  bali: {
    name: 'Bali, Indonesia',
    stayAreas: [
      { name: 'Ubud', rationale: 'Cultural heart surrounded by lush rainforest, rice terraces, yoga retreats & art markets. Ideal for peace and culture.', bestFor: 'Culture, nature & serenity' },
      { name: 'Seminyak & Canggu', rationale: 'Trendy beach clubs, vibrant sunsets, world-class cafes, boutique shopping, and lively evening social scenes.', bestFor: 'Nightlife, dining & beach clubs' },
      { name: 'Sanur & Nusa Dua', rationale: 'Calm ocean waters, paved beachfront promenades, upscale beach resorts, and family-friendly atmosphere.', bestFor: 'Families & relaxing oceanfront stays' }
    ],
    hotels: [
      { name: 'Puji Hostel & Bungalows Ubud', tier: 'budget', tierName: 'Budget Guesthouse', approxUSD: 20, amenities: ['Swimming Pool', 'Rice Field Views', 'Free Breakfast', 'Wi-Fi'], highlight: 'Relaxed pool overlooking lush rice paddies' },
      { name: 'Plataran Ubud Hotel & Spa', tier: 'mid', tierName: 'Mid-Range Boutique', approxUSD: 85, amenities: ['Infinity Pool', 'Balinese Spa', 'Garden Dining', 'Free Shuttle'], highlight: 'Charming boutique hotel immersed in quiet greenery' },
      { name: 'Maya Ubud Resort & Spa', tier: 'comfort', tierName: 'Luxury Valley Resort', approxUSD: 260, amenities: ['Private River Villas', 'Two Pools', 'Fine Dining', 'Forest Spa'], highlight: 'Dramatic cliffside villas above the Petanu River' }
    ],
    meals: {
      breakfast: { spot: 'Clear Café Ubud / Revolver Espresso', desc: 'Fresh tropical smoothie bowls, artisanal espresso, sourdough toasts & tropical fruit platters.', approxUSD: 7 },
      lunch: { spot: 'Warung Babi Guling Ibu Oka / Nalu Bowls', desc: 'Authentic roasted suckling pig rice bowl or vibrant acai bowls near the beach.', approxUSD: 9 },
      dinner: { spot: 'Jimbaran Bay Seafood / Merah Putih', desc: 'Candlelit fresh seafood barbecue right on the beach sand, or modern Indonesian upscale dining.', approxUSD: 18 }
    },
    foods: [
      { name: 'Nasi Campur Bali', desc: 'Fragrant steamed rice served with an assortment of spiced meats, sate lilit, lawar vegetables, and sambal matah.', bestWhere: 'Local Warungs in Ubud & Sanur' },
      { name: 'Babi Guling', desc: 'Traditional spit-roasted suckling pig marinated in rich Balinese bumbu spices with crispy crackling.', bestWhere: 'Warung Ibu Oka or Pak Malen' },
      { name: 'Sate Lilit', desc: 'Minced fish or chicken spiced with coconut milk and lemongrass, grilled over fragrant coconut husks.', bestWhere: 'Jimbaran & Gianyar Night Market' },
      { name: 'Bebek Betutu', desc: 'Whole duck slow-cooked for 8 hours in banana leaves infused with turmeric, galangal, and shallots.', bestWhere: 'Bebek Bengil (Dirty Duck Diner)' },
      { name: 'Dadar Gulung', desc: 'Bright green pandan crepes filled with freshly grated sweet coconut and warm melted palm sugar.', bestWhere: 'Traditional morning markets' }
    ],
    transport: {
      airport: { desc: 'Ngurah Rai (DPS) Airport Taxi or pre-booked driver to Ubud / Seminyak', costUSD: 18 },
      options: [
        { mode: 'Grab / Gojek Rides', desc: 'Short rides and food deliveries via smartphone app in South Bali.', costUSD: 4, unit: 'per ride' },
        { mode: 'Daily Scooter Rental', desc: 'Convenient navigation through island traffic (helmet & license required).', costUSD: 7, unit: 'per day' },
        { mode: 'Private Car & Driver', desc: 'Comfortable air-conditioned 10-hour day hire with custom sightseeing route.', costUSD: 42, unit: 'per day' }
      ],
      tips: 'Taxis without meters can overcharge; always use Grab/Gojek or licensed Bluebird Taxis with running meters.'
    },
    dayPlans: [
      { title: 'Arrival, Ocean Sunset & Beachfront Dinner', morning: 'Arrive at Denpasar Airport, transfer to your hotel and settle in.', afternoon: 'Unpack, refresh with a dip in the pool, and take a gentle stroll around the neighborhood.', evening: 'Catch a glorious sunset over the Indian Ocean followed by dinner at a beachfront café.', places: ['Echo Beach', 'Tanah Lot Temple'], tip: 'Exchange currency at official bank counters or authorized money changers.' },
      { title: 'Sacred Temples, Rice Terraces & Art Markets', morning: 'Early morning visit to Tegallalang Rice Terraces to avoid mid-day heat and tour the jungle swings.', afternoon: 'Visit the Sacred Monkey Forest Sanctuary and explore traditional handicrafts at Ubud Art Market.', evening: 'Watch a traditional Balinese Legong or Kecak dance performance at Ubud Royal Palace.', places: ['Tegallalang Terraces', 'Monkey Forest Sanctuary', 'Ubud Palace'], tip: 'Keep loose sunglasses and shiny objects secured around monkeys.' },
      { title: 'Holy Springs, Waterfalls & Coffee Plantations', morning: 'Experience a traditional purification blessing ceremony at Tirta Empul Holy Water Temple.', afternoon: 'Trek to scenic Tegenungan or Tibumana Waterfall and sample organic Luwak coffee at a spice plantation.', evening: 'Enjoy a leisurely farm-to-table dinner in Penestanan village.', places: ['Tirta Empul', 'Tibumana Waterfall', 'Satria Plantation'], tip: 'Wear respectful attire (sarongs provided at temples).' },
      { title: 'Island Adventure or Coastal Relaxation', morning: 'Take a scenic speedboat day trip to Nusa Penida (Kelingking Cliff) or relax at Seminyak beach.', afternoon: 'Browse independent designer boutiques and sip iced coconuts by the surf.', evening: 'Visit the dramatic Uluwatu Temple perched on a 70m sea cliff for sunset and Kecak fire dance.', places: ['Uluwatu Clifftop Temple', 'Nusa Penida / Seminyak Coast'], tip: 'Book fast-boat tickets in advance if traveling to the outer islands.' },
      { title: 'Balinese Spa, Souvenir Hunting & Farewell', morning: 'Indulge in a 90-minute traditional Balinese herbal oil massage and flower bath.', afternoon: 'Pick up souvenirs like handmade woven bags, vanilla pods, and Balinese coffee at Krisna Oleh-Oleh.', evening: 'Enjoy a farewell dinner by the beach and transfer to Denpasar Airport for your return journey.', places: ['Krisna Souvenir Market', 'Jimbaran Bay'], tip: 'Allow at least 3 hours before flight departure due to Denpasar airport traffic.' }
    ],
    packing: ['Light linen clothing', 'High SPF sunscreen', 'Mosquito repellent', 'Temple sarong', 'Waterproof pouch', 'Universal power adapter', 'Comfortable sandals'],
    dailyBaselineUSD: { budget: 35, balanced: 80, comfort: 210 },
    budgetTips: [
      'Eat at family-run local warungs for delicious meals under $3-5.',
      'Hiring a private driver for a group is often cheaper and safer than multiple taxis.',
      'Drink bottled or filtered water rather than tap water.'
    ]
  },

  goa: {
    name: 'Goa, India',
    stayAreas: [
      { name: 'North Goa (Anjuna & Vagator)', rationale: 'Vibrant beach clubs, nightlife, trendy cafes, lively flea markets, and water sport action.', bestFor: 'Nightlife, social scenes & parties' },
      { name: 'South Goa (Palolem & Benaulim)', rationale: 'Pristine white sand coves, peaceful dolphin boat trips, luxury beach resorts, and serenity.', bestFor: 'Couples, families & tranquil beaches' },
      { name: 'Panaji / Fontainhas', rationale: 'Historic Portuguese Latin Quarter with colorful colonial architecture, art galleries, and heritage dining.', bestFor: 'Heritage, culture & street photography' }
    ],
    hotels: [
      { name: 'Zostel Goa (Morjim / Palolem)', tier: 'budget', tierName: 'Backpacker Stay', approxUSD: 16, amenities: ['Beach Access', 'Social Cafe', 'Wi-Fi', 'Air Conditioning'], highlight: 'Friendly travelers community right by the coast' },
      { name: 'Casa Severina / Vivenda dos Palhaços', tier: 'mid', tierName: 'Heritage Boutique Hotel', approxUSD: 65, amenities: ['Swimming Pool', 'Portuguese Decor', 'Breakfast', 'Lush Gardens'], highlight: 'Colonial charm with vintage Goan hospitality' },
      { name: 'Taj Exotica Resort & Spa Benaulim', tier: 'comfort', tierName: '5★ Luxury Beachfront Resort', approxUSD: 240, amenities: ['Private Beachfront', 'Golf Course', 'Jiva Spa', 'Multiple Fine Dining'], highlight: 'Mediterranean-style luxury sprawling across 56 acres of beach' }
    ],
    meals: {
      breakfast: { spot: 'Café Bodega Altinho / Artjuna Cafe', desc: 'Freshly baked poi bread with Goan sausages, shakshuka, fresh juices, and organic espresso.', approxUSD: 5 },
      lunch: { spot: 'Vinayak Family Restaurant / Ritz Classic', desc: 'Famous authentic Goan fish curry thali with rava-fried kingfish, sol kadhi, and crab masala.', approxUSD: 6 },
      dinner: { spot: "Fisherman's Wharf / Thalassa Siolim", desc: 'Sunset waterfront dining with Greek or Goan seafood grills, bebinca dessert, and signature cocktails.', approxUSD: 14 }
    },
    foods: [
      { name: 'Goan Fish Curry Thali', desc: 'Steaming rice with coconut-and-kokum spiced fish curry, fried kingfish, clams, and cooling sol kadhi.', bestWhere: 'Vinayak Restaurant (Assagao) & Ritz Classic' },
      { name: 'Chicken or Pork Xacuti', desc: 'Rich, intensely aromatic curry made with roasted grated coconut, white poppy seeds, and Kashmiri chilies.', bestWhere: 'Florentine Bar & Restaurant' },
      { name: 'Pork Vindaloo with Poi', desc: 'Tangy and fiery stew made with wine vinegar, garlic, and slow-cooked meat paired with crusty Goan poi bread.', bestWhere: 'Martin’s Corner (Betalbatim)' },
      { name: 'Prawn Balchão', desc: 'Fiery and tangy pickled prawn relish simmered in vinegar, red chilies, and aromatic Goan spices.', bestWhere: 'Mum’s Kitchen (Panaji)' },
      { name: 'Bebinca', desc: 'Traditional 7-to-16 layered Goan dessert made of coconut milk, ghee, egg yolks, and nutmeg.', bestWhere: 'Pastry bakeries in Panaji & Mapusa' }
    ],
    transport: {
      airport: { desc: 'Dabolim / Mopa (GOX) Pre-paid or GoaMiles App Taxi to beach towns', costUSD: 18 },
      options: [
        { mode: 'Scooter / Activa Rental', desc: 'The most popular, enjoyable way to explore Goan backroads.', costUSD: 6, unit: 'per day' },
        { mode: 'GoaMiles / Pre-paid Taxis', desc: 'Regulated cab rides between North and South Goa.', costUSD: 16, unit: 'per trip' },
        { mode: 'Self-Drive Car (Thar / Swift)', desc: 'Ideal for groups wishing to travel between North and South Goa.', costUSD: 25, unit: 'per day' }
      ],
      tips: 'Negotiate cab fares beforehand or use the state-approved GoaMiles app for transparent rates.'
    },
    dayPlans: [
      { title: 'Arrival, Beach Walk & Sunset Shack Dinner', morning: 'Arrive at Goa Airport, check in to your accommodation and rent a scooter.', afternoon: 'Unwind at Vagator or Palolem Beach; enjoy fresh coconut water under palm trees.', evening: 'Watch the sunset with live music at a beach shack and relish fresh butter-garlic prawns.', places: ['Vagator / Palolem Beach', 'Chapora Fort View'], tip: 'Always confirm the scooter fuel gauge and check brakes before driving.' },
      { title: 'Historic Panaji, Fontainhas & Old Goa Churches', morning: 'Heritage walking tour through Fontainhas Latin Quarter with brightly colored Portuguese houses.', afternoon: 'Visit the 400-year-old Basilica of Bom Jesus and Se Cathedral in Old Goa.', evening: 'Take a sunset cruise along the Mandovi River or enjoy craft cocktails at a Fontainhas tavern.', places: ['Fontainhas Latin Quarter', 'Basilica of Bom Jesus', 'Mandovi River'], tip: 'Churches require modest dress covering shoulders and knees.' },
      { title: 'Coastal Forts, Water Sports & Night Markets', morning: 'Visit the 17th-century Fort Aguada and its historic lighthouse overlooking the Arabian Sea.', afternoon: 'Try jet-skiing or parasailing at Sinquerim beach, followed by a relaxed Goan fish thali.', evening: 'Explore the Anjuna Flea Market or Saturday Night Market in Arpora for live bands and crafts.', places: ['Fort Aguada', 'Sinquerim Beach', 'Anjuna / Arpora Market'], tip: 'Only swim in areas with active lifeguards and red-and-yellow flags.' },
      { title: 'Spice Plantations, Waterfalls & Backwaters', morning: 'Guided tour of Sahakari Spice Farm with a traditional buffet lunch served on banana leaves.', afternoon: 'Visit Harvalem Waterfall or take a backwater boat cruise looking for kingfishers and otters.', evening: 'Dine at Martin’s Corner with Goan pork vindaloo and live acoustic performance.', places: ['Sahakari Spice Farm', 'Dudhsagar / Harvalem Falls'], tip: 'Wear sturdy walking shoes for spice plantation trails.' },
      { title: 'Souvenir Shopping, Goan Bakeries & Departure', morning: 'Visit Mapusa or Panaji market for Goan cashews, homemade feni, spices, and bebinca.', afternoon: 'Enjoy a farewell lunch at an atmospheric café like Café Bodega.', evening: 'Return rental vehicle and head to the airport for your return flight.', places: ['Panaji Market', 'Goan Bakeries'], tip: 'Ensure cashews are bought vacuum-packed from authorized stores.' }
    ],
    packing: ['Cotton beachwear', 'Swimwear', 'Sunglasses & sun hat', 'Sunscreen', 'Driving license for scooter', 'Flip-flops & walking sandals'],
    dailyBaselineUSD: { budget: 25, balanced: 65, comfort: 180 },
    budgetTips: [
      'Renting an Activa/scooter saves significant money compared to hailing point-to-point private taxis.',
      'Local Goan thalis at family dhabas cost less than ₹200 ($2.50) and are fresher than fancy restaurants.',
      'Travel in shoulder seasons (October or February-March) for 40% cheaper luxury hotel rates.'
    ]
  },

  manali: {
    name: 'Manali, Himachal Pradesh, India',
    stayAreas: [
      { name: 'Old Manali', rationale: 'Bohemian cafes, apple orchards, quiet cedar trails, backpacker culture, and scenic mountain views.', bestFor: 'Cafes, backpackers & relaxed vibes' },
      { name: 'Log Huts / Aleo', rationale: 'Pine-fringed hillside cottages with Beas river vistas away from the bustling town center.', bestFor: 'Scenic mountain serenity & couples' },
      { name: 'Mall Road / Central Manali', rationale: 'Immediate access to the main bus station, government taxi stands, shops, and restaurants.', bestFor: 'Convenience, shopping & transport' }
    ],
    hotels: [
      { name: 'The Hosteller Manali / Zostel Old Manali', tier: 'budget', tierName: 'Mountain Hostel', approxUSD: 18, amenities: ['Mountain Views', 'Bonfire Area', 'High-Speed Wi-Fi', 'Cafe'], highlight: 'Panoramic Himalayan views with lively traveler meetups' },
      { name: 'Johnson Lodge & Spa', tier: 'mid', tierName: 'Alpine Wooden Lodge', approxUSD: 70, amenities: ['Fireplace Rooms', 'Spa & Sauna', 'Trout Restaurant', 'Orchard Garden'], highlight: 'Historic wooden lodge nestled amongst apple trees' },
      { name: 'The Himalayan Castle Resort', tier: 'comfort', tierName: 'Luxury Victorian Castle', approxUSD: 230, amenities: ['Victorian Architecture', 'Heated Pool', 'Orchard Cottages', 'Fine Dining'], highlight: 'Grand gothic castle perched high above Manali valley' }
    ],
    meals: {
      breakfast: { spot: "Dylan's Toasted & Roasted / Café 1947", desc: 'Fresh apple cinnamon pancakes, roasted coffee, wood-fired toasts, and shakshuka.', approxUSD: 5 },
      lunch: { spot: 'Chopsticks / Local Dhaba in Vashisht', desc: 'Steaming Tibetan chicken momos, hearty thukpa noodle soup, and hot Himachali siddu with ghee.', approxUSD: 6 },
      dinner: { spot: "The Johnson's Bar / Himachali Dham Center", desc: 'Fresh pan-fried Beas river trout with almond butter sauce or authentic traditional Dham feast.', approxUSD: 12 }
    },
    foods: [
      { name: 'Himachali Siddu', desc: 'Steamed wheat dough dumpling stuffed with crushed walnuts, poppy seeds, and herbs, dipped in hot desi ghee.', bestWhere: 'Local street stalls in Old Manali & Vashisht' },
      { name: 'Fresh Himalayan Trout', desc: 'Fresh river trout marinated simply with mountain herbs, lemon, and pan-fried until golden and flaky.', bestWhere: "Johnson's Cafe & The Lazy Dog" },
      { name: 'Himachali Dham', desc: 'Traditional festive multi-course vegetarian feast featuring Madra (chickpeas in yogurt), Khatta, and sweet rice.', bestWhere: 'Heritage dining spots in Naggar' },
      { name: 'Tibetan Thukpa & Tingmo', desc: 'Comforting piping hot broth loaded with hand-pulled noodles, vegetables, and steamed fluffy bread.', bestWhere: 'Chopsticks Restaurant on Mall Road' },
      { name: 'Kullu Fresh Apple Juice & Cider', desc: 'Freshly pressed crisp juice from local orchards, served cold or spiced warm.', bestWhere: 'Orchard stalls along Old Manali road' }
    ],
    transport: {
      airport: { desc: 'Bhuntar Airport (KUU) / Volvo Bus Stand taxi transfer into Manali town', costUSD: 16 },
      options: [
        { mode: 'Local Taxi Union Cabs', desc: 'Fixed-rate registered cabs for Rohtang Pass and Solang Valley.', costUSD: 28, unit: 'per day trip' },
        { mode: 'Royal Enfield / Scooty Rental', desc: 'Explore mountain passes and nearby villages independently.', costUSD: 14, unit: 'per day' },
        { mode: 'Auto-Rickshaws & Walking', desc: 'Mall Road to Old Manali rides and scenic riverside walking.', costUSD: 2, unit: 'per ride' }
      ],
      tips: 'Book Rohtang Pass permits online a few days ahead as daily vehicle counts are strictly capped.'
    },
    dayPlans: [
      { title: 'Arrival, Cedar Forests & Hadimba Temple', morning: 'Arrive in Manali, settle in to your hotel and acclimatize to the mountain altitude.', afternoon: 'Walk through deodar cedar forests to the 500-year-old wooden Hadimba Devi Temple.', evening: 'Explore Old Manali lanes, browse woolen scarves, and dine by the rushing Manalsu river.', places: ['Hadimba Devi Temple', 'Old Manali Lanes'], tip: 'Take it easy on your first day to adjust to 2,050m elevation.' },
      { title: 'Solang Valley Adventure & Atal Tunnel', morning: 'Drive to Solang Valley for paragliding, zorbing, or cable car ride with snow-capped views.', afternoon: 'Drive through the engineering marvel Atal Tunnel into Lahaul Valley to visit Sissu Waterfall.', evening: 'Return to Manali for hot momos and apple cider by a warm café fireplace.', places: ['Solang Valley', 'Atal Tunnel', 'Sissu Waterfall'], tip: 'Carry warm windbreakers even in summer as high passes get cold quickly.' },
      { title: 'Jogini Waterfalls Trek & Vashisht Hot Springs', morning: 'Scenic 3km nature hike from Vashisht village through pine woods up to Jogini Waterfall.', afternoon: 'Dip feet in the natural sulphur hot springs at Vashisht and enjoy a picnic lunch.', evening: 'Stroll down Mall Road for souvenir shopping and Tibetan handicrafts.', places: ['Jogini Waterfall', 'Vashisht Hot Springs', 'Mall Road'], tip: 'Wear proper hiking shoes with good grip on rocky trails.' },
      { title: 'Naggar Castle & Roerich Art Gallery', morning: 'Take a scenic day trip to the 15th-century Naggar Castle overlooking the Beas valley.', afternoon: 'Visit the Nicholas Roerich Art Gallery and sample authentic Himachali Dham lunch.', evening: 'Stop at a riverside trout hatchery and enjoy dinner at an apple orchard bistro.', places: ['Naggar Castle', 'Roerich Art Gallery', 'Beas Riverfront'], tip: 'Naggar offers stunning 360-degree mountain valley photography angles.' },
      { title: 'Tibetan Monastery, Souvers & Departure', morning: 'Visit the serene Gadhan Thekkchokling Gompa Tibetan Monastery for morning prayers.', afternoon: 'Shop for authentic Kullu shawls, organic honey, and dried apricots.', evening: 'Board the evening Volvo bus or depart for your return journey.', places: ['Tibetan Monastery', 'Mall Road Handicraft Emporiums'], tip: 'Look for the official Handloom mark on authentic Kullu shawls.' }
    ],
    packing: ['Warm fleece & jacket', 'Thermal inners (Oct-April)', 'Sturdy hiking boots', 'Sunglasses for snow glare', 'Lip balm & moisturizer', 'Rain poncho'],
    dailyBaselineUSD: { budget: 22, balanced: 60, comfort: 170 },
    budgetTips: [
      'Take overnight luxury HRTC Volvo buses from Delhi/Chandigarh instead of expensive Bhuntar flights.',
      'Old Manali cafes offer huge portions of wholesome food at half the price of tourist-trap hotels.',
      'Shared taxis for Solang Valley save up to 70% compared to private car hire.'
    ]
  },

  paris: {
    name: 'Paris, France',
    stayAreas: [
      { name: 'Le Marais (3rd & 4th Arr.)', rationale: 'Historic cobblestone alleys, hip fashion boutiques, art galleries, world-class bakeries, walkable to the Louvre.', bestFor: 'Boutique vibes, dining & walkability' },
      { name: 'Latin Quarter & Saint-Germain (5th & 6th)', rationale: 'Literary heritage, Luxembourg Gardens, atmospheric bistros, jazz clubs, and intellectual charm.', bestFor: 'Romance, classic Paris & gardens' },
      { name: 'Montmartre (18th Arr.)', rationale: 'Bohemian hilltop atmosphere, Sacré-Cœur basilica views, artist squares, and charming budget hotels.', bestFor: 'Scenic panoramas & bohemian spirit' }
    ],
    hotels: [
      { name: 'The People Paris Marais / Generator', tier: 'budget', tierName: 'Design Poshtel / Hostel', approxUSD: 45, amenities: ['Rooftop Bar', 'Metro Access', 'High-Speed Wi-Fi', 'Luggage Lockers'], highlight: 'Chic modern design with panoramic rooftop terrace' },
      { name: 'Hôtel Caron de Beaumarchais', tier: 'mid', tierName: 'Historic 3★ Boutique', approxUSD: 180, amenities: ['Period French Decor', 'Marais Location', 'Breakfast in Bed', 'Air Conditioning'], highlight: 'Intimate 18th-century Parisian charm in the heart of Le Marais' },
      { name: 'Le Bristol Paris / Hôtel Plaza Athénée', tier: 'comfort', tierName: '5★ Palace Hotel', approxUSD: 850, amenities: ['Michelin 3★ Dining', 'Rooftop Pool', 'Luxury Courtyard', 'Luxury Spa'], highlight: 'Iconic Parisian haute luxury with private garden courtyards' }
    ],
    meals: {
      breakfast: { spot: 'Du Pain et des Idées / Café de Flore', desc: 'Flaky warm butter croissants, pain au chocolat, café au lait, and fresh orange juice.', approxUSD: 9 },
      lunch: { spot: 'Breizh Café / L’As du Fallafel / Le Comptoir du Relais', desc: 'Savory buckwheat galettes with cider, famous Marais falafel, or classic croque-monsieur.', approxUSD: 18 },
      dinner: { spot: 'Bouillon Chartier / Le Relais de l’Entrecôte', desc: 'Traditional French steak frites with secret herb sauce, beef bourguignon, and crème brûlée.', approxUSD: 32 }
    },
    foods: [
      { name: 'French Croissants & Baguettes', desc: 'Crispy, shatteringly flaky all-butter pastries and warm crusty baguettes from artisan boulangeries.', bestWhere: 'Du Pain et des Idées (10th Arr.)' },
      { name: 'Boeuf Bourguignon', desc: 'Tender beef braised for hours in Burgundy red wine with baby carrots, pearl onions, and button mushrooms.', bestWhere: 'Classic Parisian Bouillons' },
      { name: 'Duck Confit (Confit de Canard)', desc: 'Salt-cured duck leg slow-cooked in its own fat until fork-tender with golden crispy skin, served with garlic potatoes.', bestWhere: 'Bistros in Le Marais' },
      { name: 'Crêpes & Galettes', desc: 'Thin savory buckwheat galettes filled with melted Gruyère, ham, and egg, followed by sweet salted caramel crêpes.', bestWhere: 'Breizh Café (Rue Vieille du Temple)' },
      { name: 'Artisan Macarons', desc: 'Delicate almond meringue shells filled with rich chocolate ganache, pistachio, raspberry, or salted caramel.', bestWhere: 'Pierre Hermé & Ladurée' }
    ],
    transport: {
      airport: { desc: 'RER B train from CDG Airport to Châtelet-Les Halles (€11.80) or official taxi (€55-65 flat rate)', costUSD: 14 },
      options: [
        { mode: 'Paris Metro & RER (Navigo Easy)', desc: 'Extensive subway lines covering every quarter with trains every 2-4 minutes.', costUSD: 2.3, unit: 'per trip' },
        { mode: 'Vélib’ Bike Share', desc: 'Electric and classic bicycle rental stations across the entire city.', costUSD: 5.5, unit: 'per day pass' },
        { mode: 'Walking', desc: 'Paris is supremely walkable; many major sights are within pleasant walking distances.', costUSD: 0, unit: 'free' }
      ],
      tips: 'Never buy metro tickets from scalpers; use official RATP ticket kiosks or reloadable Navigo cards.'
    },
    dayPlans: [
      { title: 'The Seine River, Notre-Dame & Saint-Germain', morning: 'Arrive in Paris, drop bags at your hotel, and walk along the banks of the Seine.', afternoon: 'Admire Notre-Dame Cathedral plaza, stroll through Île de la Cité, and browse bouquinistes stalls.', evening: 'Take a sunset cruise along the Seine to see city monuments lit up, ending with dinner in Saint-Germain.', places: ['Seine River Banks', 'Notre-Dame Cathedral', 'Île Saint-Louis'], tip: 'Purchase Seine river cruise tickets online for discounted departures.' },
      { title: 'The Louvre, Tuileries & Champs-Élysées', morning: 'Morning timed-entry at the Louvre Museum to see the Mona Lisa, Venus de Milo, and Winged Victory.', afternoon: 'Stroll through Tuileries Garden, past Place de la Concorde, and up the Avenue des Champs-Élysées.', evening: 'Climb the Arc de Triomphe for sunset views radiating down twelve grand Parisian avenues.', places: ['Louvre Museum', 'Tuileries Gardens', 'Arc de Triomphe'], tip: 'Reserve Louvre timed slots weeks in advance; enter via the Carrousel du Louvre underground mall.' },
      { title: 'Eiffel Tower, Orsay Museum & Le Marais', morning: 'View the Eiffel Tower from Trocadéro gardens and ascend to the summit or second floor.', afternoon: 'Cross the river to Musée d’Orsay to admire masterpieces by Monet, Van Gogh, and Renoir.', evening: 'Explore the vibrant Le Marais district for boutique browsing, falafel, and cozy wine bars.', places: ['Eiffel Tower', 'Musée d’Orsay', 'Le Marais'], tip: 'Eiffel Tower sparkles for 5 minutes at the beginning of every hour after dusk.' },
      { title: 'Montmartre, Sacré-Cœur & Bohemian Cafes', morning: 'Climb the stairs or take the funicular to Sacré-Cœur Basilica for panoramic vistas over Paris.', afternoon: 'Wander the cobbled lanes of Montmartre, watch portrait artists at Place du Tertre, visit Dalí Paris.', evening: 'Enjoy a classic French dinner at a traditional neighborhood bouillon like Bouillon Pigalle.', places: ['Sacré-Cœur Basilica', 'Place du Tertre', 'Montmartre Windmills'], tip: 'Avoid the string bracelet scam artists at the base of Sacré-Cœur steps.' },
      { title: 'Luxembourg Gardens, Bakeries & Farewell', morning: 'Enjoy a quiet morning stroll through Luxembourg Gardens with coffee and freshly baked croissants.', afternoon: 'Browse historic bookstore Shakespeare and Company and pick up gourmet French teas and chocolates.', evening: 'Enjoy a farewell dinner with French wine before heading to the airport or train station.', places: ['Luxembourg Gardens', 'Latin Quarter', 'Shakespeare and Company'], tip: 'Keep airport transfer timing generous (CDG security queues can take 45+ minutes).' }
    ],
    packing: ['Comfortable walking shoes', 'Chic smart-casual layers', 'Crossbody anti-theft bag', 'Universal EU power plug', 'Compact umbrella', 'Reusable water bottle'],
    dailyBaselineUSD: { budget: 70, balanced: 175, comfort: 480 },
    budgetTips: [
      'Boulangerie set menus (sandwich + pastry + drink) cost just €8-10 for a delicious gourmet lunch.',
      'Many national museums (Louvre, Orsay) are free on the first Sunday of the month (reservation required).',
      'Order "une carafe d’eau" (tap water) in restaurants — it is clean, safe, and legally free in France.'
    ]
  },

  tokyo: {
    name: 'Tokyo, Japan',
    stayAreas: [
      { name: 'Shinjuku & Shibuya', rationale: 'Ultra-connected transit hubs, neon skyscrapers, endless restaurants, shopping, and nightlife.', bestFor: 'Vibrant energy, first-timers & nightlife' },
      { name: 'Asakusa & Ueno', rationale: 'Historic temples, quiet residential streets, scenic Sumida riverfront, budget-friendly hotels, direct airport lines.', bestFor: 'Traditional culture, families & budget' },
      { name: 'Ginza & Tokyo Station', rationale: 'Sophisticated architecture, luxury department stores, world-class dining, and direct Shinkansen bullet train access.', bestFor: 'Luxury, fine dining & Shinkansen travel' }
    ],
    hotels: [
      { name: 'Resol Poshtel Tokyo Asakusa / Nui. Hostel', tier: 'budget', tierName: 'Boutique Poshtel / Capsule', approxUSD: 38, amenities: ['Individual Privacy Pods', 'Cafe Lounge', 'Subway Access', 'High-Speed Wi-Fi'], highlight: 'Minimalist Japanese comfort with cozy modern pod design' },
      { name: 'Hotel Gracery Shinjuku', tier: 'mid', tierName: 'Modern City Hotel', approxUSD: 140, amenities: ['Iconic Godzilla Head Terrace', 'Shinjuku Station 5m Walk', 'Bathtubs in All Rooms', 'City Views'], highlight: 'Famous landmark hotel located in the heart of Kabukicho' },
      { name: 'Aman Tokyo / Park Hyatt', tier: 'comfort', tierName: '5★ Luxury Sanctuary', approxUSD: 650, amenities: ['Panoramic Mount Fuji Views', 'Traditional Onsen Spa', 'Sake Cellar', 'Fine Japanese Dining'], highlight: 'Serene Japanese minimalist sanctuary floating high above the capital' }
    ],
    meals: {
      breakfast: { spot: 'Tsukiji Outer Market / Onigiri Bongo', desc: 'Warm tamagoyaki omelet, fresh tuna nigiri, or hand-pressed gourmet onigiri with miso soup.', approxUSD: 8 },
      lunch: { spot: 'Ichiran Ramen / Tenya Tempura', desc: 'Customizable rich Tonkotsu ramen with soft-boiled egg, or crispy prawn tendon over seasoned rice.', approxUSD: 11 },
      dinner: { spot: 'Omoide Yokocho / Sukiyaki Imahan', desc: 'Charcoal-grilled yakitori skewers in atmospheric alleys, or melting A5 Wagyu sukiyaki.', approxUSD: 24 }
    },
    foods: [
      { name: 'Edomae Sushi & Sashimi', desc: 'Fresh seasonal fish sliced to perfection by sushi artisans over seasoned vinegared sushi rice.', bestWhere: 'Tsukiji Outer Market & Toyosu' },
      { name: 'Tonkotsu & Shoyu Ramen', desc: 'Rich, flavorful broth simmered for 16 hours, paired with springy noodles, chashu pork, and nori seaweed.', bestWhere: 'Ichiran (Shinjuku) & Rokurinsha (Tokyo Station)' },
      { name: 'A5 Kuroge Wagyu Beef', desc: 'Unbelievably marbled Japanese beef seared on charcoal grills or cooked table-side in sweet sukiyaki sauce.', bestWhere: 'Sukiyaki Imahan & Gyukatsu Motomura' },
      { name: 'Crispy Tempura', desc: 'Fresh black tiger prawns and seasonal vegetables coated in feather-light batter and fried to golden perfection.', bestWhere: 'Tempura Kondo & Daikokuya Asakusa' },
      { name: 'Matcha Desserts & Mochi', desc: 'Rich, bittersweet ceremonial matcha soft-serve, warabi mochi, and warm taiyaki filled with red bean.', bestWhere: 'Suzukien Asakusa (7 intensity levels of matcha)' }
    ],
    transport: {
      airport: { desc: 'Keisei Skyliner (to Ueno 41m, $16) or Narita Express (to Shinjuku 60m, $22)', costUSD: 19 },
      options: [
        { mode: 'Tokyo Subway 24/48/72hr Pass', desc: 'Unlimited rides across all Tokyo Metro and Toei Subway lines.', costUSD: 5.5, unit: 'per day' },
        { mode: 'Suica / Pasmo IC Card', desc: 'Tap-and-go contactless card for JR Yamanote loop line and local buses.', costUSD: 1.5, unit: 'per ride' },
        { mode: 'Taxis (GO Taxi App)', desc: 'Immaculately clean automatic-door cabs for late-night rides.', costUSD: 14, unit: 'per short ride' }
      ],
      tips: 'Load a digital Suica card onto Apple/Google Wallet for seamless transit and konbini purchases.'
    },
    dayPlans: [
      { title: 'Neon Skylines, Shibuya Crossing & Harajuku', morning: 'Arrive, obtain IC transit card, and check in to your hotel.', afternoon: 'Experience the world-famous Shibuya Scramble Crossing and visit Hachiko Memorial Statue.', evening: 'Take in 360-degree city sunset views from Shibuya Sky open-air observatory and dine in Nonbei Yokocho.', places: ['Shibuya Scramble Crossing', 'Shibuya Sky Observatory', 'Hachiko Statue'], tip: 'Shibuya Sky sunset time slots must be reserved 4 weeks in advance.' },
      { title: 'Historic Asakusa, Senso-ji & Futuristic Odaiba', morning: 'Walk through Kaminarimon Thunder Gate into Senso-ji, Tokyo’s oldest Buddhist temple.', afternoon: 'Browse traditional souvenirs along Nakamise shopping street, then board a futuristic water bus to Odaiba.', evening: 'See the giant life-size Unicorn Gundam statue and rainbow bridge illuminated at night.', places: ['Senso-ji Temple', 'Nakamise Street', 'Odaiba Seaside Park'], tip: 'Draw an Omikuji fortune at Senso-ji; tie bad fortunes to the wires to leave bad luck behind.' },
      { title: 'Shrine Forests, Takeshita Street & Shinjuku', morning: 'Walk through the towering cedar forests of Meiji Jingu Shrine in the morning calm.', afternoon: 'Experience youth fashion and sweet crepes on Takeshita Street in Harajuku, followed by Omotesando.', evening: 'Explore the dizzying neon canyons of Shinjuku and dine under the red lanterns of Omoide Yokocho.', places: ['Meiji Jingu Shrine', 'Takeshita Street', 'Omoide Yokocho'], tip: 'Bow respectfully when entering and exiting the Torii gate at Meiji Shrine.' },
      { title: 'Tsukiji Market Feasts & teamLab Digital Art', morning: 'Indulge in a seafood breakfast tour through Tsukiji Outer Market (fresh oysters, wagyu skewers, tamagoyaki).', afternoon: 'Immerse yourself in barefoot sensory digital art at teamLab Planets in Toyosu.', evening: 'Window shop through upscale Ginza department stores and enjoy an evening cocktail at a hidden speakeasy.', places: ['Tsukiji Outer Market', 'teamLab Planets', 'Ginza'], tip: 'Wear shorts or pants that can be rolled above knees for teamLab water rooms.' },
      { title: 'Shinjuku Gyoen Gardens, Akihabara & Farewell', morning: 'Wander through serene Japanese, English, and French landscaped gardens at Shinjuku Gyoen.', afternoon: 'Explore the electronics, anime figures, and retro gaming arcades of Akihabara Electric Town.', evening: 'Pick up Japanese matcha kit-kats and souvenirs at Mega Don Quijote before heading to the airport.', places: ['Shinjuku Gyoen Garden', 'Akihabara Electric Town', 'Don Quijote'], tip: 'No alcohol or outdoor sports equipment is permitted inside Shinjuku Gyoen.' }
    ],
    packing: ['Comfortable slip-on walking shoes (frequent removal in temples)', 'Coin purse (Japan still uses lots of coins)', 'Mobile power bank', 'Pocket Wi-Fi / e-SIM', 'Hand sanitizer & small hand towel'],
    dailyBaselineUSD: { budget: 55, balanced: 130, comfort: 380 },
    budgetTips: [
      'Japanese convenience stores (7-Eleven, Lawson, FamilyMart) serve gourmet onigiri, bento, and fried chicken for $2-4.',
      'Buy the 72-hour Tokyo Subway Ticket for ¥1,500 ($10) for unbeatable transit savings.',
      'Tipping is strictly not practiced in Japan; exceptional service is already standard.'
    ]
  },

  dubai: {
    name: 'Dubai, United Arab Emirates',
    stayAreas: [
      { name: 'Downtown Dubai', rationale: 'Home to Burj Khalifa, Dubai Mall, Dubai Opera, and dancing fountains. Central and walkable.', bestFor: 'Iconic landmarks & shopping' },
      { name: 'Dubai Marina & JBR', rationale: 'Pristine beach access, waterfront promenades, luxury yacht cruises, outdoor cafes, and nightlife.', bestFor: 'Beachfront vibes & nightlife' },
      { name: 'Deira & Bur Dubai', rationale: 'Historic heritage quarters, gold and spice souks, creek water taxis, and budget-friendly hotels.', bestFor: 'Culture, heritage & budget' }
    ],
    hotels: [
      { name: 'Rove Downtown / Citymax Bur Dubai', tier: 'budget', tierName: 'Contemporary Budget Stay', approxUSD: 55, amenities: ['Burj Khalifa Views', 'Outdoor Pool', '24h Gym', 'Free Wi-Fi'], highlight: 'Hip modern traveler hub with central downtown shuttle' },
      { name: 'Vida Downtown / 25hours Hotel', tier: 'mid', tierName: 'Boutique Lifestyle Hotel', approxUSD: 160, amenities: ['Infinity Pool', 'Designer Rooms', 'Creative Dining', 'Spa'], highlight: 'Cool lifestyle design right opposite Museum of the Future' },
      { name: 'Address Downtown / Atlantis The Royal', tier: 'comfort', tierName: 'Ultra-Luxury 5★ Resort', approxUSD: 520, amenities: ['Private Beach', 'Celebrity Chef Dining', 'World’s Largest Waterpark', 'Sky Pool'], highlight: 'Jaw-dropping luxury with private balconies overlooking fountain shows' }
    ],
    meals: {
      breakfast: { spot: 'Arabian Tea House (Al Fahidi) / Baker & Spice', desc: 'Emirati breakfast tray with balaleet, foul medames, fresh khubz bread, labneh, and spiced karak chai.', approxUSD: 10 },
      lunch: { spot: 'Al Ustad Special Kabab / Operation Falafel', desc: 'Legendary Iranian yogurt-marinated tender kebabs with saffron butter rice, or fresh falafel wraps.', approxUSD: 12 },
      dinner: { spot: 'Marina Dhow Cruise Dinner / Pierchic', desc: 'Buffet barbecue cruise under illuminated skyscrapers, or over-the-water Mediterranean seafood dining.', approxUSD: 30 }
    },
    foods: [
      { name: 'Al Machboos', desc: 'Fragrant spiced basmati rice simmered with tender lamb or chicken, loomi (dried lime), cardamom, and saffron.', bestWhere: 'Al Fanar Restaurant & Cafe' },
      { name: 'Authentic Shawarma', desc: 'Thinly sliced spit-roasted garlic chicken wrapped in warm khubz with pickles, tahini, and crispy fries.', bestWhere: 'Al Mallah on 2nd December Street' },
      { name: 'Luqaimat', desc: 'Crispy golden fried dough dumplings drenched in sweet date syrup and sprinkled with toasted sesame seeds.', bestWhere: 'Arabian Tea House in Al Fahidi' },
      { name: 'Manakish', desc: 'Oven-baked Levantine flatbread generously topped with aromatic za’atar herbs, olive oil, and melted akkawi cheese.', bestWhere: 'Al Reef Bakery' },
      { name: 'Camel Milk Gelato & Dates', desc: 'Creamy gelato infused with saffron, pistachio, and cardamom paired with gourmet Bateel stuffed dates.', bestWhere: 'Bateel Boutiques in Dubai Mall' }
    ],
    transport: {
      airport: { desc: 'Dubai Metro Red Line from Terminal 1 & 3 directly to Downtown (~AED 5-7.50, $1.50) or taxi ($15)', costUSD: 12 },
      options: [
        { mode: 'Dubai Metro & Tram (Nol Card)', desc: 'Clean, driverless air-conditioned rail connecting major malls and landmarks.', costUSD: 2, unit: 'per trip' },
        { mode: 'Dubai Taxi & Careem App', desc: 'Government-metered reliable air-conditioned cabs available 24/7.', costUSD: 10, unit: 'per ride' },
        { mode: 'Traditional Abra Creek Boat', desc: 'Open wooden boat crossing between Deira and Bur Dubai across the historic creek.', costUSD: 0.3, unit: 'per crossing' }
      ],
      tips: 'Get a Silver Nol Card at the airport station for discounted fares on metro, buses, and water taxis.'
    },
    dayPlans: [
      { title: 'Burj Khalifa, Dubai Mall & Dancing Fountains', morning: 'Arrive, check in, and head to Downtown Dubai.', afternoon: 'Ascend to the 124th/125th floor observation decks of Burj Khalifa; visit Dubai Aquarium.', evening: 'Watch the synchronized music and water fountains outside Dubai Mall, followed by dinner overlooking the Burj.', places: ['Burj Khalifa', 'Dubai Mall', 'Dubai Fountain'], tip: 'Reserve Burj Khalifa sunset tickets in advance to save up to 30%.' },
      { title: 'Historic Al Fahidi, Souks & Creek Abra Ride', morning: 'Wander the wind-tower lanes of historic Al Fahidi Cultural District and visit Dubai Museum.', afternoon: 'Ride a traditional 1-Dirham Abra boat across Dubai Creek to browse Gold and Spice Souks.', evening: 'Enjoy an Emirati dinner with balaleet and mint tea at Arabian Tea House.', places: ['Al Fahidi Quarter', 'Dubai Creek', 'Gold & Spice Souks'], tip: 'Politely bargain when shopping for spices, saffron, and gold jewelry in the souks.' },
      { title: 'Desert Safari, Dune Bashing & Bedouin Camp', morning: 'Relaxed morning by the pool or stroll along Kite Beach with views of Burj Al Arab.', afternoon: 'Embark on an afternoon 4x4 desert dune-bashing excursion into the red sand dunes.', evening: 'Enjoy camel rides, henna painting, Tanoura dance, and a barbecue dinner under the stars.', places: ['Red Dunes Desert', 'Bedouin Desert Camp'], tip: 'Wear loose comfortable clothing and sunglasses for the desert tour.' },
      { title: 'Dubai Marina, JBR Walk & Bluewaters Island', morning: 'Walk the 7km paved Dubai Marina promenade and admire mega-yachts.', afternoon: 'Cross the pedestrian bridge to Bluewaters Island to view Ain Dubai and enjoy beach clubs.', evening: 'Dine on JBR The Walk with ocean breezes and street performers.', places: ['Dubai Marina', 'JBR Beach Walk', 'Bluewaters Island'], tip: 'Use the Dubai Tram to hop between Marina, JBR, and the Palm Monorail.' },
      { title: 'Museum of the Future, Miracle Garden & Departure', morning: 'Tour the architectural masterpiece Museum of the Future with its calligraphy facade.', afternoon: 'Visit Dubai Miracle Garden (seasonal) or explore souk Madinat Jumeirah with abra waterways.', evening: 'Farewell sunset drink and transfer to Dubai International Airport (DXB).', places: ['Museum of the Future', 'Souk Madinat Jumeirah'], tip: 'Museum of the Future tickets sell out weeks in advance; book early.' }
    ],
    packing: ['Modest lightweight clothing for souks/malls', 'Swimwear for beach/resort pools', 'Sunglasses & sun protection', 'Light jacket for air-conditioned malls', 'Universal UK 3-pin plug adapter'],
    dailyBaselineUSD: { budget: 60, balanced: 150, comfort: 420 },
    budgetTips: [
      'Dubai Metro is one of the cleanest and cheapest in the world; take it to avoid highway traffic.',
      'Dining in Deira, Karama, and Bur Dubai offers authentic global feasts at a fraction of hotel prices.',
      'Tap water in hotels is potable and safe, but bottled water is very cheap everywhere.'
    ]
  },

  london: {
    name: 'London, United Kingdom',
    stayAreas: [
      { name: 'Covent Garden & Soho', rationale: 'Central West End location, walkable to theaters, museums, restaurants, and royal parks.', bestFor: 'Nightlife, dining & theater' },
      { name: 'South Kensington', rationale: 'Museum quarter (Natural History, V&A, Science Museum), Victorian townhouses, and Hyde Park.', bestFor: 'Museums, culture & quiet charm' },
      { name: 'Shoreditch & City of London', rationale: 'Street art, vintage markets, hip cafes, tech hubs, and iconic skyscrapers.', bestFor: 'Trendy culture, markets & nightlife' }
    ],
    hotels: [
      { name: 'Wombat’s City Hostel / Point A Hotel', tier: 'budget', tierName: 'Budget Hotel / Poshtel', approxUSD: 48, amenities: ['En-suite Rooms', 'Bar Lounge', 'Underground Access', 'Wi-Fi'], highlight: 'Modern, clean private rooms near Tower Bridge' },
      { name: 'The Hoxton Holborn / CitizenM Tower of London', tier: 'mid', tierName: 'Boutique Lifestyle Hotel', approxUSD: 190, amenities: ['Designer Lounge', 'Workspace', 'Rooftop Bar', 'Subway Proximity'], highlight: 'Bustling lobby scene with chic industrial-luxe rooms' },
      { name: 'The Savoy / Claridge’s', tier: 'comfort', tierName: '5★ Historic Luxury Hotel', approxUSD: 780, amenities: ['Butler Service', 'Afternoon Tea', 'Thames River Views', 'Michelin Dining'], highlight: 'Timeless British luxury on the banks of the River Thames' }
    ],
    meals: {
      breakfast: { spot: 'The Breakfast Club Soho / Dishoom', desc: 'Full English breakfast with Cumberland sausages, bacon, eggs, beans, or Dishoom’s famous bacon naan roll.', approxUSD: 11 },
      lunch: { spot: 'Borough Market / Poppies Fish & Chips', desc: 'Artisan grilled cheese toasties, paella pans, or crispy golden battered haddock with mushy peas.', approxUSD: 14 },
      dinner: { spot: 'Rules Restaurant / Hawksmoor Seven Dials', desc: 'Traditional British Sunday roast with Yorkshire pudding and rich gravy, or prime aged British steaks.', approxUSD: 36 }
    },
    foods: [
      { name: 'Classic Fish & Chips', desc: 'Crispy beer-battered fresh cod or haddock served with chunky hand-cut chips, tartar sauce, and mushy peas.', bestWhere: 'Poppies Fish & Chips (Spitalfields / Soho)' },
      { name: 'Sunday Roast & Yorkshire Pudding', desc: 'Roasted prime beef or chicken with crispy roast potatoes, seasonal greens, and giant fluffy Yorkshire puddings.', bestWhere: 'Traditional British Pubs in Kensington' },
      { name: 'Bacon Naan Roll & Masala Chai', desc: 'Warm tandoor-baked naan wrapped around crisp smoked bacon, cream cheese, chili tomato jam, and fresh coriander.', bestWhere: 'Dishoom (Covent Garden & Shoreditch)' },
      { name: 'English Afternoon Tea', desc: 'Three-tiered silver stand with warm clotted cream scones, strawberry jam, finger sandwiches, and Earl Grey tea.', bestWhere: 'The Wolseley or Fortnum & Mason' },
      { name: 'Sticky Toffee Pudding', desc: 'Warm moist sponge cake studded with dates, drenched in rich caramel toffee sauce with vanilla bean custard.', bestWhere: 'Rules (London’s oldest restaurant)' }
    ],
    transport: {
      airport: { desc: 'Heathrow Express to Paddington (15m, £25) or Piccadilly Line Underground (£5.60, 50m)', costUSD: 16 },
      options: [
        { mode: 'London Underground (Tube) & Red Buses', desc: 'Contactless / Oyster pay-as-you-go with automated daily fare cap (£8.50 in Zones 1-2).', costUSD: 3.5, unit: 'per trip' },
        { mode: 'Santander Cycle Hire', desc: 'Docked city bikes with extensive protected cycle superhighways (£3 for 30m rides).', costUSD: 4, unit: 'per ride' },
        { mode: 'Uber & Black Cabs', desc: 'Traditional licensed iconic black cabs or app-based rides.', costUSD: 18, unit: 'per ride' }
      ],
      tips: 'Simply tap your contactless credit card or smartphone at the yellow turnstiles; no paper ticket needed.'
    },
    dayPlans: [
      { title: 'Westminster, Big Ben & River Thames Stroll', morning: 'Arrive and check in; walk to Parliament Square, Big Ben, and Westminster Abbey.', afternoon: 'Stroll across Westminster Bridge for classic photo angles, then walk the lively South Bank promenade.', evening: 'Ride the London Eye at sunset followed by dinner and a pub pint near Covent Garden.', places: ['Big Ben', 'Westminster Abbey', 'South Bank'], tip: 'Book London Eye fast-track tickets online to bypass the queue.' },
      { title: 'Royal Palaces, Trafalgar Square & West End Show', morning: 'Watch the Changing of the Guard ceremony outside Buckingham Palace (check dates).', afternoon: 'Walk through St. James’s Park to Trafalgar Square; visit the National Gallery (free entry).', evening: 'Enjoy pre-theatre dinner in Soho and catch a world-class West End musical.', places: ['Buckingham Palace', 'Trafalgar Square', 'West End Theatres'], tip: 'TKTS booth in Leicester Square sells half-price same-day theater tickets.' },
      { title: 'British Museum, Covent Garden & Street Performers', morning: 'Explore world history masterpieces at the British Museum (Rosetta Stone, Parthenon Sculptures).', afternoon: 'Watch entertaining street performers at Covent Garden Piazza and browse Apple Market stalls.', evening: 'Dine in historic Seven Dials with craft beer and artisan sourdough pizza.', places: ['British Museum', 'Covent Garden Piazza', 'Seven Dials'], tip: 'Admission to the British Museum is free; book timed slots in advance.' },
      { title: 'Tower of London, Tower Bridge & Borough Market', morning: 'Tour the 900-year-old Tower of London to view the spectacular Crown Jewels.', afternoon: 'Walk across glass-floored Tower Bridge high walkway; feast on gourmet street food at Borough Market.', evening: 'Take in panoramic sunset views from the free Sky Garden observation terrace.', places: ['Tower of London', 'Tower Bridge', 'Borough Market', 'Sky Garden'], tip: 'Sky Garden tickets are completely free but must be booked 3 weeks ahead on Mondays.' },
      { title: 'Hyde Park, Kensington & Harrods Farewell', morning: 'Morning stroll through Hyde Park and Kensington Gardens to Kensington Palace.', afternoon: 'Browse the legendary food halls and boutiques of Harrods department store.', evening: 'Pick up Fortnum & Mason English teas before heading to Heathrow or Gatwick.', places: ['Hyde Park', 'Harrods', 'Fortnum & Mason'], tip: 'Allow extra time for airport transit during rush hour.' }
    ],
    packing: ['Compact umbrella & rain trench', 'Comfortable waterproof walking shoes', 'Layered clothing', 'Contactless payment card / Apple Pay', 'UK 3-pin plug adapter'],
    dailyBaselineUSD: { budget: 75, balanced: 185, comfort: 520 },
    budgetTips: [
      'Almost all major London museums (British Museum, Natural History, V&A, Tate Modern) are 100% free!',
      'Tap your phone/card on the Tube — contactless automatically calculates the cheapest daily fare cap.',
      'Supermarket meal deals (M&S, Pret, Tesco) offer sandwich + snack + drink for £3.90.'
    ]
  },

  rome: {
    name: 'Rome, Italy',
    stayAreas: [
      { name: 'Centro Storico (Pantheon & Navona)', rationale: 'Walk to nearly all major monuments, cobblestone piazzas, baroque fountains, and bustling gelaterias.', bestFor: 'First-time visitors & romantic walks' },
      { name: 'Trastevere', rationale: 'Atmospheric medieval alleys, ivy-draped trattorias, vibrant evening buzz, and authentic Roman dining.', bestFor: 'Food lovers, dining & evening vibes' },
      { name: 'Monti', rationale: 'Cool bohemian quarter right next to the Colosseum, filled with artisan boutiques, wine bars, and cafes.', bestFor: 'Boutiques, Colosseum access & charm' }
    ],
    hotels: [
      { name: 'The YellowSquare Rome / Generator', tier: 'budget', tierName: 'Social Poshtel', approxUSD: 42, amenities: ['Rooftop Terrace', 'Cafe / Bar', 'Metro Access', 'Wi-Fi'], highlight: 'Lively boutique poshtel with cooking classes and private ensuite rooms' },
      { name: 'Hotel Ponte Sisto / Albergo del Senato', tier: 'mid', tierName: 'Boutique Heritage Hotel', approxUSD: 170, amenities: ['Courtyard Garden', 'Pantheon Views', 'Buffet Breakfast', 'Air Conditioning'], highlight: 'Classic Roman charm with rooftop terrace overlooking historic domes' },
      { name: 'Hotel de Russie / Hassler Roma', tier: 'comfort', tierName: '5★ Luxury Icon', approxUSD: 720, amenities: ['Secret Terraced Gardens', 'Spa', 'Fine Dining', 'Spanish Steps Views'], highlight: 'Exclusive Roman elegance favored by royalty and cinema icons' }
    ],
    meals: {
      breakfast: { spot: 'Sant’Eustachio Il Caffè / Roscioli Caffè', desc: 'Velvety espresso or frothy cappuccino paired with a warm, flaky cream-filled cornetto.', approxUSD: 4 },
      lunch: { spot: 'Da Enzo al 29 / Forno Campo de’ Fiori', desc: 'Crispy Roman pizza al taglio by the slice, carciofi alla giudia (fried artichoke), or suppli rice balls.', approxUSD: 13 },
      dinner: { spot: 'Felice a Testaccio / Cantina e Cucina', desc: 'Tossed table-side Cacio e Pepe, authentic Roman Carbonara, saltimbocca alla romana, and tiramisu.', approxUSD: 28 }
    },
    foods: [
      { name: 'Authentic Roman Carbonara', desc: 'Al dente spaghetti tossed with crispy cured pork cheek (guanciale), egg yolks, and aged Pecorino Romano cheese — no cream!', bestWhere: 'Da Enzo al 29 (Trastevere) & Salumeria Roscioli' },
      { name: 'Cacio e Pepe', desc: 'Simple perfection: fresh tonnarelli pasta emulsified with sharp Pecorino Romano cheese and freshly cracked black pepper.', bestWhere: 'Felice a Testaccio' },
      { name: 'Roman Pizza al Taglio', desc: 'Crispy-crusted rectangular tray pizza with creative toppings like potato & rosemary or burrata & mortadella.', bestWhere: 'Bonci Pizzarium & Antico Forno Roscioli' },
      { name: 'Suppli', desc: 'Golden breaded fried rice croquettes stuffed with tomato meat sauce and a melting string of warm mozzarella.', bestWhere: 'Suppli Roma in Trastevere' },
      { name: 'Artisanal Italian Gelato', desc: 'Dense, naturally flavored gelato made with Bronte pistachios, Piedmont hazelnuts, and dark Venezuelan chocolate.', bestWhere: 'Giolitti (near Pantheon) & Frigidarium' }
    ],
    transport: {
      airport: { desc: 'Leonardo Express train from Fiumicino (FCO) to Roma Termini (32m, €14) or taxi (€50 flat rate)', costUSD: 15 },
      options: [
        { mode: 'Rome Metro & ATAC Buses', desc: 'Subway lines A & B connecting major historical hubs (€1.50 for 100-minute ticket).', costUSD: 1.7, unit: 'per ticket' },
        { mode: 'Walking', desc: 'Rome is best explored on foot; nearly all historic sights are in a pedestrian-friendly core.', costUSD: 0, unit: 'free' },
        { mode: 'Free-Now App Cabs', desc: 'White metered city cabs for late evenings or heavy bags.', costUSD: 12, unit: 'per ride' }
      ],
      tips: 'Bring a reusable water bottle — Rome has over 2,500 historic fountains ("nasoni") flowing with cold, fresh drinking water.'
    },
    dayPlans: [
      { title: 'The Colosseum, Roman Forum & Palatine Hill', morning: 'Arrive and check in; visit the Colosseum with arena floor access.', afternoon: 'Walk through the ruins of the Roman Forum and emperors’ palaces on Palatine Hill.', evening: 'Aperitivo in the bohemian Monti neighborhood, followed by dinner overlooking the illuminated Colosseum.', places: ['Colosseum', 'Roman Forum', 'Palatine Hill'], tip: 'Buy combined Colosseum-Forum tickets weeks ahead to skip hours of queues.' },
      { title: 'Vatican Museums, Sistine Chapel & St. Peter’s', morning: 'Morning entrance to the Vatican Museums to admire classical statues and the Sistine Chapel ceiling.', afternoon: 'Step inside the breathtaking St. Peter’s Basilica; climb the dome for 360-degree views of Rome.', evening: 'Cross the Ponte Sant’Angelo and enjoy a candlelit dinner in charming Trastevere.', places: ['Vatican Museums', 'Sistine Chapel', 'St. Peter’s Basilica'], tip: 'Strict dress code: shoulders and knees must be covered inside Vatican buildings.' },
      { title: 'Pantheon, Trevi Fountain & Spanish Steps', morning: 'Visit the 2,000-year-old Pantheon with its open-sky oculus and marvel at Renaissance architecture.', afternoon: 'Toss a coin over your shoulder into the Trevi Fountain to ensure your return to Rome; climb the Spanish Steps.', evening: 'Enjoy pistachio gelato at Giolitti and watch the artists in Piazza Navona.', places: ['Pantheon', 'Trevi Fountain', 'Spanish Steps', 'Piazza Navona'], tip: 'Visit Trevi Fountain early in the morning (before 8:30 AM) to experience it crowd-free.' },
      { title: 'Borghese Gallery & Villa Borghese Gardens', morning: 'Admire Bernini’s breathtaking marble sculptures and Caravaggio paintings at Galleria Borghese.', afternoon: 'Rent a rowboat on the tranquil Villa Borghese lake or rent bicycles through the shaded pine gardens.', evening: 'Enjoy panoramic sunset views of Rome from the Pincio Terrace overlooking Piazza del Popolo.', places: ['Galleria Borghese', 'Villa Borghese Gardens', 'Pincio Terrace'], tip: 'Borghese Gallery strictly requires reservations and limits slots to 2 hours.' },
      { title: 'Campo de’ Fiori Market & Trastevere Farewell', morning: 'Browse fresh fruits, flowers, and spices at Campo de’ Fiori morning market.', afternoon: 'Pick up vacuum-sealed Parmigiano Reggiano, dried porcini, and olive oils at Roscioli delicatessen.', evening: 'Farewell feast with authentic Roman Carbonara and wine before heading to FCO airport.', places: ['Campo de’ Fiori', 'Trastevere Lanes', 'Roscioli Deli'], tip: 'Validate your bus/train tickets immediately upon boarding to avoid heavy fines.' }
    ],
    packing: ['Sturdy, comfortable walking shoes for cobblestones', 'Reusable water bottle', 'Modest clothing for basilicas (cover shoulders/knees)', 'Sun hat & sunglasses', 'EU power adapter'],
    dailyBaselineUSD: { budget: 60, balanced: 155, comfort: 440 },
    budgetTips: [
      'Fill your water bottle at the historic "nasoni" water fountains for free cold water all day.',
      'Enjoy "Aperitivo" at local bars from 6-8 PM: buy a drink for €8-12 and get access to a generous buffet of snacks.',
      'Espresso drank standing at the bar counter costs €1.20-1.50 compared to €4+ if sitting at a table.'
    ]
  },

  bangkok: {
    name: 'Bangkok, Thailand',
    stayAreas: [
      { name: 'Sukhumvit (Asok / Phrom Phong)', rationale: 'Direct access to BTS Skytrain and MRT subway, world-class malls, countless rooftop bars, and diverse dining.', bestFor: 'Transit convenience, shopping & dining' },
      { name: 'Riverside / Silom', rationale: 'Scenic breezes along the Chao Phraya River, luxury waterfront hotels, historic temples, and evening night markets.', bestFor: 'Scenic river views & romantic stays' },
      { name: 'Rattanakosin (Old City)', rationale: 'Walk to the Grand Palace, Wat Pho, Wat Arun, and lively backpacker hubs like Khao San Road.', bestFor: 'Culture, temples & budget travel' }
    ],
    hotels: [
      { name: 'Lub d Bangkok Siam / The Yard Hostel', tier: 'budget', tierName: 'Design Hostel / Guesthouse', approxUSD: 24, amenities: ['BTS Station Next Door', 'Social Lounge', 'Wi-Fi', 'Air Conditioning'], highlight: 'Eco-chic boutique hostel in peaceful garden setting' },
      { name: 'Arte Hotel Sukhumvit / Riva Surya', tier: 'mid', tierName: 'Boutique City Hotel', approxUSD: 75, amenities: ['Rooftop Pool', 'Riverside Terrace', 'Free Breakfast', 'Modern Gym'], highlight: 'Chic riverside boutique with balconies overlooking temple boats' },
      { name: 'The Peninsula Bangkok / Mandarin Oriental', tier: 'comfort', tierName: '5★ Iconic Riverfront Hotel', approxUSD: 360, amenities: ['Private River Shuttles', 'Three-Tier Pool', 'World-Class Spa', 'Fine Thai Dining'], highlight: 'Legendary Thai hospitality with private teak boat transfers along the river' }
    ],
    meals: {
      breakfast: { spot: 'On Lok Yun / Factory Coffee', desc: 'Nostalgic Thai breakfast with soft kaya toast, soft-boiled eggs in glass cups, and iced milk tea.', approxUSD: 4 },
      lunch: { spot: 'Thip Samai Pad Thai / Victory Monument Boat Noodles', desc: 'World-famous prawn Pad Thai wrapped in paper-thin omelet, or rich spiced boat noodle bowls.', approxUSD: 5 },
      dinner: { spot: 'Jay Fai / Supanniga Eating Room', desc: 'Michelin-starred crab omelet, or authentic riverside Thai feast with tom yum goong and massaman curry.', approxUSD: 16 }
    },
    foods: [
      { name: 'Pad Thai Boran', desc: 'Stir-fried rice noodles with plump prawns, tofu, egg, bean sprouts, and crushed peanuts in tamarind sauce.', bestWhere: 'Thip Samai & Street Stalls in Bang Rak' },
      { name: 'Tom Yum Goong', desc: 'Hot, sour, and intensely fragrant soup simmered with giant river prawns, lemongrass, galangal, kaffir lime, and chili.', bestWhere: 'Pe Aor Tom Yum Kung' },
      { name: 'Mango Sticky Rice (Khao Niew Mamuang)', desc: 'Warm sweet sticky rice drenched in rich coconut cream, paired with chilled ripe golden honey mangoes.', bestWhere: 'Mae Varee (Thong Lo)' },
      { name: 'Som Tum & Grilled Chicken (Gai Yang)', desc: 'Crispy green papaya pounded in a mortar with lime, fish sauce, palm sugar, peanuts, and fiery bird’s eye chilies.', bestWhere: 'Somtum Der (Silom)' },
      { name: 'Massaman Beef Curry', desc: 'Rich, mildly spiced southern curry with slow-cooked tender beef, roasted peanuts, potatoes, and cinnamon.', bestWhere: 'Supanniga Eating Room' }
    ],
    transport: {
      airport: { desc: 'Suvarnabhumi Airport Rail Link to Phaya Thai (30m, THB 45 / $1.30) or metered taxi ($10)', costUSD: 6 },
      options: [
        { mode: 'BTS Skytrain & MRT Subway', desc: 'Air-conditioned elevated and underground trains bypassing all Bangkok street traffic.', costUSD: 1.2, unit: 'per ride' },
        { mode: 'Chao Phraya Express & Tourist Boat', desc: 'Scenic hop-on hop-off river boat connecting Grand Palace, Wat Arun, and Iconsiam.', costUSD: 1, unit: 'per trip' },
        { mode: 'Grab App / Tuk-Tuk', desc: 'Transparent app fares or iconic open-air three-wheel motorized rickshaws.', costUSD: 4, unit: 'per ride' }
      ],
      tips: 'Always insist taxi drivers use the meter ("meter na khrap"); reject fixed inflated tourist fares.'
    },
    dayPlans: [
      { title: 'The Grand Palace, Wat Pho & Wat Arun Sunset', morning: 'Arrive, check in, and take the river boat to the dazzling Grand Palace and Temple of the Emerald Buddha.', afternoon: 'Walk to Wat Pho to admire the 46m Reclining Buddha and experience traditional Thai massage.', evening: 'Cross the river to see the porcelain spires of Wat Arun illuminated at sunset, then dine riverside.', places: ['Grand Palace', 'Wat Pho', 'Wat Arun'], tip: 'Grand Palace requires strict modest dress: long pants and shirts with sleeves.' },
      { title: 'Chinatown Street Food & Flower Market', morning: 'Explore Pak Khlong Talat 24-hour flower market with vibrant orchids and lotus blossoms.', afternoon: 'Wander the narrow bustling shopping alleyways of Yaowarat (Bangkok Chinatown).', evening: 'Feast on seafood, dim sum, and toasted buns along the neon-lit food strip of Yaowarat Road.', places: ['Chinatown Yaowarat', 'Pak Khlong Talat'], tip: 'Chinatown comes alive after 6:00 PM when food stalls take over the sidewalks.' },
      { title: 'Chatuchak Weekend Market or Floating Market', morning: 'Shop through 15,000 stalls at Chatuchak Weekend Market (crafts, clothing, art, street food).', afternoon: 'Visit the peaceful Jim Thompson House teakwood silk museum surrounded by tropical gardens.', evening: 'Enjoy sunset cocktails at a panoramic 60th-floor rooftop bar overlooking the city skyline.', places: ['Chatuchak Market', 'Jim Thompson House', 'Rooftop Bar'], tip: 'Hydrate well with fresh coconut water when exploring outdoor markets.' },
      { title: 'Iconsiam Waterfront & Chao Phraya River Cruise', morning: 'Take a complimentary shuttle boat to Iconsiam luxury mall and its indoor floating market.', afternoon: 'Browse Thai artisan handicrafts and relax with a traditional foot reflexology massage.', evening: 'Board an evening dinner cruise along the Chao Phraya River with live Thai music and monuments lit up.', places: ['Iconsiam Riverfront', 'Chao Phraya Dinner Cruise'], tip: 'Iconsiam basement has an incredible indoor street food market with authentic regional eats.' },
      { title: 'Lumpini Park, Souvenirs & Departure', morning: 'Morning stroll through Lumpini Park to spot wild monitor lizards and locals practicing Tai Chi.', afternoon: 'Pick up dried mangoes, Thai curry pastes, and silk scarves at MBK Center or Big C.', evening: 'Transfer to Suvarnabhumi or Don Mueang Airport for your return flight.', places: ['Lumpini Park', 'MBK Center'], tip: 'Allow extra travel time to the airport on Friday evenings due to city traffic.' }
    ],
    packing: ['Light, breathable cotton clothing', 'Slip-on shoes for temple visits', 'Modest attire covering knees/shoulders', 'Insect repellent', 'Small umbrella for tropical showers'],
    dailyBaselineUSD: { budget: 28, balanced: 75, comfort: 220 },
    budgetTips: [
      'Street food stalls and mall food courts (Terminal 21 Pier 21) serve Michelin-recognized meals for $1.50-3.',
      'Take the BTS Skytrain and MRT to avoid spending hours stuck in notorious Bangkok traffic jams.',
      'Book Chao Phraya dinner cruises online for up to 50% discounts.'
    ]
  }
};

// -----------------------------------------------------------------------------
// UNIVERSAL DESTINATION GENERATOR (FOR ANY DESTINATION WORLDWIDE)
// -----------------------------------------------------------------------------
function generateFallbackDestination(name) {
  const clean = name.trim();
  const lower = clean.toLowerCase();
  const isBeach = /beach|island|coast|sea|cove|ocean|phuket|maldives|hawaii|cancun|krabi|pattaya|pondicherry|gokarna/i.test(lower);
  const isMountain = /mountain|hill|peak|alps|snow|valley|shimla|leh|ladakh|swiss|banff|aspen|ooty|munnar|coorg|kodaikanal|mussoorie|darjeeling/i.test(lower);
  const isHeritage = /temple|heritage|mysore|hampi|jaipur|udaipur|varanasi|khajuraho|agra|rome|athens|kyoto|cairo|florence|prague|istanbul/i.test(lower);

  const stayAreas = [
    {
      name: `${clean} City Center & Historic Core`,
      rationale: `Located within walking distance of central cultural sights, historic monuments, local markets, cafes, and major transit routes.`,
      bestFor: `Sightseeing, walkability & first-time visitors`
    },
    {
      name: isBeach ? `Waterfront & Beach Promenade` : isMountain ? `Scenic Hillside & Valley View District` : isHeritage ? `Old Town Heritage & Temple Quarter` : `Arts & Creative Quarter`,
      rationale: `Offers distinctive local character, scenic walks, independent artisan shops, and evening dining ambiance.`,
      bestFor: isBeach ? `Beach relaxation & ocean views` : isMountain ? `Mountain panoramas & serene walks` : `Historic charm & traditional architecture`
    },
    {
      name: `Quiet Garden & Residential Quarter`,
      rationale: `A tranquil, authentic neighborhood offering family-run restaurants, open parks, and excellent value accommodations.`,
      bestFor: `Relaxed stays, families & budget travelers`
    }
  ];

  const hotels = [
    {
      name: `The Central Heritage Stay ${clean}`,
      tier: 'budget',
      tierName: 'Budget Guesthouse / Poshtel',
      approxUSD: isBeach ? 25 : isMountain ? 22 : 28,
      amenities: ['Central Location', 'High-Speed Wi-Fi', 'Complimentary Breakfast', 'Luggage Storage'],
      highlight: `Clean, modern comfortable rooms with local travel advice and prime central access`
    },
    {
      name: `Grand ${clean} Boutique Hotel & Suites`,
      tier: 'mid',
      tierName: 'Mid-Range Boutique Hotel',
      approxUSD: isBeach ? 85 : isMountain ? 75 : 95,
      amenities: ['Scenic Views', 'On-Site Restaurant', 'Swimming Pool or Wellness Area', 'Airport/Station Shuttle'],
      highlight: `Comfortable, stylish rooms blending authentic local charm with modern comforts`
    },
    {
      name: `The Royal ${clean} Palace Resort & Spa`,
      tier: 'comfort',
      tierName: '5★ Luxury Hotel & Spa',
      approxUSD: isBeach ? 280 : isMountain ? 250 : 320,
      amenities: ['5★ Fine Dining', 'Infinity Pool & Spa', 'Concierge Service', 'Private Balconies'],
      highlight: `Unrivaled luxury hospitality, expansive grounds, premium spa, and breathtaking panoramic views`
    }
  ];

  const meals = {
    breakfast: {
      spot: `Famous Local Bakery & Traditional Tiffin Spot in ${clean}`,
      desc: `Freshly prepared morning breakfast specialties, artisan breads or dosas, seasonal fruit, and hot regional coffee or tea.`,
      approxUSD: 6
    },
    lunch: {
      spot: `Authentic Regional Bistro & Market Dining`,
      desc: `Traditional regional feast featuring authentic seasonal preparations, spiced gravies or fresh salads, and local bread or rice.`,
      approxUSD: 8
    },
    dinner: {
      spot: `Atmospheric Scenic or Heritage Courtyard Restaurant`,
      desc: `Chef-prepared evening dinner featuring prime regional specialties, fresh local catch or farm produce, and traditional sweets.`,
      approxUSD: 18
    }
  };

  const foods = [
    { name: `Signature ${clean} Regional Dish`, desc: `The quintessential culinary icon of the destination, prepared with heritage spices and slow-cooked to perfection.`, bestWhere: `Established family-run restaurants in town center` },
    { name: `Artisan Street Delicacies`, desc: `Freshly fried or baked savory street snacks bursting with aromatic local seasoning and homemade chutneys or sauces.`, bestWhere: `Central morning & evening street food markets` },
    { name: `Farm-Fresh Local Platter / Thali`, desc: `A complete regional meal assortment showcasing the diverse culinary flavors and fresh harvest of the region.`, bestWhere: `Traditional dining rooms and local heritage bistros` },
    { name: isBeach ? `Fresh Coastal Catch / Seafood Curry` : isMountain ? `Hearty Mountain Stew & Flatbread` : `Traditional Braised Meat or Vegetable Curry`, desc: `Slow-simmered regional delicacy infused with local herbs and rich aromatic gravy.`, bestWhere: `Local neighborhood eateries and family canteens` },
    { name: `Traditional Local Dessert / Sweet`, desc: `Melt-in-the-mouth sweet delicacy made with pure ghee, honey, nuts, or milk solids following generations-old recipes.`, bestWhere: `Renowned historic sweet shops and confectioneries` }
  ];

  const transport = {
    airport: { desc: `Airport/Railway terminal express transit or pre-arranged taxi to central ${clean}`, costUSD: 16 },
    options: [
      { mode: `Public Transit (Metro / Bus / Tram)`, desc: `Convenient local network connecting main landmarks and neighborhoods.`, costUSD: 2, unit: 'per trip' },
      { mode: `Licensed Taxis / Ride-Hailing App`, desc: `Reliable on-demand rides for evening trips or traveling with luggage.`, costUSD: 7, unit: 'per ride' },
      { mode: isBeach ? `Bicycle or Scooter Rental` : isMountain ? `Local Mountain Cab or Day Tour` : `Walking & Local Cabs`, desc: `Flexible, scenic way to explore sights at your own relaxed pace.`, costUSD: 12, unit: 'per day' }
    ],
    tips: `Confirm meter rates or agree on fares before boarding informal transport, or use licensed ride-hailing apps where available.`
  };

  const dayPlans = [
    {
      title: `Arrival, Orientation & Historic Center Stroll`,
      morning: `Arrive in ${clean}, check in to your accommodation, unpack, and orient yourself with the surrounding streets.`,
      afternoon: `Stroll through the historic center, visit central public squares, and enjoy an authentic local snack at a sidewalk cafe.`,
      evening: `Savor your first authentic dinner at a lively local restaurant and watch the evening street life.`,
      places: [`${clean} Old Town / Central Plaza`, `Historic Landmark Street`],
      tip: `Stop by the local visitor center or hotel front desk for a complimentary transit map and local tips.`
    },
    {
      title: `Top Landmarks, Cultural Heritage & Scenic Views`,
      morning: `Visit ${clean}’s most iconic landmark, temple, or museum early in the morning before crowds peak.`,
      afternoon: `Enjoy a relaxed lunch nearby, then explore historic architecture, sculpture gardens, or cultural exhibitions.`,
      evening: `Head to a renowned scenic viewpoint or rooftop lounge to watch the sunset over the city.`,
      places: [`Principal Historic Monument`, `Panoramic Viewpoint / Tower`],
      tip: `Book tickets online in advance for major cultural landmarks to bypass ticket queues.`
    },
    {
      title: `Local Neighborhoods, Markets & Artisan Crafts`,
      morning: `Explore an authentic bustling local market showcasing fresh produce, spices, and handmade handicrafts.`,
      afternoon: `Wander through the creative arts or boutique quarter; browse independent shops and art studios.`,
      evening: `Experience regional street foods or casual dining at a market hall with live acoustic music.`,
      places: [`Central Market Hall`, `Artisan District`],
      tip: `Carry small cash denominations when shopping from local market vendors.`
    },
    {
      title: isBeach ? `Coastal Exploration & Sunset Boat Excursion` : isMountain ? `Scenic Nature Trail & Mountain Viewpoint` : `Day Excursion & Nature Escape`,
      morning: isBeach ? `Spend a rejuvenating morning by the beach with crystal clear waters and sun loungers.` : isMountain ? `Take an invigorating nature trail through pine forests with alpine valley views.` : `Take a short scenic excursion to a nearby historic village, castle, or botanical garden.`,
      afternoon: `Enjoy a relaxed outdoor picnic or lunch at a scenic restaurant with panoramic views.`,
      evening: `Return to central ${clean} for a relaxed dinner and evening dessert stroll.`,
      places: [`Scenic Natural Area / Coast`, `Countryside / Viewpoint Spot`],
      tip: `Check local weather forecasts before setting out on outdoor day excursions.`
    },
    {
      title: `Relaxed Morning, Souvenir Hunting & Farewell`,
      morning: `Enjoy a slow breakfast at your favorite neighborhood cafe; take a morning walk through a quiet garden.`,
      afternoon: `Pick up authentic local souvenirs, sweets, and culinary gifts to bring home.`,
      evening: `Farewell dinner at a special dining venue, followed by transit transfer for your departure journey.`,
      places: [`Botanical Gardens / Promenade`, `Local Specialty Boutiques`],
      tip: `Ensure you allow generous buffer time for airport or station check-in.`
    }
  ];

  return {
    name: clean,
    stayAreas,
    hotels,
    meals,
    foods,
    transport,
    dayPlans,
    packing: ['Comfortable walking shoes', 'Light breathable layers', 'Weather-appropriate jacket', 'Power bank & adapters', 'Personal toiletry kit', 'Reusable water bottle'],
    dailyBaselineUSD: {
      budget: isBeach ? 35 : isMountain ? 30 : 35,
      balanced: isBeach ? 80 : isMountain ? 70 : 85,
      comfort: isBeach ? 240 : isMountain ? 220 : 280
    },
    budgetTips: [
      `Look for combination city sightseeing passes that bundle public transport with museum admissions.`,
      `Eat your main meal at lunchtime when restaurants often offer fixed-price set meals at 30-40% lower cost.`,
      `Stay within walking distance of central transit lines to minimize private taxi expenses.`
    ]
  };
}

// -----------------------------------------------------------------------------
// CORE PLAN GENERATOR LOGIC (DEDICATED TO EACH TRIP'S OWN INPUTS)
// -----------------------------------------------------------------------------
function buildPlan(f) {
  const destInput = (f.destination || '').trim();
  const lowerDest = destInput.toLowerCase();

  // Find matching destination or generate tailored fallback
  let destData = null;
  for (const [key, val] of Object.entries(DESTINATIONS)) {
    if (lowerDest.includes(key)) {
      destData = val;
      break;
    }
  }
  if (!destData) {
    destData = generateFallbackDestination(destInput || 'Travel Journey');
  }

  const days = Math.max(1, Math.min(14, Number(f.days) || 5));
  const travelers = Math.max(1, Math.min(20, Number(f.travelers) || 2));
  const totalBudget = Math.max(1, Number(f.budget) || 2000);
  const currency = f.currency || 'USD';
  const style = f.style || 'balanced';
  const kind = f.kind || 'mix';

  // Calculate budget allocations according to style
  const styleSplits = {
    budget:   { stay: 0.30, food: 0.28, transport: 0.20, activities: 0.14, buffer: 0.08 },
    balanced: { stay: 0.33, food: 0.26, transport: 0.19, activities: 0.14, buffer: 0.08 },
    comfort:  { stay: 0.38, food: 0.24, transport: 0.18, activities: 0.13, buffer: 0.07 }
  }[style] || { stay: 0.33, food: 0.26, transport: 0.19, activities: 0.14, buffer: 0.08 };

  const labels = [
    { key: 'stay', label: 'Accommodation (Hotels / Stays)' },
    { key: 'food', label: 'Food & Dining (Breakfast, Lunch, Dinner)' },
    { key: 'transport', label: 'Transport & Local Transit' },
    { key: 'activities', label: 'Sightseeing, Tours & Activities' },
    { key: 'buffer', label: 'Emergency Buffer & Miscellaneous' }
  ];

  let rawAlloc = labels.map(item => ({
    label: item.label,
    amount: Math.round(totalBudget * styleSplits[item.key]),
    pct: Math.round(styleSplits[item.key] * 100)
  }));

  // Reconcile rounding difference to buffer
  const sumAlloc = rawAlloc.slice(0, -1).reduce((acc, curr) => acc + curr.amount, 0);
  rawAlloc[rawAlloc.length - 1].amount = Math.max(0, totalBudget - sumAlloc);

  // Currency converted hotel suggestions
  const hotelsConverted = destData.hotels.map(h => ({
    ...h,
    priceFormatted: money(convertUSD(h.approxUSD, currency), currency) + ' / night',
    isUserTier: h.tier === style
  }));

  // Currency converted meals
  const mealsConverted = {
    breakfast: {
      ...destData.meals.breakfast,
      costFormatted: money(convertUSD(destData.meals.breakfast.approxUSD, currency), currency) + ' per person'
    },
    lunch: {
      ...destData.meals.lunch,
      costFormatted: money(convertUSD(destData.meals.lunch.approxUSD, currency), currency) + ' per person'
    },
    dinner: {
      ...destData.meals.dinner,
      costFormatted: money(convertUSD(destData.meals.dinner.approxUSD, currency), currency) + ' per person'
    }
  };

  // Currency converted transport options
  const transportConverted = {
    airport: {
      ...destData.transport.airport,
      costFormatted: money(convertUSD(destData.transport.airport.costUSD, currency), currency)
    },
    options: destData.transport.options.map(opt => ({
      ...opt,
      costFormatted: money(convertUSD(opt.costUSD, currency), currency) + (opt.unit ? ` (${opt.unit})` : '')
    })),
    tips: destData.transport.tips
  };

  // Build Day-by-Day Itinerary
  const daylist = [];
  let startDateObj = f.start ? new Date(f.start) : null;

  for (let i = 0; i < days; i++) {
    const template = destData.dayPlans[i % destData.dayPlans.length];
    let dateStr = '';
    if (startDateObj && !isNaN(startDateObj.getTime())) {
      const curDate = new Date(startDateObj);
      curDate.setDate(curDate.getDate() + i);
      dateStr = curDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    let title = template.title;
    let morning = template.morning;
    let afternoon = template.afternoon;
    let evening = template.evening;
    let places = [...template.places];
    let tip = template.tip;

    // Adapt day themes according to user's selected trip focus
    if (kind === 'beach' && i > 0) {
      title = [`Coastal Paradise & Swimming`, `Island Catamaran & Reef Snorkeling`, `Sunsets & Beach Shacks`, `Relaxed Beach Day`][i % 4];
      afternoon = `Spend a blissful afternoon sunbathing, swimming, and exploring scenic coastal coves.`;
      places.push('Public Scenic Beach');
    } else if (kind === 'culture') {
      title = [`Historic Heritage Walk`, `Sacred Monuments & Architecture`, `Museum & Artisan Traditions`, `Old Town Explorations`][i % 4];
      places.push('Cultural Heritage Site');
    } else if (kind === 'nature') {
      title = [`Scenic Trail & Mountain Vista`, `Forest Exploration & Waterfalls`, `Nature Park Adventure`, `Alpine Scenery`][i % 4];
      places.push('Nature Sanctuary / Trail');
    } else if (kind === 'food') {
      title = [`Culinary Street Food Safari`, `Food Market & Local Tasting`, `Artisan Tasting & Cooking Experience`, `Gourmet Dining Experience`][i % 4];
      places.push('Famous Local Food Market');
    }

    daylist.push({
      day: i + 1,
      dateStr,
      title,
      morning,
      afternoon,
      evening,
      places,
      tip
    });
  }

  // Budget Feasibility Evaluation
  const baselineUSD = (destData.dailyBaselineUSD && destData.dailyBaselineUSD[style]) || 70;
  const expectedTotalUSD = baselineUSD * days * travelers;
  const userBudgetUSD = totalBudget / (CURRENCY_CONFIG[currency] ? CURRENCY_CONFIG[currency].rate : 1.0);
  const ratio = userBudgetUSD / expectedTotalUSD;

  let feasibility = {
    status: 'Well-Balanced',
    badgeClass: 'feasibility-balanced',
    headline: 'Your budget is well-suited for this journey!',
    message: `Your budget of ${money(totalBudget, currency)} aligns very well with typical costs in ${destData.name} for ${travelers} traveler(s) over ${days} days in a ${style} style.`,
    tips: destData.budgetTips || []
  };

  if (ratio >= 1.25) {
    feasibility = {
      status: 'Generous & Comfortable',
      badgeClass: 'feasibility-generous',
      headline: 'Comfortable & Generous Budget!',
      message: `You have allocated a generous budget of ${money(totalBudget, currency)}. This gives you flexibility for private day drivers, upgraded boutique suites, gourmet dining, and spontaneous shopping.`,
      tips: [
        `Consider upgrading to a 5★ resort with private pool or river view for part of your stay.`,
        `Book private guided excursions rather than shared group transport for personalized pacing.`,
        ...(destData.budgetTips || [])
      ]
    };
  } else if (ratio < 0.85) {
    feasibility = {
      status: 'Budget-Conscious / Tight',
      badgeClass: 'feasibility-tight',
      headline: 'Budget-Conscious: Smart Planning Advised!',
      message: `Your budget of ${money(totalBudget, currency)} is on the tighter side for ${travelers} traveler(s) over ${days} days in ${destData.name}. Following our money-saving recommendations will keep you well on track.`,
      tips: [
        `Book accommodations 3-6 weeks in advance to lock in early-bird hostel/guesthouse discounts.`,
        `Rely on public transit or shared ride passes rather than on-demand private taxis.`,
        `Enjoy authentic meals at family-run local eateries and food markets where food is fresh and affordable.`,
        ...(destData.budgetTips || [])
      ]
    };
  }

  return {
    id: crypto.randomUUID(),
    title: f.name ? f.name.trim() : `${days}-Day ${destData.name} Journey`,
    destination: destData.name,
    rawDestination: destInput,
    origin: f.origin ? f.origin.trim() : '',
    start: f.start || '',
    end: f.end || '',
    days,
    travelers,
    style,
    kind,
    notes: f.notes ? f.notes.trim() : '',
    budget: totalBudget,
    currency,
    stayAreas: destData.stayAreas,
    hotels: hotelsConverted,
    meals: mealsConverted,
    foods: destData.foods,
    transport: transportConverted,
    alloc: rawAlloc,
    daylist,
    feasibility,
    packing: destData.packing.map(item => ({ name: item, done: false }))
  };
}

// -----------------------------------------------------------------------------
// RENDER GENERATED PLAN IN RESULTS MODAL
// -----------------------------------------------------------------------------
function renderPlan(p) {
  $('results-title').textContent = p.title || `${p.days}-Day ${p.destination} Journey`;

  // Meta Chips
  const styleNames = { budget: 'Budget-Friendly', balanced: 'Balanced', comfort: 'Luxury / Comfort' };
  const kindNames = {
    mix: 'Balanced Mix', beach: 'Beach & Coastal', culture: 'Culture & Heritage',
    nature: 'Nature & Mountains', food: 'Foodie Focus', family: 'Family Leisure', romantic: 'Romantic'
  };

  $('results-meta-chips').innerHTML = `
    <span class="meta-chip">⌖ ${esc(p.destination)}</span>
    <span class="meta-chip">◈ Total Budget: ${money(p.budget, p.currency)}</span>
    <span class="meta-chip">◷ ${p.days} Days${p.start ? ` (${esc(p.start)}${p.end ? ' to ' + esc(p.end) : ''})` : ''}</span>
    <span class="meta-chip">👥 ${p.travelers} Traveler${p.travelers > 1 ? 's' : ''}</span>
    <span class="meta-chip">✨ Style: ${esc(styleNames[p.style] || p.style)}</span>
    <span class="meta-chip">🎯 Focus: ${esc(kindNames[p.kind] || p.kind)}</span>
    ${p.origin ? `<span class="meta-chip">🛫 From: ${esc(p.origin)}</span>` : ''}
  `;

  const perPerson = Math.round(p.budget / p.travelers);
  const perDay = Math.round(p.budget / p.days);
  const maxAlloc = Math.max(...p.alloc.map(a => a.amount), 1);

  // If in Edit Mode, render editable inputs for activities and title
  if (isEditPlanMode) {
    renderEditPlanMode(p);
    return;
  }

  $('results-edit-toggle').textContent = '✎ Edit Plan';

  $('planner-results').innerHTML = `
    <!-- 1. DAY-BY-DAY ITINERARY -->
    <div class="result-card">
      <h3>🗓️ 1. Day-by-Day Itinerary with Places to Visit</h3>
      <p class="small-note" style="margin-top:-6px;margin-bottom:14px">Thoughtfully paced daily schedule optimized for your travel style and group size.</p>
      <div class="day-list">
        ${p.daylist.map(d => `
          <div class="day-card">
            <h4>
              <span>Day ${d.day} — ${esc(d.title)}</span>
              ${d.dateStr ? `<span class="day-date-tag">${esc(d.dateStr)}</span>` : ''}
            </h4>
            <div class="day-schedule-grid">
              <div class="day-slot"><span class="day-slot-badge">🌅 Morning</span><div>${esc(d.morning)}</div></div>
              <div class="day-slot"><span class="day-slot-badge">☀️ Afternoon</span><div>${esc(d.afternoon)}</div></div>
              <div class="day-slot"><span class="day-slot-badge">🌙 Evening</span><div>${esc(d.evening)}</div></div>
            </div>
            ${d.places && d.places.length ? `
              <div class="day-places-box">
                <span style="font-size:11px;font-weight:700;color:var(--muted);align-self:center">📍 Places to Visit:</span>
                ${d.places.map(pl => `<span class="place-tag">${esc(pl)}</span>`).join('')}
              </div>
            ` : ''}
            ${d.tip ? `<div class="day-tip-box">💡 <b>Daily Tip:</b> ${esc(d.tip)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 2. SUGGESTED HOTELS & AREAS TO STAY -->
    <div class="result-card">
      <h3>🏨 2. Suggested Hotels & Areas to Stay</h3>
      <div class="stay-areas-box">
        ${p.stayAreas.map(a => `
          <div class="stay-area-card">
            <h5>⌖ ${esc(a.name)}</h5>
            <p>${esc(a.rationale)}</p>
            <p style="margin-top:6px;font-size:11px;color:var(--teal);font-weight:600">Best for: ${esc(a.bestFor)}</p>
          </div>
        `).join('')}
      </div>
      <h4 style="margin:16px 0 10px;font-size:14px;font-weight:700">Recommended Stays by Budget Tier</h4>
      <div class="hotel-grid">
        ${p.hotels.map(h => `
          <div class="hotel-card ${h.isUserTier ? 'selected-tier' : ''}">
            <span class="hotel-tier-pill tier-${h.tier}">${esc(h.tierName)} ${h.isUserTier ? '★ Best Match' : ''}</span>
            <h4>${esc(h.name)}</h4>
            <div class="hotel-price">${esc(h.priceFormatted)}</div>
            <p style="font-size:12px;color:var(--muted);margin:0 0 6px">${esc(h.highlight)}</p>
            <div class="hotel-amenities">
              ${(h.amenities || []).map(am => `<span class="hotel-amenity-tag">✓ ${esc(am)}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 3. BREAKFAST, LUNCH & DINNER SUGGESTIONS -->
    <div class="result-card">
      <h3>🍽️ 3. Breakfast, Lunch & Dinner Suggestions</h3>
      <p class="small-note" style="margin-top:-6px;margin-bottom:14px">Curated daily dining spots, local specialties, and estimated meal costs.</p>
      <div class="meals-overview">
        <div class="meal-card">
          <div class="meal-type-title">
            <span>🌅 Breakfast</span>
            <span class="meal-cost">~${esc(p.meals.breakfast.costFormatted)}</span>
          </div>
          <h5 style="margin:0 0 4px;font-size:14px">${esc(p.meals.breakfast.spot)}</h5>
          <p style="margin:0;font-size:12px;color:var(--muted);line-height:1.4">${esc(p.meals.breakfast.desc)}</p>
        </div>
        <div class="meal-card">
          <div class="meal-type-title">
            <span>☀️ Lunch</span>
            <span class="meal-cost">~${esc(p.meals.lunch.costFormatted)}</span>
          </div>
          <h5 style="margin:0 0 4px;font-size:14px">${esc(p.meals.lunch.spot)}</h5>
          <p style="margin:0;font-size:12px;color:var(--muted);line-height:1.4">${esc(p.meals.lunch.desc)}</p>
        </div>
        <div class="meal-card">
          <div class="meal-type-title">
            <span>🌙 Dinner</span>
            <span class="meal-cost">~${esc(p.meals.dinner.costFormatted)}</span>
          </div>
          <h5 style="margin:0 0 4px;font-size:14px">${esc(p.meals.dinner.spot)}</h5>
          <p style="margin:0;font-size:12px;color:var(--muted);line-height:1.4">${esc(p.meals.dinner.desc)}</p>
        </div>
      </div>
    </div>

    <!-- 4. LOCAL FOODS TO TRY -->
    <div class="result-card">
      <h3>🍲 4. Must-Try Local Foods & Regional Specialties</h3>
      <div class="food-grid">
        ${p.foods.map(f => `
          <div class="food-card">
            <h5>🍴 ${esc(f.name)}</h5>
            <p>${esc(f.desc)}</p>
            <div class="food-where">📍 Where to try: ${esc(f.bestWhere)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 5. TRANSPORT OPTIONS AND ESTIMATED COSTS -->
    <div class="result-card">
      <h3>🚕 5. Transport Options & Estimated Costs</h3>
      <div class="transport-summary">
        <div class="transport-card" style="background:#f0f6f3;border-color:#d5e5db">
          <h5>🛫 Airport / Station Transfer</h5>
          <p>${esc(p.transport.airport.desc)}</p>
          <div class="transport-fare">Estimated Cost: ${esc(p.transport.airport.costFormatted)}</div>
        </div>
        <div class="transport-grid">
          ${p.transport.options.map(opt => `
            <div class="transport-card">
              <h5>${esc(opt.mode)}</h5>
              <p>${esc(opt.desc)}</p>
              <div class="transport-fare">${esc(opt.costFormatted)}</div>
            </div>
          `).join('')}
        </div>
        ${p.transport.tips ? `<div class="day-tip-box" style="margin-top:6px">💡 <b>Transit Tip:</b> ${esc(p.transport.tips)}</div>` : ''}
      </div>
    </div>

    <!-- 6. COMPLETE BUDGET BREAKDOWN -->
    <div class="result-card">
      <h3>📊 6. Complete Budget Breakdown</h3>
      <div class="budget-summary-grid">
        <div class="budget-stat-box"><span>Total Budget</span><strong>${money(p.budget, p.currency)}</strong></div>
        <div class="budget-stat-box"><span>Per Traveler</span><strong>${money(perPerson, p.currency)}</strong></div>
        <div class="budget-stat-box"><span>Per Day</span><strong>${money(perDay, p.currency)}</strong></div>
      </div>
      <div class="budget-bars">
        ${p.alloc.map(a => `
          <div class="budget-rowline">
            <span>${esc(a.label)} <small style="color:var(--muted)">(${a.pct}%)</small></span>
            <div class="bar"><span style="width:${Math.max(5, a.amount / maxAlloc * 100)}%"></span></div>
            <b>${money(a.amount, p.currency)}</b>
          </div>
        `).join('')}
      </div>
      <p class="small-note">Allocations are calculated from realistic travel averages. Actual expenses may vary based on booking time and personal preferences.</p>
    </div>

    <!-- 7. RECOMMENDATIONS WITHIN MY BUDGET -->
    <div class="result-card">
      <h3>💡 7. Recommendations Within Your Budget</h3>
      <div class="feasibility-banner ${p.feasibility.badgeClass}">
        <span style="font-size:24px">✦</span>
        <div>
          <h4 style="margin:0 0 4px;font-size:15px">${esc(p.feasibility.headline)}</h4>
          <p style="margin:0;font-size:13px;line-height:1.4">${esc(p.feasibility.message)}</p>
        </div>
      </div>
      <h4 style="margin:14px 0 8px;font-size:14px">Smart Recommendations & Cost-Saving Tips:</h4>
      <div class="tips-list">
        ${(p.feasibility.tips || []).map(tip => `
          <div class="tip-item">
            <span class="bullet">✔</span>
            <div>${esc(tip)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Render interactive Edit Plan Mode in results dialog
function renderEditPlanMode(p) {
  $('results-edit-toggle').textContent = '✔ Done Editing';
  $('planner-results').innerHTML = `
    <div class="edit-plan-form-area">
      <h3 style="margin:0 0 8px;font-size:18px">✎ Edit Plan Details</h3>
      <p class="small-note" style="margin-top:0;margin-bottom:14px">Customize the journey title, your personal notes, or modify day activities before saving to your dashboard.</p>
      
      <label style="margin-bottom:12px;display:grid;gap:6px;font-size:11px;font-weight:700">
        TRIP TITLE
        <input id="edit-plan-title" value="${esc(p.title || `${p.days}-Day ${p.destination} Journey`)}">
      </label>

      <label style="margin-bottom:14px;display:grid;gap:6px;font-size:11px;font-weight:700">
        TRAVEL NOTES & GOALS
        <textarea id="edit-plan-notes">${esc(p.notes || '')}</textarea>
      </label>

      <h4 style="margin:16px 0 10px;font-size:14px">Customize Day Activities</h4>
      ${p.daylist.map((d, idx) => `
        <div class="edit-day-item">
          <h5>Day ${d.day}: ${esc(d.dateStr || '')}</h5>
          <div style="display:grid;gap:8px">
            <label style="display:grid;gap:4px;font-size:11px;font-weight:600">Day Title
              <input class="edit-day-title" data-idx="${idx}" value="${esc(d.title)}">
            </label>
            <label style="display:grid;gap:4px;font-size:11px;font-weight:600">Morning Activity
              <input class="edit-day-morning" data-idx="${idx}" value="${esc(d.morning)}">
            </label>
            <label style="display:grid;gap:4px;font-size:11px;font-weight:600">Afternoon Activity
              <input class="edit-day-afternoon" data-idx="${idx}" value="${esc(d.afternoon)}">
            </label>
            <label style="display:grid;gap:4px;font-size:11px;font-weight:600">Evening Activity
              <input class="edit-day-evening" data-idx="${idx}" value="${esc(d.evening)}">
            </label>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function saveEditPlanChanges() {
  if (!generated) return;
  const titleInput = $('edit-plan-title');
  const notesInput = $('edit-plan-notes');
  if (titleInput) generated.title = titleInput.value.trim();
  if (notesInput) generated.notes = notesInput.value.trim();

  document.querySelectorAll('.edit-day-title').forEach(el => {
    const idx = +el.dataset.idx;
    if (generated.daylist[idx]) generated.daylist[idx].title = el.value.trim();
  });
  document.querySelectorAll('.edit-day-morning').forEach(el => {
    const idx = +el.dataset.idx;
    if (generated.daylist[idx]) generated.daylist[idx].morning = el.value.trim();
  });
  document.querySelectorAll('.edit-day-afternoon').forEach(el => {
    const idx = +el.dataset.idx;
    if (generated.daylist[idx]) generated.daylist[idx].afternoon = el.value.trim();
  });
  document.querySelectorAll('.edit-day-evening').forEach(el => {
    const idx = +el.dataset.idx;
    if (generated.daylist[idx]) generated.daylist[idx].evening = el.value.trim();
  });
}

// -----------------------------------------------------------------------------
// SAVE GENERATED TRIP TO DASHBOARD
// -----------------------------------------------------------------------------
function saveGeneratedTrip() {
  if (!generated) return;
  if (isEditPlanMode) {
    saveEditPlanChanges();
    isEditPlanMode = false;
  }

  // Convert generated daylist into interactive itinerary entries
  const itinerary = [];
  generated.daylist.forEach(d => {
    if (d.morning) {
      itinerary.push({ id: crypto.randomUUID(), day: d.day, name: `Morning: ${d.morning}`, time: '09:30 AM' });
    }
    if (d.afternoon) {
      itinerary.push({ id: crypto.randomUUID(), day: d.day, name: `Afternoon: ${d.afternoon}`, time: '02:00 PM' });
    }
    if (d.evening) {
      itinerary.push({ id: crypto.randomUUID(), day: d.day, name: `Evening: ${d.evening}`, time: '07:00 PM' });
    }
  });

  const newTrip = {
    id: crypto.randomUUID(),
    name: generated.title || `${generated.days}-Day ${generated.destination} Journey`,
    destination: generated.destination,
    origin: generated.origin || '',
    start: generated.start || '',
    end: generated.end || '',
    budget: generated.budget,
    currency: generated.currency,
    days: generated.days,
    travelers: generated.travelers,
    style: generated.style,
    kind: generated.kind,
    notes: generated.notes,
    type: 'Goal-Based Plan',
    generated: true,
    stayAreas: generated.stayAreas,
    hotels: generated.hotels,
    meals: generated.meals,
    foods: generated.foods,
    transport: generated.transport,
    alloc: generated.alloc,
    feasibility: generated.feasibility,
    itinerary,
    packing: generated.packing || [],
    expenses: []
  };

  trips.unshift(newTrip);
  save();

  $('results-dialog').close();
  renderHome();
  openTrip(newTrip.id);
  toast(`"${newTrip.name}" saved to your dashboard!`);
}

// -----------------------------------------------------------------------------
// REGENERATE TRIP PLAN (DYNAMIC FOR THAT SPECIFIC TRIP)
// -----------------------------------------------------------------------------
function regenerateTripPlan(id) {
  const t = trips.find(x => x.id === id);
  if (!t) return;

  const freshPlan = buildPlan({
    name: t.name,
    destination: t.destination,
    origin: t.origin || '',
    start: t.start || '',
    end: t.end || '',
    days: t.days || 5,
    budget: t.budget,
    currency: t.currency || 'USD',
    travelers: t.travelers || 2,
    style: t.style || 'balanced',
    kind: t.kind || 'mix',
    notes: t.notes || ''
  });

  t.stayAreas = freshPlan.stayAreas;
  t.hotels = freshPlan.hotels;
  t.meals = freshPlan.meals;
  t.foods = freshPlan.foods;
  t.transport = freshPlan.transport;
  t.alloc = freshPlan.alloc;
  t.feasibility = freshPlan.feasibility;
  t.packing = freshPlan.packing;

  // Convert fresh daylist into itinerary items
  const newItinerary = [];
  freshPlan.daylist.forEach(d => {
    if (d.morning) newItinerary.push({ id: crypto.randomUUID(), day: d.day, name: `Morning: ${d.morning}`, time: '09:30 AM' });
    if (d.afternoon) newItinerary.push({ id: crypto.randomUUID(), day: d.day, name: `Afternoon: ${d.afternoon}`, time: '02:00 PM' });
    if (d.evening) newItinerary.push({ id: crypto.randomUUID(), day: d.day, name: `Evening: ${d.evening}`, time: '07:00 PM' });
  });
  t.itinerary = newItinerary;

  save();
  openTrip(id);
  toast(`Trip plan regenerated for ${t.destination}!`);
}

// -----------------------------------------------------------------------------
// DASHBOARD & TRIP RENDERING
// -----------------------------------------------------------------------------
function renderHome() {
  $('dashboard-view').classList.remove('hidden');
  $('trip-detail-view').classList.add('hidden');
  $('empty-state').style.display = trips.length ? 'none' : 'block';
  $('welcome').textContent = trips.length ? 'Your next adventure starts here' : 'Start your first adventure';

  $('trip-cards').innerHTML = trips.map(t => {
    const datesText = t.start ? `${esc(t.start)}${t.end ? ' — ' + esc(t.end) : ''}` : 'Flexible dates';
    return `
      <article class="trip-card" data-open="${t.id}">
        <span class="pill ${t.generated ? 'goal-pill' : ''}">
          ${t.generated ? '✦ Custom Plan' : esc(t.type || 'Journey')}
        </span>
        <h3>${esc(t.name)}</h3>
        <p>⌖ <b>${esc(t.destination)}</b></p>
        <p>◷ ${datesText}</p>
        <p>◈ ${money(t.budget, t.currency)}${t.days ? ` · ${t.days} days` : ''}${t.travelers ? ` · ${t.travelers} traveler(s)` : ''}</p>
        <div class="card-footer">
          Open journey plan & itinerary →
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('[data-open]').forEach(el => {
    el.onclick = () => openTrip(el.dataset.open);
  });
}

// -----------------------------------------------------------------------------
// TRIP DETAIL VIEW
// -----------------------------------------------------------------------------
function openTrip(id) {
  currentId = id;
  const t = trips.find(x => x.id === id);
  if (!t) return;

  $('dashboard-view').classList.add('hidden');
  $('trip-detail-view').classList.remove('hidden');

  $('detail-title').textContent = t.name;
  $('detail-destination').textContent = t.destination;

  // Header meta tags
  const datesText = t.start ? `${t.start}${t.end ? ' to ' + t.end : ''}` : 'Flexible dates';
  $('detail-tags').innerHTML = `
    <span class="meta-chip">◈ Budget: ${money(t.budget, t.currency)}</span>
    <span class="meta-chip">◷ ${datesText}${t.days ? ` (${t.days} Days)` : ''}</span>
    ${t.travelers ? `<span class="meta-chip">👥 ${t.travelers} Traveler(s)</span>` : ''}
    ${t.style ? `<span class="meta-chip">✨ Style: ${t.style}</span>` : ''}
    ${t.kind ? `<span class="meta-chip">🎯 Type: ${t.kind}</span>` : ''}
  `;

  // Render Itinerary Tab
  const sortedItinerary = (t.itinerary || []).slice().sort((a, b) => a.day - b.day);
  $('itinerary-list').innerHTML = sortedItinerary.length ? sortedItinerary.map(a => `
    <div class="entry">
      <div>
        <b>Day ${a.day}: ${esc(a.name)}</b><br>
        <small>${esc(a.time || 'Flexible time')}</small>
      </div>
      <button class="outline-btn danger-hover" data-remove-act="${a.id}" style="padding:4px 8px" title="Remove activity">×</button>
    </div>
  `).join('') : '<p class="muted">No activities recorded yet. Click "⟲ Regenerate plan" or add activities above.</p>';

  document.querySelectorAll('[data-remove-act]').forEach(b => {
    b.onclick = () => {
      t.itinerary = t.itinerary.filter(a => a.id !== b.dataset.removeAct);
      save();
      openTrip(id);
    };
  });

  // Render Hotels & Stay Tab
  if (t.stayAreas && t.stayAreas.length) {
    $('detail-stay-areas').innerHTML = t.stayAreas.map(a => `
      <div class="stay-area-card">
        <h5>⌖ ${esc(a.name)}</h5>
        <p>${esc(a.rationale)}</p>
        <p style="margin-top:4px;font-size:11px;color:var(--teal);font-weight:600">Best for: ${esc(a.bestFor)}</p>
      </div>
    `).join('');
  } else {
    $('detail-stay-areas').innerHTML = '<p class="muted">No stay areas recorded. Click "⟲ Regenerate plan" to generate tailored stays.</p>';
  }

  if (t.hotels && t.hotels.length) {
    $('detail-hotels-list').innerHTML = t.hotels.map(h => `
      <div class="hotel-card ${h.isUserTier ? 'selected-tier' : ''}">
        <span class="hotel-tier-pill tier-${h.tier}">${esc(h.tierName)}</span>
        <h4>${esc(h.name)}</h4>
        <div class="hotel-price">${esc(h.priceFormatted)}</div>
        <p style="font-size:12px;color:var(--muted);margin:0 0 6px">${esc(h.highlight)}</p>
        <div class="hotel-amenities">
          ${(h.amenities || []).map(am => `<span class="hotel-amenity-tag">✓ ${esc(am)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  } else {
    $('detail-hotels-list').innerHTML = '<p class="muted">No specific hotel recommendations recorded.</p>';
  }

  // Render Dining & Food Tab
  if (t.meals) {
    $('detail-meals-box').innerHTML = `
      <div class="meal-card">
        <div class="meal-type-title"><span>🌅 Breakfast</span><span class="meal-cost">~${esc(t.meals.breakfast.costFormatted)}</span></div>
        <h5 style="margin:0 0 4px;font-size:14px">${esc(t.meals.breakfast.spot)}</h5>
        <p style="margin:0;font-size:12px;color:var(--muted)">${esc(t.meals.breakfast.desc)}</p>
      </div>
      <div class="meal-card">
        <div class="meal-type-title"><span>☀️ Lunch</span><span class="meal-cost">~${esc(t.meals.lunch.costFormatted)}</span></div>
        <h5 style="margin:0 0 4px;font-size:14px">${esc(t.meals.lunch.spot)}</h5>
        <p style="margin:0;font-size:12px;color:var(--muted)">${esc(t.meals.lunch.desc)}</p>
      </div>
      <div class="meal-card">
        <div class="meal-type-title"><span>🌙 Dinner</span><span class="meal-cost">~${esc(t.meals.dinner.costFormatted)}</span></div>
        <h5 style="margin:0 0 4px;font-size:14px">${esc(t.meals.dinner.spot)}</h5>
        <p style="margin:0;font-size:12px;color:var(--muted)">${esc(t.meals.dinner.desc)}</p>
      </div>
    `;
  } else {
    $('detail-meals-box').innerHTML = '<p class="muted">No meal recommendations saved. Click "⟲ Regenerate plan" to generate meals.</p>';
  }

  if (t.foods && t.foods.length) {
    $('detail-foods-list').innerHTML = t.foods.map(f => `
      <div class="food-card">
        <h5>🍴 ${esc(f.name)}</h5>
        <p>${esc(f.desc)}</p>
        <div class="food-where">📍 Where to try: ${esc(f.bestWhere)}</div>
      </div>
    `).join('');
  } else {
    $('detail-foods-list').innerHTML = '<p class="muted">No local food suggestions recorded.</p>';
  }

  // Render Transport Tab
  if (t.transport) {
    $('detail-transport-content').innerHTML = `
      <div class="transport-summary">
        <div class="transport-card" style="background:#f0f6f3;border-color:#d5e5db">
          <h5>🛫 Airport / Station Transfer</h5>
          <p>${esc(t.transport.airport.desc)}</p>
          <div class="transport-fare">Estimated Cost: ${esc(t.transport.airport.costFormatted)}</div>
        </div>
        <div class="transport-grid">
          ${(t.transport.options || []).map(opt => `
            <div class="transport-card">
              <h5>${esc(opt.mode)}</h5>
              <p>${esc(opt.desc)}</p>
              <div class="transport-fare">${esc(opt.costFormatted)}</div>
            </div>
          `).join('')}
        </div>
        ${t.transport.tips ? `<div class="day-tip-box" style="margin-top:6px">💡 <b>Transit Tip:</b> ${esc(t.transport.tips)}</div>` : ''}
      </div>
    `;
  } else {
    $('detail-transport-content').innerHTML = '<p class="muted">No transport guidance recorded for this trip.</p>';
  }

  // Render Budget & Expenses Tab
  if (t.alloc && t.alloc.length) {
    const maxAlloc = Math.max(...t.alloc.map(a => a.amount), 1);
    $('detail-budget-bars').innerHTML = `
      <div class="budget-bars">
        ${t.alloc.map(a => `
          <div class="budget-rowline">
            <span>${esc(a.label)} <small style="color:var(--muted)">(${a.pct}%)</small></span>
            <div class="bar"><span style="width:${Math.max(5, a.amount / maxAlloc * 100)}%"></span></div>
            <b>${money(a.amount, t.currency)}</b>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    $('detail-budget-bars').innerHTML = '<p class="muted">No categorized budget allocations saved.</p>';
  }

  const spent = (t.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
  const pctSpent = Math.min(100, t.budget ? (spent / t.budget) * 100 : 0);
  $('budget-total').innerHTML = `
    <strong>${money(spent, t.currency)}</strong>
    <span class="muted">spent of ${money(t.budget, t.currency)} (${Math.round(pctSpent)}%)</span>
    <div class="bar" style="margin-top:12px">
      <span style="width:${pctSpent}%"></span>
    </div>
  `;

  $('expense-list').innerHTML = (t.expenses || []).length ? (t.expenses || []).map((e, i) => `
    <div class="entry">
      <span>${esc(e.name)}</span>
      <b>${money(e.amount, t.currency)} 
        <button class="outline-btn danger-hover" data-del-exp="${i}" style="padding:3px 7px" title="Delete expense">×</button>
      </b>
    </div>
  `).join('') : '<p class="muted">No expenses recorded yet. Use the form above to track your spending.</p>';

  document.querySelectorAll('[data-del-exp]').forEach(b => {
    b.onclick = () => {
      t.expenses.splice(+b.dataset.delExp, 1);
      save();
      openTrip(id);
    };
  });

  // Render Recommendations Tab
  if (t.feasibility) {
    $('detail-recommendations-content').innerHTML = `
      <div class="feasibility-banner ${t.feasibility.badgeClass}">
        <span style="font-size:24px">✦</span>
        <div>
          <h4 style="margin:0 0 4px;font-size:15px">${esc(t.feasibility.headline)}</h4>
          <p style="margin:0;font-size:13px;line-height:1.4">${esc(t.feasibility.message)}</p>
        </div>
      </div>
      <h4 style="margin:16px 0 8px;font-size:14px">Smart Recommendations & Cost-Saving Tips:</h4>
      <div class="tips-list">
        ${(t.feasibility.tips || []).map(tip => `
          <div class="tip-item">
            <span class="bullet">✔</span>
            <div>${esc(tip)}</div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    $('detail-recommendations-content').innerHTML = '<p class="muted">No specific budget recommendations recorded.</p>';
  }

  // Render Packing List Tab
  $('packing-list').innerHTML = (t.packing || []).length ? (t.packing || []).map((p, i) => `
    <div class="entry">
      <label style="display:flex;gap:8px;align-items:center;letter-spacing:0;cursor:pointer">
        <input type="checkbox" data-pack="${i}" ${p.done ? 'checked' : ''}>
        <span style="${p.done ? 'text-decoration:line-through;color:#87948d' : ''}">${esc(p.name)}</span>
      </label>
      <button class="outline-btn danger-hover" data-del-pack="${i}" style="padding:3px 7px" title="Delete item">×</button>
    </div>
  `).join('') : '<p class="muted">Your packing checklist is empty.</p>';

  document.querySelectorAll('[data-pack]').forEach(b => {
    b.onchange = () => {
      t.packing[+b.dataset.pack].done = b.checked;
      save();
      openTrip(id);
    };
  });

  document.querySelectorAll('[data-del-pack]').forEach(b => {
    b.onclick = () => {
      t.packing.splice(+b.dataset.delPack, 1);
      save();
      openTrip(id);
    };
  });
}

// -----------------------------------------------------------------------------
// EVENT HANDLERS & INITIALIZATION
// -----------------------------------------------------------------------------

// Detail View Tabs Switching
document.querySelectorAll('.detail-tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const targetPane = $(btn.dataset.tab);
    if (targetPane) targetPane.classList.add('active');
  };
});

// Back to Dashboard
$('back-home').onclick = renderHome;

// Regenerate Current Trip Plan Button
$('regenerate-current-trip').onclick = () => {
  if (!currentId) return;
  const t = trips.find(x => x.id === currentId);
  if (!t) return;
  if (confirm(`Regenerate a fresh itinerary, hotels, dining, and budget breakdown for "${t.name}" based on its current destination (${t.destination}), dates, and budget?`)) {
    regenerateTripPlan(currentId);
  }
};

// Delete Current Trip
$('delete-current').onclick = () => {
  if (confirm('Are you sure you want to delete this trip and its saved itinerary, budget, and notes?')) {
    trips = trips.filter(t => t.id !== currentId);
    save();
    renderHome();
    toast('Trip deleted from dashboard');
  }
};

// Edit Current Trip Details
$('edit-current-trip').onclick = () => {
  const t = trips.find(x => x.id === currentId);
  if (!t) return;
  $('edit-trip-name').value = t.name;
  $('edit-trip-destination').value = t.destination;
  $('edit-trip-start').value = t.start || '';
  $('edit-trip-end').value = t.end || '';
  $('edit-trip-budget').value = t.budget || '';
  $('edit-trip-currency').value = t.currency || 'USD';
  $('edit-trip-travelers').value = t.travelers || 2;
  $('edit-trip-style').value = t.style || 'balanced';
  $('edit-trip-kind').value = t.kind || 'mix';
  $('edit-trip-notes').value = t.notes || '';
  $('edit-trip-dialog').showModal();
};

$('close-edit-trip').onclick = () => $('edit-trip-dialog').close();
$('cancel-edit-trip').onclick = () => $('edit-trip-dialog').close();

$('edit-trip-form').onsubmit = e => {
  e.preventDefault();
  const t = trips.find(x => x.id === currentId);
  if (!t) return;
  t.name = $('edit-trip-name').value.trim();
  t.destination = $('edit-trip-destination').value.trim();
  t.start = $('edit-trip-start').value;
  t.end = $('edit-trip-end').value;
  t.budget = +$('edit-trip-budget').value || 0;
  t.currency = $('edit-trip-currency').value;
  t.travelers = +$('edit-trip-travelers').value || 2;
  t.style = $('edit-trip-style').value;
  t.kind = $('edit-trip-kind').value;
  t.notes = $('edit-trip-notes').value.trim();

  if (t.start && t.end) {
    const s = new Date(t.start);
    const en = new Date(t.end);
    if (!isNaN(s) && !isNaN(en) && en >= s) {
      t.days = Math.max(1, Math.round((en - s) / 86400000) + 1);
    }
  }

  save();
  $('edit-trip-dialog').close();
  openTrip(t.id);
  toast('Trip details updated!');

  setTimeout(() => {
    if (confirm('Would you like to automatically regenerate the itinerary, hotel recommendations, meals, and budget breakdown to reflect your updated details?')) {
      regenerateTripPlan(t.id);
    }
  }, 350);
};

// Add Activity Form
$('activity-form').onsubmit = e => {
  e.preventDefault();
  const t = trips.find(x => x.id === currentId);
  if (!t) return;
  t.itinerary.push({
    id: crypto.randomUUID(),
    day: +$('activity-day').value,
    name: $('activity-name').value.trim(),
    time: $('activity-time').value.trim()
  });
  t.itinerary.sort((a, b) => a.day - b.day);
  save();
  $('activity-name').value = '';
  $('activity-time').value = '';
  openTrip(currentId);
  toast('Activity added to itinerary');
};

// Add Packing Item Form
$('packing-form').onsubmit = e => {
  e.preventDefault();
  const t = trips.find(x => x.id === currentId);
  if (!t) return;
  t.packing.push({ name: $('packing-name').value.trim(), done: false });
  $('packing-name').value = '';
  save();
  openTrip(currentId);
};

// Add Expense Form
$('expense-form').onsubmit = e => {
  e.preventDefault();
  const t = trips.find(x => x.id === currentId);
  if (!t) return;
  t.expenses.push({
    name: $('expense-name').value.trim(),
    amount: +$('expense-amount').value || 0
  });
  $('expense-name').value = '';
  $('expense-amount').value = '';
  save();
  openTrip(currentId);
  toast('Expense recorded');
};

// Sign Out & Info Bubble
$('sign-out').onclick = () => {
  toast('Free local mode: No account needed. Your trips are securely stored in this browser.');
};

$('free-info').onclick = () => {
  alert('Make My Travel — Free Smart Travel Planner\n\n100% Client-Side rule-based travel planner. Generates day-by-day itineraries, hotels, meals, transport costs, and budget recommendations for every new journey without paid APIs or external API keys.');
};

// Open Journey Planner (Reusable for every new journey)
const openJourneyPlanner = () => {
  $('goal-form').reset();
  $('goal-days').value = 5;
  $('goal-travelers').value = 2;
  $('goal-style').value = 'balanced';
  $('goal-kind').value = 'mix';
  $('planner-dialog').showModal();
};

$('goal-planner-open').onclick = openJourneyPlanner;
$('new-trip').onclick = openJourneyPlanner;

$('close-planner').onclick = () => $('planner-dialog').close();
$('close-results').onclick = () => $('results-dialog').close();
$('results-close-bottom').onclick = () => $('results-dialog').close();

// Date Sync in Goal Planner
function syncDatesAndDays() {
  const start = $('goal-start').value;
  const end = $('goal-end').value;
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    if (!isNaN(s) && !isNaN(e) && e >= s) {
      const diff = Math.max(1, Math.round((e - s) / 86400000) + 1);
      $('goal-days').value = Math.min(14, diff);
    }
  }
}

$('goal-start').onchange = () => {
  const start = $('goal-start').value;
  const days = +$('goal-days').value || 5;
  if (start && !$('goal-end').value) {
    const s = new Date(start);
    s.setDate(s.getDate() + days - 1);
    $('goal-end').value = s.toISOString().split('T')[0];
  } else {
    syncDatesAndDays();
  }
};

$('goal-end').onchange = syncDatesAndDays;

$('goal-days').oninput = () => {
  const start = $('goal-start').value;
  const days = +$('goal-days').value;
  if (start && days > 0) {
    const s = new Date(start);
    s.setDate(s.getDate() + days - 1);
    $('goal-end').value = s.toISOString().split('T')[0];
  }
};

// Automatically Generate Trip Plan on Submit
$('goal-form').onsubmit = e => {
  e.preventDefault();

  const planParams = {
    name: $('goal-trip-name') ? $('goal-trip-name').value : '',
    destination: $('goal-destination').value,
    origin: $('goal-origin').value,
    start: $('goal-start').value,
    end: $('goal-end').value,
    budget: +$('goal-budget').value,
    currency: $('goal-currency').value,
    days: +$('goal-days').value,
    travelers: +$('goal-travelers').value,
    style: $('goal-style').value,
    kind: $('goal-kind').value,
    notes: $('goal-notes').value
  };

  generated = buildPlan(planParams);
  isEditPlanMode = false;

  $('planner-dialog').close();
  renderPlan(generated);
  $('results-dialog').showModal();
};

// Results Dialog Action Buttons
$('results-edit-toggle').onclick = () => {
  if (!generated) return;
  if (isEditPlanMode) {
    saveEditPlanChanges();
    isEditPlanMode = false;
    renderPlan(generated);
  } else {
    isEditPlanMode = true;
    renderEditPlanMode(generated);
  }
};

$('results-tweak-btn').onclick = () => {
  $('results-dialog').close();
  if (generated) {
    if ($('goal-trip-name')) $('goal-trip-name').value = generated.title || '';
    $('goal-destination').value = generated.rawDestination || generated.destination;
    $('goal-origin').value = generated.origin || '';
    $('goal-start').value = generated.start || '';
    $('goal-end').value = generated.end || '';
    $('goal-budget').value = generated.budget;
    $('goal-currency').value = generated.currency;
    $('goal-days').value = generated.days;
    $('goal-travelers').value = generated.travelers;
    $('goal-style').value = generated.style;
    $('goal-kind').value = generated.kind;
    $('goal-notes').value = generated.notes || '';
  }
  $('planner-dialog').showModal();
};

$('save-generated-trip').onclick = saveGeneratedTrip;
$('save-generated-trip-bottom').onclick = saveGeneratedTrip;

// Initialize app on load
renderHome();
