// store.js — data access layer for Multiplication Dojo.
//
// If DATABASE_URL is set (point this at a free Neon Postgres database — see
// README.md), all student data is stored there permanently, independent of
// Render restarts, redeploys, or spin-downs. This is the recommended setup,
// especially for usage spread out over weeks (e.g. summer break) where a
// Render free web service will spin down between visits.
//
// If DATABASE_URL is NOT set, falls back to a local JSON file. That's fine
// for quick local testing, but on Render's free tier it will lose data on
// every spin-down (see README.md).

const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const usingPostgres = !!DATABASE_URL;

let pool = null;
if (usingPostgres) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required by Neon and most managed Postgres hosts
  });
}

// --- local JSON fallback ---
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
if (!usingPostgres) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ students: {} }, null, 2));
}
let writeChain = Promise.resolve();
function readJsonDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeJsonDb(mutateFn) {
  writeChain = writeChain.then(() => {
    const db = readJsonDb();
    const result = mutateFn(db);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return result;
  });
  return writeChain;
}

async function ensureSchema() {
  if (!usingPostgres) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      class_code TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      progress JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS students_class_code_idx ON students (class_code);`);
}

async function getStudent(id) {
  if (usingPostgres) {
    const { rows } = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    if (!rows[0]) return null;
    return { id: rows[0].id, displayName: rows[0].display_name, classCode: rows[0].class_code, progress: rows[0].progress || {} };
  }
  const db = readJsonDb();
  return db.students[id] || null;
}

async function createStudent(id, displayName, classCode) {
  if (usingPostgres) {
    await pool.query(
      'INSERT INTO students (id, display_name, class_code, progress) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [id, displayName, classCode, JSON.stringify({})]
    );
    return getStudent(id);
  }
  await writeJsonDb((db) => {
    if (!db.students[id]) {
      db.students[id] = { id, displayName, classCode, createdAt: new Date().toISOString(), progress: {} };
    }
  });
  return getStudent(id);
}

async function saveProgress(id, progress) {
  if (usingPostgres) {
    await pool.query('UPDATE students SET progress = $1 WHERE id = $2', [JSON.stringify(progress), id]);
    return;
  }
  await writeJsonDb((db) => {
    if (db.students[id]) db.students[id].progress = progress;
  });
}

async function listStudentsByClassCode(classCode) {
  if (usingPostgres) {
    const { rows } = await pool.query('SELECT * FROM students WHERE class_code = $1', [classCode]);
    return rows.map((r) => ({ id: r.id, displayName: r.display_name, classCode: r.class_code, progress: r.progress || {} }));
  }
  const db = readJsonDb();
  return Object.values(db.students).filter((s) => s.classCode === classCode);
}

module.exports = { usingPostgres, ensureSchema, getStudent, createStudent, saveProgress, listStudentsByClassCode };
