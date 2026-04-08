/**
 * Session notes CRUD routes.
 */
const express = require("express");
const { getOne, getAll, runAndSave } = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const { patientId, limit = 50, offset = 0 } = req.query;
  let sql = "SELECT * FROM session_notes WHERE user_id = ?";
  const params = [req.userId];
  if (patientId) { sql += " AND patient_id = ?"; params.push(patientId); }
  sql += " ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), Number(offset));

  const sessions = getAll(sql, params).map(s => ({ ...s, transcript: JSON.parse(s.transcript || "[]") }));
  res.json({ sessions });
});

router.get("/:id", (req, res) => {
  const session = getOne("SELECT * FROM session_notes WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (!session) return res.status(404).json({ error: "Session not found" });
  session.transcript = JSON.parse(session.transcript || "[]");
  res.json({ session });
});

router.post("/", (req, res) => {
  const { title, date, type, patientId, notes, goals, homework, nextSteps, transcript, duration } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "Session title is required" });

  const result = runAndSave(
    `INSERT INTO session_notes (user_id, patient_id, title, date, type, notes, goals, homework, next_steps, transcript, duration) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [req.userId, patientId || null, title.trim(), date || new Date().toISOString().split("T")[0],
     type || "Therapy", notes || "", goals || "", homework || "", nextSteps || "",
     JSON.stringify(transcript || []), duration || 0]
  );

  const session = getOne("SELECT * FROM session_notes WHERE id = ?", [result.lastInsertRowid]);
  session.transcript = JSON.parse(session.transcript || "[]");
  res.status(201).json({ session });
});

router.put("/:id", (req, res) => {
  const existing = getOne("SELECT * FROM session_notes WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: "Session not found" });

  const { title, date, type, patientId, notes, goals, homework, nextSteps, transcript, duration } = req.body;
  runAndSave(
    `UPDATE session_notes SET title=?, date=?, type=?, patient_id=?, notes=?, goals=?, homework=?, next_steps=?, transcript=?, duration=?, updated_at=datetime('now') WHERE id=? AND user_id=?`,
    [title ?? existing.title, date ?? existing.date, type ?? existing.type,
     patientId !== undefined ? patientId : existing.patient_id,
     notes ?? existing.notes, goals ?? existing.goals, homework ?? existing.homework,
     nextSteps ?? existing.next_steps, transcript ? JSON.stringify(transcript) : existing.transcript,
     duration ?? existing.duration, req.params.id, req.userId]
  );

  const session = getOne("SELECT * FROM session_notes WHERE id = ?", [req.params.id]);
  session.transcript = JSON.parse(session.transcript || "[]");
  res.json({ session });
});

router.delete("/:id", (req, res) => {
  const result = runAndSave("DELETE FROM session_notes WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (result.changes === 0) return res.status(404).json({ error: "Session not found" });
  res.json({ success: true });
});

module.exports = router;
