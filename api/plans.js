const { buildPlanOptions, getUserFromRequest, json, sendMethodNotAllowed } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res);
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return json(res, 401, { error: 'Please log in to unlock your personalized day plans.' });
  }

  const who = String(req.body?.who || '').trim();
  const mood = String(req.body?.mood || '').trim();
  const duration = String(req.body?.duration || '').trim();
  const selectedCityStop = String(req.body?.selectedCityStop || '').trim();

  if (!who || !mood || !duration) {
    return json(res, 400, { error: 'Missing itinerary preferences.' });
  }

  const options = buildPlanOptions({
    who,
    mood,
    duration,
    selectedCityStop,
    user
  });

  return json(res, 200, {
    options,
    sourceLabel: 'Personalized day plans from the BrewdOdisha backend'
  });
};
