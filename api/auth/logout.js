const { json, sendMethodNotAllowed } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res);
  }

  return json(res, 200, { ok: true });
};
