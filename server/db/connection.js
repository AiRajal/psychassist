/**
 * Shared database connection using sql.js (pure JS SQLite).
 * Auto-saves to disk after each write operation.
 */
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "psychassist.db");
let db = null;
let SQL = null;

async function initDb() {
  if (db) return db;
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON");
  return db;
}

function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Helper: run a statement that modifies data and auto-save.
 * Returns { changes, lastInsertRowid }.
 */
function runAndSave(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  const changes = d.getRowsModified();
  const row = d.exec("SELECT last_insert_rowid() as id");
  const lastInsertRowid = row.length > 0 ? row[0].values[0][0] : 0;
  saveDb();
  return { changes, lastInsertRowid };
}

/**
 * Helper: get one row. Returns object or undefined.
 */
function getOne(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    stmt.free();
    const obj = {};
    cols.forEach((c, i) => obj[c] = vals[i]);
    return obj;
  }
  stmt.free();
  return undefined;
}

/**
 * Helper: get all rows. Returns array of objects.
 */
function getAll(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const results = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const obj = {};
    cols.forEach((c, i) => obj[c] = vals[i]);
    results.push(obj);
  }
  stmt.free();
  return results;
}

module.exports = { initDb, getDb, saveDb, runAndSave, getOne, getAll };
