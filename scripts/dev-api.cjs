require('dotenv').config({ quiet: true });
const http = require('node:http');
const handler = require('../api/[...path].js');

http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => res.end(JSON.stringify(data));
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 262144) return res.status(413).json({ error: 'Payload terlalu besar.' });
    }
    req.body = body;
    await handler(req, res);
  } catch {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
}).listen(3000, '127.0.0.1', () => console.log('API lokal: http://127.0.0.1:3000'));
