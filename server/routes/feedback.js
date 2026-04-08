/**
 * Feedback routes — submit and view user feedback.
 */
const express = require("express");
const { getAll, runAndSave } = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// ── Submit feedback ───────────────────────────────────────────────
router.post("/", authenticate, (req, res) => {
  const { category, message, rating } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "Message must be under 2000 characters" });
  }

  const validCategories = ["general", "bug", "feature", "usability", "clinical"];
  const cat = validCategories.includes(category) ? category : "general";

  try {
    runAndSave(
      "INSERT INTO feedback (user_id, category, message, rating) VALUES (?, ?, ?, ?)",
      [req.userId, cat, message.trim(), rating || null]
    );
    res.status(201).json({ success: true, message: "Feedback submitted!" });
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

// ── Get user's own feedback history ───────────────────────────────
router.get("/", authenticate, (req, res) => {
  try {
    const entries = getAll(
      "SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC",
      [req.userId]
    );
    res.json({ entries });
  } catch (err) {
    console.error("Feedback fetch error:", err);
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

module.exports = router;
