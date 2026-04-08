/**
 * Patient CRUD routes.
 */
const express = require("express");
const { getOne, getAll, runAndSave } = require("../db/connection");
const { authenticate, checkPatientLimit } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const patients = getAll("SELECT * FROM patients WHERE user_id = ? ORDER BY created_at DESC", [req.userId]);
  res.json({ patients });
});

router.get("/:id", (req, res) => {
  const patient = getOne("SELECT * FROM patients WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  const sc = getOne("SELECT COUNT(*) as c FROM session_notes WHERE patient_id = ? AND user_id = ?", [patient.id, req.userId]);
  const recentMood = getAll("SELECT * FROM mood_entries WHERE patient_id = ? AND user_id = ? ORDER BY date DESC LIMIT 5", [patient.id, req.userId]);

  res.json({ patient, sessionCount: sc.c, recentMood });
});

router.post("/", checkPatientLimit, (req, res) => {
  const { fullName, age, gender, status, diagnosis, phone, email, notes } = req.body;
  if (!fullName || !fullName.trim()) return res.status(400).json({ error: "Patient name is required" });

  const result = runAndSave(
    `INSERT INTO patients (user_id, full_name, age, gender, status, diagnosis, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, fullName.trim(), age || null, gender || null, status || "Active", diagnosis || "", phone || "", email || "", notes || ""]
  );

  const patient = getOne("SELECT * FROM patients WHERE id = ?", [result.lastInsertRowid]);
  res.status(201).json({ patient });
});

router.put("/:id", (req, res) => {
  const existing = getOne("SELECT * FROM patients WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: "Patient not found" });

  const { fullName, age, gender, status, diagnosis, phone, email, notes } = req.body;
  runAndSave(
    `UPDATE patients SET full_name=?, age=?, gender=?, status=?, diagnosis=?, phone=?, email=?, notes=?, updated_at=datetime('now') WHERE id=? AND user_id=?`,
    [fullName || existing.full_name, age ?? existing.age, gender ?? existing.gender, status || existing.status,
     diagnosis ?? existing.diagnosis, phone ?? existing.phone, email ?? existing.email, notes ?? existing.notes,
     req.params.id, req.userId]
  );

  const patient = getOne("SELECT * FROM patients WHERE id = ?", [req.params.id]);
  res.json({ patient });
});

router.delete("/:id", (req, res) => {
  const result = runAndSave("DELETE FROM patients WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (result.changes === 0) return res.status(404).json({ error: "Patient not found" });
  res.json({ success: true });
});

module.exports = router;
