const { json, sendMethodNotAllowed, signToken } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res);
  }

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!name || !email || !password) {
    return json(res, 400, { error: 'Please fill in all required fields.' });
  }

  const user = { name, email };
  const token = signToken(user);
  return json(res, 201, { user, token });
};
