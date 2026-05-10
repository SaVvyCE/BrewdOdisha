const { getUserFromRequest, json, sendMethodNotAllowed } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, ['GET']);
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return json(res, 401, { error: 'No active session.' });
  }

  return json(res, 200, { user });
};
