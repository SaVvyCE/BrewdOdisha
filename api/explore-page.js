const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  const filePath = path.join(process.cwd(), 'explore-wip.html');

  try {
    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('Unable to load explore page.');
  }
};
