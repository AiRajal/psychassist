/**
 * Journal entry routes.
 */
const express = require("express");
const { getOne, getAll, runAndSave } = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const entries = getAll(
    "SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?",
    [req.userId, Number(limit), Number(offset)]
  ).map(e => ({ ...e, tags: JSON.parse(e.tags || "[]") }));
  res.json({ entries });
});

router.post("/", (req, res) => {
  const { title, content, mood, tags, date } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Title and content are required" });

  const result = runAndSave(
    `INSERT INTO journal_entries (user_id, title, content, mood, tags, date) VALUES (?,?,?,?,?,?)`,
    [req.userId, title.trim(), content, mood || "", JSON.stringify(tags || []), date || new Date().toISOString().split("T")[0]]
  );

  const entry = getOne("SELECT * FROM journal_entries WHERE id = ?", [result.lastInsertRowid]);
  entry.tags = JSON.parse(entry.tags || "[]");
  res.status(201).json({ entry });
});

router.put("/:id", (req, res) => {
  const existing = getOne("SELECT * FROM journal_entries WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: "Entry not found" });

  const { title, content, mood, tags } = req.body;
  runAndSave(
    `UPDATE journal_entries SET title=?, content=?, mood=?, tags=?, updated_at=datetime('now') WHERE id=? AND user_id=?`,
    [title ?? existing.title, content ?? existing.content, mood ?? existing.mood,
     tags ? JSON.stringify(tags) : existing.tags, req.params.id, req.userId]
  );

  const entry = getOne("SELECT * FROM journal_entries WHERE id = ?", [req.params.id]);
  entry.tags = JSON.parse(entry.tags || "[]");
  res.json({ entry });
});

router.delete("/:id", (req, res) => {
  const result = runAndSave("DELETE FROM journal_entries WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (result.changes === 0) return res.status(404).json({ error: "Entry not found" });
  res.json({ success: true });
});

module.exports = router;
