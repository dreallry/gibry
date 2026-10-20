const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { ServiceError, requireMember } = require('./errors.cjs');

function adminApp() {
  const defaultApp = getApps().find(item => item.name === '[DEFAULT]');
  if (defaultApp) return defaultApp;
  let app = getApps().find(item => item.name === 'digipus-api');
  if (!app) {
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!databaseURL) throw new ServiceError(503, 'Konfigurasi database server belum lengkap.');
    const emulator = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    if (emulator && (!/^127\.0\.0\.1:\d+$/.test(emulator) || !databaseURL.includes('demo-digipus'))) throw new ServiceError(503, 'Emulator harus memakai project demo lokal.');
    if (!process.env.FIREBASE_SERVICE_ACCOUNT && !emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new ServiceError(503, 'Kredensial Firebase server belum diisi.');
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) : applicationDefault();
    app = initializeApp({ credential, databaseURL, ...(emulator ? { projectId: 'demo-digipus' } : {}) }, 'digipus-api');
  }
  return app;
}

async function authenticate(req, app, { verified, member }) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new ServiceError(401, 'Silakan login terlebih dahulu.');
  try {
    const token = await getAuth(app).verifyIdToken(header.slice(7), true);
    if (verified && !token.email_verified) throw new ServiceError(403, 'Email belum diverifikasi.');
    if (member) await requireMember(getDatabase(app), token.uid);
    return token;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(401, 'Sesi login tidak valid.');
  }
}

function endpoint(action, { webhook = false, recentAuth = false, verified = true, member = true, maxBytes = 16384 } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const origins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) if (host) origins.push(`https://${host}`);
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) return res.status(403).json({ error: 'Asal permintaan tidak diizinkan.' });
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return res.status(415).json({ error: 'Gunakan payload JSON.' });
    try {
      if (Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})) > maxBytes) throw new ServiceError(413, 'Payload terlalu besar.');
      if (!webhook && !(req.headers.authorization || '').startsWith('Bearer ')) throw new ServiceError(401, 'Silakan login terlebih dahulu.');
      const app = adminApp();
      const token = webhook ? null : await authenticate(req, app, { verified, member });
      if (recentAuth) {
        if (!Number.isFinite(token.auth_time) || Date.now() / 1000 - token.auth_time > 300) throw new ServiceError(401, 'Login ulang sebelum tindakan ini.');
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ServiceError(400, 'Payload tidak valid.');
      return res.status(200).json(await action(getDatabase(app), token?.uid || null, body));
    } catch (error) {
      const status = error instanceof ServiceError ? error.status : error instanceof SyntaxError ? 400 : 500;
      if (status >= 500) console.error('[API]', error.name, error.code || status);
      return res.status(status).json({ error: status === 500 ? 'Terjadi kesalahan server.' : error instanceof SyntaxError ? 'JSON tidak valid.' : error.message });
    }
  };
}
module.exports = { endpoint, adminApp };
