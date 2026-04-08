/**
 * Waitlist signup route — used by the landing page.
 */
const express = require("express");
const { getAll, runAndSave } = require("../db/connection");

const router = express.Router();

router.post("/", (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  try {
    runAndSave("INSERT INTO waitlist (email) VALUES (?)", [email.toLowerCase().trim()]);
    res.status(201).json({ success: true, message: "You're on the list!" });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE")) {
      return res.json({ success: true, message: "You're already on the list!" });
    }
    console.error("Waitlist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", (req, res) => {
  const entries = getAll("SELECT * FROM waitlist ORDER BY created_at DESC");
  res.json({ count: entries.length, entries });
});

module.exports = router;
