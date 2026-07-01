// Multiplication Dojo — backend
// Simple Express server with name-based login (no passwords) and
// JSON-file-backed progress storage. Built for a single classroom's scale.

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const CLASS_CODE = (process.env.CLASS_CODE || 'DOJO101').trim().toUpperCase();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ students: {} }, null, 2));

// --- tiny write queue so concurrent requests don't clobber the JSON file ---
let writeChain = Promise.resolve();
function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDb(mutateFn) {
  writeChain = writeChain.then(() => {
    const db = readDb();
    const result = mutateFn(db);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return result;
  });
  return writeChain;
}

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '');
}

// --- API routes ---

// Log in (or sign up on first visit). No password — just a class code + name.
app.post('/api/login', async (req, res) => {
  const { classCode, name } = req.body || {};
  if (!classCode || !name || !name.trim()) {
    return res.status(400).json({ error: 'Class code and name are required.' });
  }
  if (classCode.trim().toUpperCase() !== CLASS_CODE) {
    return res.status(401).json({ error: 'That class code is not recognized. Check with your teacher.' });
  }

  const slug = slugify(name);
  if (!slug) return res.status(400).json({ error: 'Please enter your name.' });
  const studentId = `${CLASS_CODE}:${slug}`;

  const student = await writeDb((db) => {
    if (!db.students[studentId]) {
      db.students[studentId] = {
        id: studentId,
        displayName: name.trim(),
        classCode: CLASS_CODE,
        createdAt: new Date().toISOString(),
        progress: {},
      };
    }
    return db.students[studentId];
  });

  res.json({ studentId: student.id, name: student.displayName });
});

// Get a student's saved progress
app.get('/api/progress/:studentId', (req, res) => {
  const db = readDb();
  const student = db.students[req.params.studentId];
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  res.json({ progress: student.progress });
});

// Save a completed practice round
app.post('/api/progress/:studentId', async (req, res) => {
  const { table, session } = req.body || {};
  if (!table || !session) return res.status(400).json({ error: 'Missing table or session data.' });

  const db = readDb();
  if (!db.students[req.params.studentId]) return res.status(404).json({ error: 'Student not found.' });

  const updated = await writeDb((db) => {
    const student = db.students[req.params.studentId];
    if (!student.progress[table]) student.progress[table] = { sessions: [] };
    student.progress[table].sessions.push(session);
    return student.progress;
  });

  res.json({ progress: updated });
});

// Lightweight teacher view — see mastery counts for everyone in the class.
// Not secured beyond requiring the class code; good enough for a classroom tool, not sensitive data.
app.get('/api/roster', (req, res) => {
  const code = (req.query.classCode || '').trim().toUpperCase();
  if (code !== CLASS_CODE) return res.status(401).json({ error: 'Invalid class code.' });

  const db = readDb();
  const roster = Object.values(db.students)
    .filter((s) => s.classCode === CLASS_CODE)
    .map((s) => {
      const masteredCount = Object.values(s.progress || {}).filter((t) =>
        t.sessions.some((sess) => sess.accuracy >= 90 && sess.avgTime <= 5)
      ).length;
      const totalSessions = Object.values(s.progress || {}).reduce((sum, t) => sum + t.sessions.length, 0);
      return { name: s.displayName, masteredCount, totalSessions };
    })
    .sort((a, b) => b.masteredCount - a.masteredCount);

  res.json({ classCode: CLASS_CODE, roster });
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Multiplication Dojo running on port ${PORT}`);
  console.log(`Class code: ${CLASS_CODE}`);
});
