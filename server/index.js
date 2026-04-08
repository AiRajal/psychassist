/**
 * PsychAssist Pro — Backend Server
 *
 * Express + SQLite (sql.js) + JWT Auth + Stripe Billing
 *
 * Setup:
 *   1. cp .env.example .env  (fill in your values)
 *   2. npm install
 *   3. npm run db:setup
 *   4. npm start
 */

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { initDb } = require("./db/connection");

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patients");
const sessionRoutes = require("./routes/sessions");
const moodRoutes = require("./routes/mood");
const journalRoutes = require("./routes/journal");
const { router: billingRoutes, createWebhookHandler } = require("./routes/billing");
const feedbackRoutes = require("./routes/feedback");
const waitlistRoutes = require("./routes/waitlist");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: true,  // allows any origin (file://, localhost, etc.) — restrict in production
  credentials: true,
}));

// Rate limiting
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
}));

app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, please try again later." },
}));

// ── Stripe Webhook (raw body — before json parser) ─────────────────
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), createWebhookHandler());

// ── Body parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));

// ── Routes ─────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/waitlist", waitlistRoutes);

// ── Serve frontend files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..", "public")));

// ── Health check ───────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
});

// ── Catch-all: serve frontend for non-API routes ──────────────────
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  }
});

// ── Error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start (async — must init sql.js first) ─────────────────────────
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║        PsychAssist Pro Server v1.0.0         ║
╠══════════════════════════════════════════════╣
║  Running on: http://localhost:${PORT}            ║
║  Env:        ${(process.env.NODE_ENV || "development").padEnd(30)}║
╚══════════════════════════════════════════════╝
    `);
  });
}

start().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

module.exports = app;
