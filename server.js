const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const HTML_FILE = path.join(ROOT, 'brewdodisha.html');
const EXPLORE_FILE = path.join(ROOT, 'explore-wip.html');
const DATA_DIR = path.join(ROOT, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const sessions = new Map();

const nearbyPlaces = [
  'Ekamra Haat',
  'Forest Park',
  'IG Park',
  'Khandagiri and Udayagiri',
  'Museum stop in Bhubaneswar',
  'Saheed Nagar market walk'
];

const getawayIdeas = [
  'Puri Beach',
  'Konark Sun Temple',
  'Chilika Lake',
  'Deras Dam',
  'Chandaka Forest edge',
  'Raghurajpur',
  'Jhumka Dam',
  'Nandankanan'
];

const cafesData = [
  { name: 'Romeo Lane', area: 'Patia, BBSR', vibe: ['cozy', 'chill', 'warm', 'date'] },
  { name: 'Asian Delicacy', area: 'Jaydev Vihar, BBSR', vibe: ['aesthetic', 'date', 'quiet', 'polished'] },
  { name: 'Birch', area: 'Saheed Nagar, BBSR', vibe: ['lively', 'explore', 'aesthetic', 'group'] },
  { name: 'Leaf and Latte', area: 'Nayapalli, BBSR', vibe: ['cozy', 'green', 'chill', 'aesthetic'] },
  { name: 'Pastel Pour', area: 'Infocity, BBSR', vibe: ['aesthetic', 'soft', 'date', 'photo'] },
  { name: 'Monsoon Roast', area: 'Old Town, BBSR', vibe: ['chill', 'moody', 'cozy', 'solo'] },
  { name: 'Ekaiva Bakehouse', area: 'Chandrasekharpur, BBSR', vibe: ['aesthetic', 'quiet', 'bakery', 'date'] },
  { name: 'Blueberries Cafe', area: 'Patia, BBSR', vibe: ['aesthetic', 'lively', 'group', 'photo'] },
  { name: 'Kruti Coffee', area: 'KIIT Road, Patia, BBSR', vibe: ['quiet', 'cozy', 'coffee', 'solo'] },
  { name: 'Cafe Indistinct Chatter', area: 'Saheed Nagar, BBSR', vibe: ['cozy', 'lively', 'group', 'warm'] },
  { name: 'Amsterdam Cafe', area: 'Patharagadia, Patia, BBSR', vibe: ['cozy', 'lively', 'date', 'games'] },
  { name: 'Bagan Cafe', area: 'Jagamara, Khandagiri, BBSR', vibe: ['lively', 'aesthetic', 'rooftop', 'group'] },
  { name: 'The Cafe Heaven', area: 'Acharya Vihar, BBSR', vibe: ['aesthetic', 'cozy', 'date', 'polished'] },
  { name: 'Bigcup Cafe', area: 'Kalinga Nagar, BBSR', vibe: ['lively', 'cozy', 'group', 'celebration'] },
  { name: 'Cafe 16', area: 'Satya Nagar, BBSR', vibe: ['lively', 'cozy', 'group', 'pet-friendly'] },
  { name: 'Bocca Cafe', area: 'Master Canteen, BBSR', vibe: ['lively', 'cozy', 'brunch', 'group'] },
  { name: 'Gelhi\'s Cafe', area: 'Patia, BBSR', vibe: ['aesthetic', 'cozy', 'bakery', 'celebration'] },
  { name: 'Doppio Cafe and Bistro', area: 'Infocity Avenue, Patia, BBSR', vibe: ['quiet', 'aesthetic', 'coffee', 'date'] },
  { name: 'Brick and Bean', area: 'KIIT Square, Patia, BBSR', vibe: ['lively', 'cozy', 'group', 'snacks'] },
  { name: 'Oberoi Bakers', area: 'Nayapalli, BBSR', vibe: ['cozy', 'lively', 'bakery', 'evening'] },
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  }
}

function readUsers() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function text(res, statusCode, payload, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(payload);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, expectedHash] = stored.split(':');
  const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(actualHash, 'hex'));
}

function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    user: { name: user.name, email: user.email },
    createdAt: Date.now()
  });
  return token;
}

function getSession(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  return { token, session: sessions.get(token) || null };
}

function getCafePool(mood) {
  const mapped = mood === 'Chill'
    ? ['cozy', 'chill', 'solo', 'warm']
    : mood === 'Aesthetic'
      ? ['aesthetic', 'date', 'photo', 'polished', 'quiet']
      : ['lively', 'explore', 'group', 'rooftop'];

  const pool = cafesData.filter(cafe => cafe.vibe.some(tag => mapped.includes(tag)));
  return pool.length ? pool : cafesData;
}

function buildPlanOptions({ who, mood, duration, selectedCityStop, user }) {
  const pool = getCafePool(mood);
  const userSeed = (user.email || user.name || 'guest')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const planSeed = (who.length * 11) + (mood.length * 17) + (duration.length * 23) + userSeed;

  return [0, 1, 2].map(offset => {
    const cafe = pool[(planSeed + offset) % pool.length];
    const secondCafe = pool[(planSeed + offset + 2) % pool.length];
    const place = selectedCityStop || nearbyPlaces[(planSeed + offset) % nearbyPlaces.length];
    const getaway = getawayIdeas[(planSeed + offset) % getawayIdeas.length];
    const isFullDay = duration === 'Full day';
    const isHalfDay = duration === 'Half day';

    const steps = [
      {
        time: isFullDay ? '10:00 AM' : '12:00 PM',
        emoji: 'Coffee',
        place: `${cafe.name}, ${cafe.area}`,
        desc: `Start at ${cafe.name} with a ${mood.toLowerCase()} vibe that fits a ${who.toLowerCase()} outing.`
      },
      {
        time: isFullDay ? '1:00 PM' : '2:00 PM',
        emoji: 'Explore',
        place,
        desc: `Add ${place} so the day feels like a proper city plan instead of a single stop.`
      },
      {
        time: isFullDay ? '4:30 PM' : '4:00 PM',
        emoji: 'Meal',
        place: `${secondCafe.name}, ${secondCafe.area}`,
        desc: `Shift to ${secondCafe.name} for a second scene, a snack, and more time to hang out.`
      }
    ];

    if (isHalfDay || isFullDay) {
      steps.push({
        time: isFullDay ? '6:30 PM' : '5:45 PM',
        emoji: 'Drive',
        place: getaway,
        desc: isFullDay
          ? 'Stretch the plan with a scenic destination-style leg if the energy is still high.'
          : 'Use the last stretch for a short scenic finish before wrapping up.'
      });
    }

    if (isFullDay) {
      steps.push({
        time: '8:30 PM',
        emoji: 'Finish',
        place: 'Dinner and dessert stop',
        desc: 'Close the day with something easy, filling, and still a little special.'
      });
    }

    return {
      title: `${offset === 0 ? 'Easy' : offset === 1 ? 'Fresh' : 'Different'} ${mood.toLowerCase()} plan`,
      preview: `${cafe.name}, ${place}, and ${secondCafe.name}`,
      steps
    };
  });
}

function buildChatReply(messages) {
  const lastMessage = Array.isArray(messages) && messages.length
    ? String(messages[messages.length - 1].content || '').toLowerCase()
    : '';

  if (!lastMessage) {
    return 'Hey! 👋 Ask me about cafes, day plans, date ideas, or places to explore around Bhubaneswar. I\'m here to help.';
  }

  // Greetings
  if (/^(hi|hello|hey|hii|helo|howdy|namaste)[\s!.?]*$/.test(lastMessage.trim())) {
    return 'Hey! Welcome to BrewdOdisha 🍵\nI can help you:\n☕ Find the perfect cafe by vibe\n📅 Build a day itinerary\n💑 Suggest date spots\n🗺️ Explore weekend getaways\nWhat are you in the mood for?';
  }

  // Help
  if (lastMessage.includes('help') || lastMessage.includes('what can you') || lastMessage.includes('how does')) {
    return 'I can help you with:\n☕ Cafe recommendations (cozy, aesthetic, lively)\n📅 Day itinerary ideas\n💑 Date spot suggestions\n🗺️ Weekend trips from Bhubaneswar\n👗 Outfit palette tips\nJust ask!';
  }

  // Plan / itinerary
  if (lastMessage.includes('plan') || lastMessage.includes('itinerary') || lastMessage.includes('schedule') || lastMessage.includes('day out')) {
    return 'Use the ✨ Plan My Day section! Pick who you\'re going with, your mood, and duration — then log in to unlock 3 personalised day plans. You can also add city stops like Ekamra Haat or Khandagiri Caves to weave into the plan.';
  }

  // Login / account
  if (lastMessage.includes('login') || lastMessage.includes('log in') || lastMessage.includes('sign up') || lastMessage.includes('account') || lastMessage.includes('register')) {
    return 'Creating a free account unlocks personalised day plans from the itinerary builder. Just click "Generate 3 Plans" in the Plan My Day section and you\'ll be prompted to log in or sign up — it\'s quick and free!';
  }

  // ── Individual cafe responses ──────────────────────────────────────────

  if (lastMessage.includes('romeo lane') || lastMessage.includes('romeo')) {
    return '☕ Romeo Lane (Patia)\nWarm, cozy, earthy. Perfect for slow mornings and catch-ups.\n📍 Patia, BBSR | ★ 4.6 | ₹150–300/person\nOutfit: rust kurtas, beige co-ords, brown leather';
  }

  if (lastMessage.includes('asian delicacy') || lastMessage.includes('assian delicacy')) {
    return '🌿 Asian Delicacy (Jaydev Vihar)\nPolished, aesthetic, botanical greens. Ideal for first dates or brunch.\n📍 Jaydev Vihar | ★ 4.8 | ₹200–400/person\nOutfit: sage linen, olive jackets, soft white sneakers';
  }

  if (lastMessage.includes('birch')) {
    return '✨ Birch (Saheed Nagar)\nLively, bold, and photo-friendly. Great for groups and evening hangouts.\n📍 Saheed Nagar | ★ 4.4 | ₹250–500/person\nOutfit: all-black, neon accent, Y2K edge';
  }

  if (lastMessage.includes('leaf and latte') || lastMessage.includes('leaf & latte')) {
    return '🌿 Leaf and Latte (Nayapalli)\nBotanical corners, great lattes, and a calm daytime vibe.\n📍 Nayapalli, BBSR | ★ 4.7 | ₹190–360/person\nOutfit: earthy greens, linen sets, minimalist accessories';
  }

  if (lastMessage.includes('pastel pour')) {
    return '🌸 Pastel Pour (Infocity)\nSoft pastels, styled interiors, and a photo-friendly mood.\n📍 Infocity, BBSR\nOutfit: pastel shirts, white linen, pearl accessories';
  }

  if (lastMessage.includes('monsoon roast')) {
    return '🌧️ Monsoon Roast (Old Town)\nMoody, warm, and perfect for rainy days with a book.\n📍 Old Town, BBSR\nOutfit: dark earth tones, oversized fits, cozy layers';
  }

  if (lastMessage.includes('ekaiva') || lastMessage.includes('bakehouse')) {
    return '🎨 Ekaiva Bakehouse (Chandrasekharpur)\nA studio-style bakery cafe — polished and quietly aesthetic.\n📍 Chandrasekharpur, BBSR | ★ 4.6\nGreat for a dessert-first cafe visit or a softer date plan.';
  }

  if (lastMessage.includes('blueberries')) {
    return '🫐 Blueberries Cafe (Patia)\nColourful interiors, popular on local cafe lists, and great for casual photo stops.\n📍 Patia, BBSR\nGood pick for a Patia hangout or a quick friend catch-up.';
  }

  if (lastMessage.includes('kruti')) {
    return '☕ Kruti Coffee (KIIT Road)\nA speciality coffee stop — ideal when the drink matters as much as the space.\n📍 KIIT Road, Patia | ★ Speciality pick | ₹600 for two\nGo for the brews, not just the ambience.';
  }

  if (lastMessage.includes('indistinct chatter') || lastMessage.includes('chatter')) {
    return '💬 Cafe Indistinct Chatter (Saheed Nagar)\nCozy glass-roof vibe, easy friend-group appeal, and great pizzas.\n📍 Saheed Nagar, BBSR\nOpen late — good pick for a longer evening hang.';
  }

  if (lastMessage.includes('amsterdam cafe') || lastMessage.includes('amsterdam')) {
    return '🎲 Amsterdam Cafe (Patia)\nCasual game-night feel, solid comfort food, and easy couple energy.\n📍 Patharagadia, Patia | ★ 4.8 | ₹700 for two\nGreat when you want to stay longer without overthinking it.';
  }

  if (lastMessage.includes('bagan cafe') || lastMessage.includes('bagan')) {
    return '🌿 Bagan Cafe (Khandagiri area)\nA rooftop-garden cafe with an outdoorsy vibe — great for groups on a weekend.\n📍 Jagamara, Khandagiri | ★ 4.1 | ₹600 for two\nFri–Sun only. Go for the garden atmosphere and mocktails.';
  }

  if (lastMessage.includes('cafe heaven') || lastMessage.includes('heaven cafe')) {
    return '✨ The Cafe Heaven (Acharya Vihar)\nPolished continental cafe with a styled interior and easy date energy.\n📍 Acharya Vihar, BBSR | ★ 4.5 | ₹700 for two\nGood for a first date or a smarter evening out.';
  }

  if (lastMessage.includes('bigcup')) {
    return '🍫 Bigcup Cafe (Kalinga Nagar)\nBrownies, sizzlers, and a celebration-friendly atmosphere.\n📍 Kalinga Nagar, BBSR | ★ 4.4 | ₹700 for two\nGood for group plans and casual birthdays.';
  }

  if (lastMessage.includes('cafe 16')) {
    return '🐾 Cafe 16 (Satya Nagar)\nA long-running city favourite — pet-friendly, lively, and good for group catchups.\n📍 Satya Nagar, BBSR | ★ 4.2 | ₹600 for two\nOne of the few pet-friendly cafe options in BBSR.';
  }

  if (lastMessage.includes('bocca')) {
    return '🍳 Bocca Cafe (Master Canteen)\nA central BBSR pick — great for brunch, solid pasta, and casual meals.\n📍 Master Canteen, Kharvela Nagar | ★ 4.3\nUseful when you\'re near the city centre and want a quick, reliable stop.';
  }

  if (lastMessage.includes('gelhi')) {
    return '🎂 Gelhi\'s Cafe (Patia)\nBakery-meets-boutique vibes, dessert platters, and a sweeter aesthetic.\n📍 Patia, BBSR | ₹1000 for two\nPerfect for celebrations, birthdays, or a dessert-first plan.';
  }

  if (lastMessage.includes('doppio')) {
    return '☕ Doppio Cafe and Bistro (Infocity)\nA quieter, more polished Patia pick with a bistro feel.\n📍 Infocity Avenue, Patia | ★ 4.4\nGreat for soft work sessions or a coffee date without crowds.';
  }

  if (lastMessage.includes('brick and bean') || lastMessage.includes('brick & bean')) {
    return '🧱 Brick and Bean (KIIT Square)\nSocial and easygoing — good when you want a friendlier, less formal scene.\n📍 KIIT Square, Patia | ★ 4.3 | ₹160–340/person\nGreat for groups where everyone wants different things.';
  }

  if (lastMessage.includes('oberoi')) {
    return '🥐 Oberoi Bakers (Nayapalli)\nFamous cheesecakes, solid bakery options, and a comfortable evening vibe.\n📍 Nayapalli, BBSR | ★ 4.1 | ₹500 for two\nGood evening-bakery stop after a walk or a light hangout.';
  }

  // ── Vibe / mood categories ─────────────────────────────────────────────

  if (lastMessage.includes('cozy') || lastMessage.includes('chill cafe') || lastMessage.includes('quiet cafe') || lastMessage.includes('warm cafe')) {
    return 'Top cozy cafe picks:\n☕ Romeo Lane, Patia — earthy, slow coffee\n🌿 Leaf & Latte, Nayapalli — botanical corners\n🌧️ Monsoon Roast, Old Town — moody and warm\n☕ Kruti Coffee, KIIT Rd — speciality brews\n\nAll perfect for solo resets or soft catch-ups.';
  }

  if (lastMessage.includes('aesthetic') || lastMessage.includes('photo') || lastMessage.includes('instagram') || lastMessage.includes('pretty cafe')) {
    return 'Aesthetic cafe picks:\n🌿 Asian Delicacy — botanical, refined\n✨ Birch — dark, editorial, electric\n🌸 Pastel Pour, Infocity — soft and sweet\n🎨 Ekaiva Bakehouse — studio-like polish\n🫐 Blueberries Cafe — colourful and photo-ready\n\nAll great for Instagram-worthy shots!';
  }

  if (lastMessage.includes('lively') || lastMessage.includes('group') || lastMessage.includes('friends')) {
    return 'For a lively group vibe:\n✨ Birch, Saheed Nagar — louder energy, great evenings\n🎲 Amsterdam Cafe, Patia — games + comfort food\n🌿 Bagan Cafe, Khandagiri — rooftop garden\n🍫 Bigcup, Kalinga Nagar — brownies + sizzlers\n\nAdd Ekamra Haat or Nandankanan for a full day plan.';
  }

  if (lastMessage.includes('bakery') || lastMessage.includes('cake') || lastMessage.includes('dessert') || lastMessage.includes('pastry') || lastMessage.includes('bake')) {
    return '🥐 Bakery cafe picks in BBSR:\n🎂 Gelhi\'s Cafe, Patia — dessert platters, celebration vibes\n🎨 Ekaiva Bakehouse, Chandrasekharpur — studio cafe with bakes\n🥐 Oberoi Bakers, Nayapalli — famous cheesecakes\n✂️ Kruti Coffee — pairs brews with light bites\n\nAll perfect for sweet-first plans!';
  }

  if (lastMessage.includes('rooftop') || lastMessage.includes('outdoor') || lastMessage.includes('garden cafe') || lastMessage.includes('open air')) {
    return '🌿 Outdoor and rooftop picks in BBSR:\n🌿 Bagan Cafe, Khandagiri — rooftop garden, Fri–Sun only\n🧵 Ekamra Haat — open-air craft market in the evenings\n☸️ Dhauli Shanti Stupa — great sunset views\n🌊 Deras Dam — golden hour drive (~25 km)\n\nBagan Cafe is the only dedicated rooftop cafe pick right now.';
  }

  if (lastMessage.includes('pet') || lastMessage.includes('dog')) {
    return '🐾 Pet-friendly picks in BBSR:\n🐾 Cafe 16, Satya Nagar — one of the few known pet-friendly cafes in the city\n\nAlso check Ekamra Kanan Botanical Gardens for a relaxed outdoor space with your pet.';
  }

  if (lastMessage.includes('speciality coffee') || lastMessage.includes('specialty coffee') || lastMessage.includes('filter coffee') || lastMessage.includes('cold brew')) {
    return '☕ Speciality coffee picks:\n☕ Kruti Coffee, KIIT Road — the go-to speciality brew stop\n☕ Romeo Lane, Patia — great Spanish latte and slow coffee\n☕ Doppio, Infocity — coconut latte and wellness teas\n\nFor pure coffee quality, Kruti Coffee is the best bet.';
  }

  if (lastMessage.includes('nayapalli')) {
    return '📍 Nayapalli cafes:\n🌿 Leaf and Latte — botanical, aesthetic, great lattes\n🥐 Oberoi Bakers — cheesecakes and evening bakery vibes\n\nNayapalli has a quieter, more relaxed cafe scene compared to Patia.';
  }

  if (lastMessage.includes('khandagiri') || lastMessage.includes('jagamara')) {
    return '📍 Khandagiri area picks:\n🌿 Bagan Cafe, Jagamara — rooftop garden cafe, Fri–Sun only\n🪨 Udayagiri & Khandagiri Caves — heritage, history, photos\n\nGood plan: Caves in the morning + Bagan Cafe for lunch on a weekend.';
  }

  if (lastMessage.includes('patia')) {
    return '📍 Patia cafe picks:\n☕ Romeo Lane — warm, cozy, best all-rounder\n🫐 Blueberries Cafe — colourful and casual\n☕ Kruti Coffee — speciality brews\n🎂 Gelhi\'s Cafe — desserts and celebration vibes\n🎲 Amsterdam Cafe — games + comfort food\n☕ Doppio Cafe — quieter bistro feel\n🧱 Brick and Bean — easygoing group cafe\n\nPatia has the densest cafe cluster in BBSR.';
  }

  if (lastMessage.includes('saheed nagar')) {
    return '📍 Saheed Nagar picks:\n✨ Birch — lively, dressy, photo-friendly\n💬 Cafe Indistinct Chatter — cozy glass-roof, great pizzas\n\nSaheed Nagar is the go-to for evening plans and group outings.';
  }

  if (lastMessage.includes('rainy') || lastMessage.includes('rain') || lastMessage.includes('monsoon')) {
    return '🌧️ Rainy day cafe picks:\n🌧️ Monsoon Roast, Old Town — built for exactly this mood\n☕ Romeo Lane, Patia — warm, cozy, no rush\n💬 Cafe Indistinct Chatter — glass roof, great for watching the rain\n☕ Kruti Coffee — slow brew, slow day\n\nMonsoon Roast is basically made for a rainy afternoon.';
  }

  // ── Date ideas ─────────────────────────────────────────────────────────

  if (lastMessage.includes('date') || lastMessage.includes('romantic') || lastMessage.includes('couple')) {
    return '💑 Date ideas in Bhubaneswar:\n1. Classic — Ekamra Haat craft walk + Romeo Lane\n2. Golden hour — Drive to Deras Dam for sunset\n3. Soft romantic — Dhauli Peace Pagoda afternoon\n4. Full-day — Puri + Konark heritage trip\n5. Aesthetic — Asian Delicacy or The Cafe Heaven\n6. Game night — Amsterdam Cafe, Patia\n\nBest cafes for dates: Asian Delicacy, Romeo Lane, The Cafe Heaven.';
  }

  if (lastMessage.includes('solo') || lastMessage.includes('alone') || lastMessage.includes('by myself')) {
    return 'Solo day in BBSR:\n☕ Start at Monsoon Roast or Kruti Coffee with a book\n🌿 Walk Ekamra Kanan Gardens or Bindu Sagar\n📸 End at Pastel Pour or Leaf & Latte\n\nThe Plan My Day builder has a Solo mode — log in and get 3 tailored options!';
  }

  // ── Getaways ───────────────────────────────────────────────────────────

  if (lastMessage.includes('puri') || lastMessage.includes('beach')) {
    return '🏖️ Puri Beach — 65 km from BBSR\nPerfect for a day trip. Leave early, do the beach and temples, return after dinner. Combine with Konark for a heritage + beach full day.';
  }

  if (lastMessage.includes('konark')) {
    return '🏛️ Konark Sun Temple — 65 km from BBSR\nIconic heritage architecture, great for photography. Pair with Chandrabhaga beach for a sunrise or sunset visit.';
  }

  if (lastMessage.includes('chilika')) {
    return '🐬 Chilika Lake & Satapada — ~100 km from BBSR\nIndia\'s largest coastal lagoon. Irrawaddy dolphins, boat rides, birdwatching. Best in winter (Nov–Feb). A perfect weekend trip.';
  }

  if (lastMessage.includes('daringbadi') || lastMessage.includes('hill station')) {
    return '⛰️ Daringbadi — "Kashmir of Odisha", ~250 km from BBSR\nPine forests, coffee plantations, misty mornings. Ideal for a 2-day road trip. Book stays in advance!';
  }

  if (lastMessage.includes('simlipal') || (lastMessage.includes('wildlife') && lastMessage.includes('trip'))) {
    return '🐅 Simlipal National Park — ~260 km from BBSR\nTiger reserve with waterfalls and tribal villages. Entry requires prior permit. Best between Nov–May.';
  }

  if (lastMessage.includes('raghurajpur') || lastMessage.includes('pattachitra') || lastMessage.includes('art village')) {
    return '🎨 Raghurajpur — ~55 km from BBSR\nFamous Pattachitra art village near Puri. Every home is an artist\'s studio. Perfect half-day cultural trip.';
  }

  if (lastMessage.includes('bhitarkanika') || lastMessage.includes('mangrove')) {
    return '🐊 Bhitarkanika — ~170 km from BBSR\nMangrove forest, saltwater crocodiles, boat safaris. Best Nov–Feb. Overnight stays available.';
  }

  if (lastMessage.includes('weekend') || lastMessage.includes('getaway') || lastMessage.includes('escape') || lastMessage.includes('travel')) {
    return '🗺️ Weekend trips from BBSR:\n🏖️ Puri — 65 km | beach + temples\n🏛️ Konark — 65 km | heritage + beach\n🐬 Chilika — 100 km | dolphins + boat\n🐊 Bhitarkanika — 170 km | mangrove safari\n⛰️ Daringbadi — 250 km | hill station\n🐅 Simlipal — 260 km | tiger reserve\n\nClick any card in the "Beyond the City" section to explore!';
  }

  // ── City spots ─────────────────────────────────────────────────────────

  if (lastMessage.includes('ekamra haat') || lastMessage.includes('craft market')) {
    return '🧵 Ekamra Haat (Unit III)\nHandmade Odisha crafts, food stalls, relaxed walking vibe. Perfect for a first date or casual afternoon. Open evenings.';
  }

  if (lastMessage.includes('nandankanan') || lastMessage.includes('zoo')) {
    return '🦁 Nandankanan Zoological Park\nWhite tigers, lions, and Kanjia Lake boating. Great for families or a group day out.';
  }

  if (lastMessage.includes('lingaraj') || lastMessage.includes('temple') || lastMessage.includes('heritage')) {
    return '🛕 Old Town temples — Lingaraj, Mukteswar, Rajarani\nBest visited in the morning for golden-hour photos. Combine with Bindu Sagar lake for a peaceful heritage walk.';
  }

  if (lastMessage.includes('nearby') || lastMessage.includes('within city') || lastMessage.includes('in bbsr') || lastMessage.includes('bhubaneswar hangout')) {
    return 'City hangout spots in BBSR:\n🎨 Kala Bhoomi — art & culture museum\n☸️ Dhauli Shanti Stupa — sunset views\n🧵 Ekamra Haat — crafts + food\n🌿 Ekamra Kanan Gardens — picnic spot\n🔭 Pathani Samanta Planetarium\n\nPick a stop in the Hangouts section and add it to your day plan!';
  }

  // ── General utility ────────────────────────────────────────────────────

  if (lastMessage.includes('food') || lastMessage.includes('eat') || lastMessage.includes('hungry') || lastMessage.includes('meal') || lastMessage.includes('restaurant')) {
    return 'Food stops in BBSR:\n🍳 Romeo Lane — great breakfast & brunch\n🌿 Asian Delicacy — polished multi-cuisine\n✨ Birch — snacks and desserts\n🍳 Bocca Cafe — central BBSR, solid pasta\n🍫 Bigcup — sizzlers and comfort food\n\nWant a full day plan with meal stops? Try the Plan My Day builder!';
  }

  if (lastMessage.includes('coffee') || lastMessage.includes('brew') || lastMessage.includes('latte') || lastMessage.includes('tea') || lastMessage.includes('cappuccino')) {
    return 'Coffee picks:\n☕ Kruti Coffee — speciality brews, KIIT Road\n☕ Romeo Lane — Spanish latte, cozy corners\n🌿 Leaf & Latte — botanical setting, great lattes\n🌧️ Monsoon Roast — moody atmosphere, perfect with rain\n☕ Doppio — coconut latte and wellness teas';
  }

  if (lastMessage.includes('outfit') || lastMessage.includes('dress') || lastMessage.includes('what to wear') || lastMessage.includes('palette') || lastMessage.includes('wear')) {
    return '👗 Outfit tips by cafe:\n🟤 Romeo Lane → Rust, beige, brown leather\n🌿 Asian Delicacy → Sage linen, olive, white sneakers\n🖤 Birch → All-black, neon accent, chrome\n🌸 Pastel Pour → Pastel shirts, pearl accessories\n🌿 Leaf & Latte → Earthy greens, linen sets\n\nSee all palettes in the Outfit Palettes section!';
  }

  if (lastMessage.includes('budget') || lastMessage.includes('cheap') || lastMessage.includes('affordable') || lastMessage.includes('price') || lastMessage.includes('cost')) {
    return '💰 Cafe budgets:\n☕ Romeo Lane — ₹150–300/person\n🌿 Asian Delicacy — ₹200–400/person\n✨ Birch — ₹250–500/person\n🧱 Brick and Bean — ₹160–340/person\n\nCity hangouts like parks and temples are mostly free. Puri/Konark by bus or carpool is very affordable.';
  }

  if (lastMessage.includes('best cafe') || lastMessage.includes('top cafe') || lastMessage.includes('popular') || lastMessage.includes('highest rated') || lastMessage.includes('most loved')) {
    return '🌟 Top-rated cafes:\n1. Asian Delicacy, Jaydev Vihar — ★ 4.8\n2. Romeo Lane, Patia — ★ 4.6\n3. Leaf and Latte, Nayapalli — ★ 4.7\n4. Birch, Saheed Nagar — ★ 4.4\n5. Amsterdam Cafe, Patia — ★ 4.8\n\nAll offer distinct vibes — which fits your mood today?';
  }

  if (lastMessage.includes('morning') || lastMessage.includes('breakfast') || lastMessage.includes('brunch')) {
    return '🌅 Morning cafe picks:\n☕ Romeo Lane (Patia) — slow coffee start, opens at 9 AM\n🌿 Asian Delicacy — great brunch spot\n🌿 Leaf & Latte — botanical morning vibes\n🥐 Bocca Cafe — opens at 8:30 AM\n\nUse Plan My Day for a full structured morning plan!';
  }

  if (lastMessage.includes('evening') || lastMessage.includes('night') || lastMessage.includes('sunset')) {
    return '🌆 Evening picks:\n✨ Birch — lively evening energy, open till 11 PM\n💬 Cafe Indistinct Chatter — late hours\n☸️ Dhauli Shanti Stupa — sunset views\n🌊 Deras Dam — golden hour drive (~25 km)\n🧵 Ekamra Haat — evening craft market\n\nDeras Dam is the most popular golden-hour spot near BBSR.';
  }

  if (lastMessage.includes('thank') || lastMessage.includes('thx') || lastMessage.includes('great') || lastMessage.includes('awesome')) {
    return 'Happy to help! 🍵 Enjoy your day in Bhubaneswar. Need a full plan? Use the Plan My Day builder — log in and get 3 personalised options instantly!';
  }

  // Default
  return 'I can help with cafe picks, day plans, date ideas, and weekend trips! 🗺️ Try asking:\n• "Best cozy cafe in BBSR"\n• "Bakery cafes in Bhubaneswar"\n• "Rooftop cafe near Khandagiri"\n• "Plan a date day for 2 people"\n• "What to wear to Birch cafe"';
}



function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      text(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.html'
      ? 'text/html; charset=utf-8'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
          ? 'image/png'
          : 'application/octet-stream';

    text(res, 200, content, contentType);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/brewdodisha.html')) {
    serveStaticFile(HTML_FILE, res);
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/explore-wip' || url.pathname === '/explore-wip/' || url.pathname === '/explore-wip.html')) {
    serveStaticFile(EXPLORE_FILE, res);
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/Images/')) {
    const imagePath = path.join(ROOT, url.pathname);
    serveStaticFile(imagePath, res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
    try {
      const body = await parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!name || !email || !password) {
        json(res, 400, { error: 'Please fill in all required fields.' });
        return;
      }

      const users = readUsers();
      if (users.some(user => user.email === email)) {
        json(res, 409, { error: 'This email already has an account. Please log in instead.' });
        return;
      }

      const user = { name, email, passwordHash: hashPassword(password) };
      users.push(user);
      writeUsers(users);

      const token = createSession(user);
      json(res, 201, { user: { name, email }, token });
    } catch (error) {
      json(res, 400, { error: error.message || 'Could not create account.' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!email || !password) {
        json(res, 400, { error: 'Please fill in all required fields.' });
        return;
      }

      const user = readUsers().find(entry => entry.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        json(res, 401, { error: 'Incorrect email or password.' });
        return;
      }

      const token = createSession(user);
      json(res, 200, { user: { name: user.name, email: user.email }, token });
    } catch (error) {
      json(res, 400, { error: error.message || 'Could not log in.' });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/session') {
    const sessionState = getSession(req);
    if (!sessionState || !sessionState.session) {
      json(res, 401, { error: 'No active session.' });
      return;
    }
    json(res, 200, { user: sessionState.session.user });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    const sessionState = getSession(req);
    if (sessionState?.token) {
      sessions.delete(sessionState.token);
    }
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/plans') {
    const sessionState = getSession(req);
    if (!sessionState || !sessionState.session) {
      json(res, 401, { error: 'Please log in to unlock your personalized day plans.' });
      return;
    }

    try {
      const body = await parseBody(req);
      const who = String(body.who || '').trim();
      const mood = String(body.mood || '').trim();
      const duration = String(body.duration || '').trim();
      const selectedCityStop = String(body.selectedCityStop || '').trim();

      if (!who || !mood || !duration) {
        json(res, 400, { error: 'Missing itinerary preferences.' });
        return;
      }

      const options = buildPlanOptions({
        who,
        mood,
        duration,
        selectedCityStop,
        user: sessionState.session.user
      });

      json(res, 200, {
        options,
        sourceLabel: 'Personalized day plans from the BrewdOdisha backend'
      });
    } catch (error) {
      json(res, 400, { error: error.message || 'Could not build plans.' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    try {
      const body = await parseBody(req);
      json(res, 200, { reply: buildChatReply(body.messages) });
    } catch (error) {
      json(res, 400, { error: error.message || 'Could not process chat.' });
    }
    return;
  }

  text(res, 404, 'Not found');
});

// Replace with this:
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`BrewdOdisha server running at http://localhost:${PORT}`);
  });
}
module.exports = server;
