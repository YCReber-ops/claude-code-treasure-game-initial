// Auth + score API backed by SQLite (built-in node:sqlite, Node 22.5+). Run with `npm run server`.
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.API_PORT) || 3001;
const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'game.db'));
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrates an older database whose users table used `username`: renames the column to `email`, keeping existing rows and scores.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (userColumns.includes('username') && !userColumns.includes('email')) {
  db.exec('ALTER TABLE users RENAME COLUMN username TO email');
}

// Adds the display-name column to databases created before it existed (older accounts keep name NULL).
if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'name')) {
  db.exec('ALTER TABLE users ADD COLUMN name TEXT');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hashes a password with scrypt. Input: password (string), salt (hex string). Output: hex hash string.
const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString('hex');

// Sends a JSON response. Input: res (ServerResponse), status (number), body (object). Output: none.
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

// Reads and parses the JSON request body. Input: req (IncomingMessage). Output: Promise of parsed object ({} if empty).
const readJson = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e5) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

// Resolves the signed-in user from the Bearer token. Input: req (IncomingMessage). Output: { id, email, name } or undefined.
const getUser = (req) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return undefined;
  return db
    .prepare('SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .get(token);
};

// Creates a session for a user. Input: userId (number). Output: token string.
const createSession = (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
};

// Returns the user's stats. Input: userId (number). Output: { gamesPlayed, bestScore, totalScore }.
const getStats = (userId) => {
  const row = db
    .prepare('SELECT COUNT(*) AS gamesPlayed, MAX(score) AS bestScore, COALESCE(SUM(score), 0) AS totalScore FROM scores WHERE user_id = ?')
    .get(userId);
  return { gamesPlayed: row.gamesPlayed, bestScore: row.bestScore, totalScore: row.totalScore };
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const route = `${req.method} ${url.pathname}`;

    if (route === 'POST /api/signup') {
      const body = await readJson(req);
      const { password } = body;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length < 1 || name.length > 20) {
        return send(res, 400, { error: 'Name must be 1-20 characters.' });
      }
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (email.length > 254 || !EMAIL_RE.test(email)) {
        return send(res, 400, { error: 'Please enter a valid E-mail address.' });
      }
      if (typeof password !== 'string' || password.length < 6) {
        return send(res, 400, { error: 'Password must be at least 6 characters.' });
      }
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
        return send(res, 409, { error: 'This E-mail is already registered.' });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const { lastInsertRowid } = db
        .prepare('INSERT INTO users (email, name, password_hash, salt) VALUES (?, ?, ?, ?)')
        .run(email, name, hashPassword(password, salt), salt);
      const id = Number(lastInsertRowid);
      return send(res, 201, { token: createSession(id), user: { id, email, name }, stats: getStats(id) });
    }

    if (route === 'POST /api/login') {
      const { email, password } = await readJson(req);
      const row =
        typeof email === 'string' && typeof password === 'string'
          ? db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim())
          : undefined;
      if (!row) return send(res, 401, { error: 'Invalid E-mail or password.' });
      const expected = Buffer.from(row.password_hash, 'hex');
      const actual = Buffer.from(hashPassword(password, row.salt), 'hex');
      if (!crypto.timingSafeEqual(expected, actual)) {
        return send(res, 401, { error: 'Invalid E-mail or password.' });
      }
      return send(res, 200, {
        token: createSession(row.id),
        user: { id: row.id, email: row.email, name: row.name },
        stats: getStats(row.id),
      });
    }

    if (route === 'POST /api/logout') {
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return send(res, 200, { ok: true });
    }

    // Public top-10 board: best score per player, ties broken by total score then earliest play. Emails are never exposed.
    if (route === 'GET /api/leaderboard') {
      const rows = db
        .prepare(
          `SELECT u.id, u.name, MAX(s.score) AS bestScore, SUM(s.score) AS totalScore, COUNT(s.id) AS gamesPlayed
           FROM scores s JOIN users u ON u.id = s.user_id
           GROUP BY u.id
           ORDER BY bestScore DESC, totalScore DESC, MIN(s.played_at) ASC
           LIMIT 10`,
        )
        .all();
      return send(res, 200, {
        entries: rows.map((r) => ({
          userId: r.id,
          name: r.name || `Player ${r.id}`,
          bestScore: r.bestScore,
          totalScore: r.totalScore,
          gamesPlayed: r.gamesPlayed,
        })),
      });
    }

    if (route === 'GET /api/me') {
      const user = getUser(req);
      if (!user) return send(res, 401, { error: 'Not signed in.' });
      return send(res, 200, { user, stats: getStats(user.id) });
    }

    if (route === 'POST /api/scores') {
      const user = getUser(req);
      if (!user) return send(res, 401, { error: 'Not signed in.' });
      const { score } = await readJson(req);
      if (!Number.isInteger(score) || score < -150 || score > 100) {
        return send(res, 400, { error: 'Invalid score.' });
      }
      db.prepare('INSERT INTO scores (user_id, score) VALUES (?, ?)').run(user.id, score);
      return send(res, 201, { stats: getStats(user.id) });
    }

    send(res, 404, { error: 'Not found.' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Server error.' });
  }
});

server.listen(PORT, () => console.log(`API server listening on http://localhost:${PORT}`));
