const crypto = require('crypto');

const AUTH_SECRET = process.env.AUTH_SECRET || 'brewdodisha-demo-secret';

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
  { name: 'Romeo Lane', area: 'Patia, BBSR', vibe: ['cozy', 'chill', 'warm'] },
  { name: 'Asian Delicacy', area: 'Jaydev Vihar, BBSR', vibe: ['aesthetic', 'date', 'polished'] },
  { name: 'Birch', area: 'Saheed Nagar, BBSR', vibe: ['lively', 'explore', 'aesthetic'] },
  { name: 'Leaf and Latte', area: 'Jaydev Vihar, BBSR', vibe: ['cozy', 'green', 'chill'] },
  { name: 'Pastel Pour', area: 'Infocity, BBSR', vibe: ['aesthetic', 'soft', 'date'] },
  { name: 'Monsoon Roast', area: 'Old Town, BBSR', vibe: ['chill', 'moody', 'cozy'] }
];

function json(res, status, payload) {
  res.status(status).json(payload);
}

function sendMethodNotAllowed(res, allowed = ['POST']) {
  res.setHeader('Allow', allowed);
  return json(res, 405, { error: 'Method not allowed.' });
}

function normalizeNameFromEmail(email) {
  const base = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!base) return 'Guest User';
  return base.replace(/\b\w/g, char => char.toUpperCase());
}

function signToken(user) {
  const payload = Buffer.from(JSON.stringify({
    user,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (signature !== expected) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.user || null;
  } catch {
    return null;
  }
}

function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return verifyToken(token);
}

function getCafePool(mood) {
  const mapped = mood === 'Chill'
    ? ['cozy', 'chill']
    : mood === 'Aesthetic'
      ? ['aesthetic', 'date']
      : ['lively', 'explore'];

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
    return 'Ask me about cafes, itinerary ideas, or places to explore around Bhubaneswar.';
  }

  if (lastMessage.includes('plan') || lastMessage.includes('itinerary')) {
    return 'Use the itinerary builder in Plan My Day: pick who you are with, your mood, and your duration, then log in to unlock the 3 plan options.';
  }

  if (lastMessage.includes('date')) {
    return 'For a date vibe, start with an aesthetic cafe like Asian Delicacy or Birch, add a photo walk, then finish with dessert or a drive.';
  }

  if (lastMessage.includes('solo')) {
    return 'For a solo plan, cozy cafes and a low-pressure stop like Forest Park or Ekamra Haat usually work really well.';
  }

  if (lastMessage.includes('cafe')) {
    return 'Popular picks on this page include Romeo Lane for a warm cozy stop, Asian Delicacy for polished aesthetic plans, and Birch for livelier outings.';
  }

  return 'I can help with cafe suggestions, mood-based city plans, and quick outing ideas around Bhubaneswar.';
}

module.exports = {
  buildChatReply,
  buildPlanOptions,
  getUserFromRequest,
  json,
  normalizeNameFromEmail,
  sendMethodNotAllowed,
  signToken
};
