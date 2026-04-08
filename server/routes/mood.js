/**
 * Mood tracking routes.
 */
const express = require("express");
const { getOne, getAll, runAndSave } = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const { patientId, limit = 100, offset = 0 } = req.query;
  let sql = "SELECT * FROM mood_entries WHERE user_id = ?";
  const params = [req.userId];
  if (patientId) { sql += " AND patient_id = ?"; params.push(patientId); }
  sql += " ORDER BY date DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), Number(offset));

  const entries = getAll(sql, params).map(e => ({ ...e, symptoms: JSON.parse(e.symptoms || "[]") }));
  res.json({ entries });
});

router.post("/", (req, res) => {
  const { patientId, mood, symptoms, note, date } = req.body;
  if (!mood || mood < 1 || mood > 5) return res.status(400).json({ error: "Mood must be between 1 and 5" });

  const result = runAndSave(
    `INSERT INTO mood_entries (user_id, patient_id, mood, symptoms, note, date) VALUES (?,?,?,?,?,?)`,
    [req.userId, patientId || null, mood, JSON.stringify(symptoms || []), note || "", date || new Date().toISOString().split("T")[0]]
  );

  const entry = getOne("SELECT * FROM mood_entries WHERE id = ?", [result.lastInsertRowid]);
  entry.symptoms = JSON.parse(entry.symptoms || "[]");
  res.status(201).json({ entry });
});

router.delete("/:id", (req, res) => {
  const result = runAndSave("DELETE FROM mood_entries WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (result.changes === 0) return res.status(404).json({ error: "Entry not found" });
  res.json({ success: true });
});

module.exports = router;
