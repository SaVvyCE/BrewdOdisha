const { buildChatReply, json, sendMethodNotAllowed } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res);
  }

  return json(res, 200, {
    reply: buildChatReply(req.body?.messages)
  });
};
