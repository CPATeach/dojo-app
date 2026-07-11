// Multiplication Dojo — backend
// Simple Express server with name-based login (no passwords). All data access
// goes through store.js, which uses a free Neon Postgres database when
// DATABASE_URL is set (recommended — see README.md) or a local JSON file
// otherwise (fine for quick testing, but doesn't survive Render free-tier
// spin-downs).

const express = require('express');
const path = require('path');
const store = require('./store');

const app = express();
app.use(express.json());

const CLASS_CODE = (process.env.CLASS_CODE || 'DOJO101').trim().toUpperCase();

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '');
}

// Log in (or sign up on first visit). No password — just a class code + name.
app.post('/api/login', async (req, res) => {
  try {
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

    let student = await store.getStudent(studentId);
    if (!student) student = await store.createStudent(studentId, name.trim(), CLASS_CODE);

    res.json({ studentId: student.id, name: student.displayName });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong logging in. Please try again.' });
  }
});

// Get a student's saved progress
app.get('/api/progress/:studentId', async (req, res) => {
  try {
    const student = await store.getStudent(req.params.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json({ progress: student.progress });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'Could not load progress right now.' });
  }
});

// Save a completed practice round
app.post('/api/progress/:studentId', async (req, res) => {
  try {
    const { table, session } = req.body || {};
    if (!table || !session) return res.status(400).json({ error: 'Missing table or session data.' });

    const student = await store.getStudent(req.params.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const progress = student.progress || {};
    if (!progress[table]) progress[table] = { sessions: [] };
    progress[table].sessions.push(session);
    await store.saveProgress(req.params.studentId, progress);

    res.json({ progress });
  } catch (err) {
    console.error('Save progress error:', err);
    res.status(500).json({ error: 'Could not save that round right now.' });
  }
});

// Lightweight teacher view — see mastery counts for everyone in the class.
// Not secured beyond requiring the class code; good enough for a classroom tool, not sensitive data.
app.get('/api/roster', async (req, res) => {
  try {
    const code = (req.query.classCode || '').trim().toUpperCase();
    if (code !== CLASS_CODE) return res.status(401).json({ error: 'Invalid class code.' });

    const students = await store.listStudentsByClassCode(CLASS_CODE);
    const roster = students
      .map((s) => {
        const tables = Object.values(s.progress || {});
        const masteredCount = tables.filter((t) => t.sessions.some((sess) => sess.accuracy >= 90 && sess.avgTime <= 5)).length;
        const totalSessions = tables.reduce((sum, t) => sum + t.sessions.length, 0);
        return { name: s.displayName, masteredCount, totalSessions };
      })
      .sort((a, b) => b.masteredCount - a.masteredCount);

    res.json({ classCode: CLASS_CODE, roster });
  } catch (err) {
    console.error('Roster error:', err);
    res.status(500).json({ error: 'Could not load the roster right now.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

store
  .ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Multiplication Dojo running on port ${PORT}`);
      console.log(`Class code: ${CLASS_CODE}`);
      console.log(
        store.usingPostgres
          ? 'Connected to Postgres (DATABASE_URL is set) — progress persists permanently, independent of Render restarts or spin-downs.'
          : "No DATABASE_URL set — using local ephemeral file storage. On Render's free tier, progress will be LOST on every spin-down (15 min idle). See README.md to connect a free Neon Postgres database."
      );
    });
  })
  .catch((err) => {
    console.error('Failed to set up the database schema:', err);
    process.exit(1);
  });
