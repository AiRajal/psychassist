/**
 * Database setup — creates all tables in SQLite.
 * Run with: node db/setup.js
 */
const { initDb, saveDb } = require("./connection");

async function setup() {
  const db = await initDb();

  db.run("PRAGMA foreign_keys = ON");

  const schema = `
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name     TEXT NOT NULL DEFAULT '',
      plan          TEXT NOT NULL DEFAULT 'starter',
      stripe_customer_id  TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT DEFAULT 'active',
      trial_ends_at TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Patients
    CREATE TABLE IF NOT EXISTS patients (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name     TEXT NOT NULL,
      age           INTEGER,
      gender        TEXT,
      status        TEXT NOT NULL DEFAULT 'Active',
      diagnosis     TEXT DEFAULT '',
      phone         TEXT DEFAULT '',
      email         TEXT DEFAULT '',
      notes         TEXT DEFAULT '',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(user_id);

    -- Session Notes
    CREATE TABLE IF NOT EXISTS session_notes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id    INTEGER REFERENCES patients(id) ON DELETE SET NULL,
      title         TEXT NOT NULL,
      date          TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'Therapy',
      notes         TEXT DEFAULT '',
      goals         TEXT DEFAULT '',
      homework      TEXT DEFAULT '',
      next_steps    TEXT DEFAULT '',
      transcript    TEXT DEFAULT '[]',
      duration      INTEGER DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON session_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_patient ON session_notes(patient_id);

    -- Mood Entries
    CREATE TABLE IF NOT EXISTS mood_entries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id    INTEGER REFERENCES patients(id) ON DELETE SET NULL,
      mood          INTEGER NOT NULL CHECK(mood BETWEEN 1 AND 5),
      symptoms      TEXT DEFAULT '[]',
      note          TEXT DEFAULT '',
      date          TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_mood_patient ON mood_entries(patient_id);

    -- Journal Entries
    CREATE TABLE IF NOT EXISTS journal_entries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      content       TEXT NOT NULL,
      mood          TEXT DEFAULT '',
      tags          TEXT DEFAULT '[]',
      date          TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);

    -- Feedback
    CREATE TABLE IF NOT EXISTS feedback (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category        TEXT NOT NULL DEFAULT 'general',
      message         TEXT NOT NULL,
      rating          INTEGER,
      admin_response  TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);

    -- Waitlist
    CREATE TABLE IF NOT EXISTS waitlist (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `;

  // Execute each statement separately (sql.js doesn't support multiple statements in one run)
  const statements = schema.split(";").map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    db.run(stmt + ";");
  }

  saveDb();
  console.log("Database setup complete!");
}

setup().catch(console.error);
