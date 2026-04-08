/**
 * Auth routes — signup, login, profile.
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getOne, getAll, runAndSave } = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ── Signup ─────────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = getOne("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    runAndSave(
      `INSERT INTO users (id, email, password_hash, full_name, plan) VALUES (?, ?, ?, ?, 'starter')`,
      [id, email.toLowerCase(), passwordHash, fullName || ""]
    );

    const user = getOne("SELECT * FROM users WHERE id = ?", [id]);
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name, plan: user.plan },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Login ──────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = getOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id, email: user.email, fullName: user.full_name,
        plan: user.plan, subscriptionStatus: user.subscription_status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Get current user profile ───────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  const user = getOne("SELECT * FROM users WHERE id = ?", [req.userId]);
  if (!user) return res.status(404).json({ error: "User not found" });

  const pc = getOne("SELECT COUNT(*) as c FROM patients WHERE user_id = ?", [req.userId]);
  const sc = getOne("SELECT COUNT(*) as c FROM session_notes WHERE user_id = ?", [req.userId]);

  res.json({
    user: {
      id: user.id, email: user.email, fullName: user.full_name,
      plan: user.plan, subscriptionStatus: user.subscription_status,
      trialEndsAt: user.trial_ends_at, createdAt: user.created_at,
    },
    usage: {
      patients: pc.c,
      patientLimit: user.plan === "starter" ? 5 : null,
      sessions: sc.c,
    },
  });
});

module.exports = router;
