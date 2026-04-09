/**
 * Waitlist signup route — used by the landing page.
 * Sends a welcome email with the app link when someone joins.
 */
const express = require("express");
const nodemailer = require("nodemailer");
const { getAll, runAndSave } = require("../db/connection");

const router = express.Router();

// ── Email transporter (Gmail SMTP) ────────────────────────────────
let transporter = null;

function getTransporter() {
  if (!transporter && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

// ── Welcome email template ────────────────────────────────────────
function buildWelcomeEmail(email) {
  const appUrl = process.env.APP_URL || "https://psychassist.onrender.com";

  return {
    from: `"PsychAssist Pro" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Welcome to PsychAssist Pro — Your Early Access Is Ready!",
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #4A7C8A; font-size: 28px; margin: 0;">PsychAssist</h1>
          <p style="color: #8B9DAF; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0;">Pro Edition</p>
        </div>

        <h2 style="color: #2D3748; font-size: 22px; margin-bottom: 8px;">You're in!</h2>
        <p style="color: #4A5568; font-size: 15px; line-height: 1.7;">
          Thanks for joining PsychAssist Pro early access. You now have free access to all features during our beta period, including:
        </p>
        <ul style="color: #4A5568; font-size: 15px; line-height: 2; padding-left: 20px;">
          <li>Voice-powered session recording with live transcription</li>
          <li>Auto-generated clinical session notes</li>
          <li>Mood tracking and CBT tools</li>
          <li>Patient management (up to 5 patients)</li>
          <li>Guided breathing exercises</li>
        </ul>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${appUrl}" style="display: inline-block; background: #4A7C8A; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">Open PsychAssist Pro</a>
        </div>

        <p style="color: #4A5568; font-size: 15px; line-height: 1.7;">
          Create your account at the link above to get started. As an early access user, you'll also get <strong>1 month of Professional free</strong> when we launch paid plans.
        </p>

        <p style="color: #4A5568; font-size: 15px; line-height: 1.7;">
          We'd love your feedback — there's a Feedback page built right into the app. Your input directly shapes what we build next.
        </p>

        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />

        <p style="color: #A0AEC0; font-size: 13px; text-align: center;">
          PsychAssist Pro — Session notes that write themselves.<br/>
          Questions? Just reply to this email.
        </p>
      </div>
    `,
  };
}

// ── Routes ────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  try {
    runAndSave("INSERT INTO waitlist (email) VALUES (?)", [email.toLowerCase().trim()]);

    // Send welcome email (non-blocking — don't fail signup if email fails)
    const mailer = getTransporter();
    if (mailer) {
      mailer.sendMail(buildWelcomeEmail(email.toLowerCase().trim())).catch((err) => {
        console.error("Email send error:", err.message);
      });
    } else {
      console.log("Email not configured — skipping welcome email for:", email);
    }

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
