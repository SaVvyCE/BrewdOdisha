const { json, normalizeNameFromEmail, sendMethodNotAllowed, signToken } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res);
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return json(res, 400, { error: 'Please fill in all required fields.' });
  }

  const user = {
    name: normalizeNameFromEmail(email),
    email
  };
  const token = signToken(user);
  return json(res, 200, { user, token });
};
